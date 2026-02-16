const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const algoliasearch = require('algoliasearch');

admin.initializeApp();

// Define secrets (use new Firebase Functions params API)
const algoliaAppId = defineSecret('ALGOLIA_APP_ID');
const algoliaAdminKey = defineSecret('ALGOLIA_ADMIN_KEY');
const ALGOLIA_INDEX_NAME = 'forum_posts';

// Initialize Algolia client lazily at runtime
function getAlgoliaClient() {
  const appId = algoliaAppId.value();
  const adminKey = algoliaAdminKey.value();
  if (!appId || !adminKey) return null;
  return algoliasearch(appId, adminKey);
}

exports.aggregateCommentQuestionStatsOnCommentCreate = onDocumentCreated(
  {
    document: 'comments/{commentId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const comment = snap.data() || {};
    const questionId = comment.questionId != null ? String(comment.questionId) : '';
    if (!questionId) return;

    const createdAt = typeof comment.createdAt === 'string'
      ? comment.createdAt
      : new Date().toISOString();

    const db = admin.firestore();
    const statsRef = db.collection('comment_question_stats').doc(questionId);

    await db.runTransaction(async (tx) => {
      const statsSnap = await tx.get(statsRef);
      const prev = statsSnap.exists ? (statsSnap.data() || {}) : {};

      const prevLast = typeof prev.lastActivity === 'string' ? prev.lastActivity : '';
      const nextLastActivity = prevLast && prevLast > createdAt ? prevLast : createdAt;

      tx.set(statsRef, {
        questionId,
        commentCount: admin.firestore.FieldValue.increment(1),
        lastActivity: nextLastActivity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  }
);

 function toHongKongDate(dateObj) {
   // Convert an instant-in-time to a Date whose UTC fields represent Asia/Hong_Kong local time.
   // This avoids discrepancies between browser local time (HK) and Cloud Functions runtime (UTC).
   const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
   return new Date(d.getTime() + 8 * 60 * 60 * 1000);
 }

function getWeeklyKeyForDate(dateObj) {
  // Use UTC getters so output is independent of the runtime's local timezone.
  const date = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const yyyy = date.getUTCFullYear();
  return `leaderboard_weekly_${yyyy}-W${String(weekNo).padStart(2, '0')}`;
}

function weeklyTokensForRank(rank) {
  const r = Number(rank || 0);
  if (!Number.isFinite(r) || r <= 0) return 0;
  // Keep consistent with frontend logic: max(0, 11 - rank)
  return Math.max(0, 11 - r);
}

exports.aggregateWeeklyLeaderboardOnAttemptCreate = onDocumentCreated(
  {
    document: 'attempts/{attemptId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const attemptData = snap.data() || {};
    const userId = attemptData.userId;
    if (!userId) return;

    const attemptTs = attemptData.timestamp ? new Date(attemptData.timestamp) : new Date();
    const weekId = getWeeklyKeyForDate(toHongKongDate(attemptTs));

    const db = admin.firestore();
    const entryRef = db.collection('weekly_leaderboards').doc(weekId).collection('entries').doc(userId);
    const userRef = db.collection('users').doc(userId);

    await db.runTransaction(async (tx) => {
      const [entrySnap, userSnap] = await Promise.all([
        tx.get(entryRef),
        tx.get(userRef),
      ]);

      const userData = userSnap.exists ? userSnap.data() : {};
      const prev = entrySnap.exists ? entrySnap.data() : {};

      const prevAttemptCount = Number(prev.attemptCount || 0);
      const prevTotalScore = Number(prev.totalScore || 0);
      const prevTotalQuestions = Number(prev.totalQuestions || 0);
      const prevTotalCorrect = Number(prev.totalCorrect || 0);

      const nextAttemptCount = prevAttemptCount + 1;
      const nextTotalScore = prevTotalScore + Number(attemptData.percentage || 0);
      const nextTotalQuestions = prevTotalQuestions + Number(attemptData.totalQuestions || 0);
      const nextTotalCorrect = prevTotalCorrect + Number(attemptData.correctAnswers || 0);
      const nextAverageScore = nextAttemptCount > 0 ? Math.round(nextTotalScore / nextAttemptCount) : 0;

      tx.set(entryRef, {
        userId,
        weekId,
        displayName: userData?.displayName || 'Unknown',
        level: userData?.level || null,
        equippedProfilePic: (userData?.equipped || {}).profilePic || 'flask_blue',
        equippedTheme: (userData?.equipped || {}).theme || 'default',
        streak: Number(userData?.streak || 0),
        attemptCount: nextAttemptCount,
        totalScore: nextTotalScore,
        averageScore: nextAverageScore,
        totalQuestions: nextTotalQuestions,
        totalCorrect: nextTotalCorrect,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  }
);

exports.weeklyLeaderboardPayout = onSchedule(
  {
    schedule: '0 0 * * 1',
    timeZone: 'Asia/Hong_Kong',
    region: 'asia-east1',
  },
  async () => {
    const db = admin.firestore();

    // Run payout for LAST week (so the leaderboard is complete)
    const now = toHongKongDate(new Date());
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const weekId = getWeeklyKeyForDate(toHongKongDate(lastWeekDate));

    const entriesRef = db.collection('weekly_leaderboards').doc(weekId).collection('entries');
    const topSnap = await entriesRef.orderBy('averageScore', 'desc').limit(10).get();

    if (topSnap.empty) return;

    // Batch-like loop (transactions per user to keep idempotency + correct balances)
    const payoutPromises = topSnap.docs.map(async (docSnap, idx) => {
      const entry = docSnap.data() || {};
      const userId = entry.userId || docSnap.id;
      const rank = idx + 1;
      const tokens = weeklyTokensForRank(rank);
      if (!userId || tokens <= 0) return;

      const payoutRef = db
        .collection('weekly_leaderboards')
        .doc(weekId)
        .collection('payouts')
        .doc(userId);

      const userRef = db.collection('users').doc(userId);

      await db.runTransaction(async (tx) => {
        const [payoutSnap, userSnap] = await Promise.all([
          tx.get(payoutRef),
          tx.get(userRef),
        ]);

        if (payoutSnap.exists) {
          return; // already paid
        }

        if (!userSnap.exists) {
          // still record payout marker to avoid repeated attempts
          tx.set(payoutRef, {
            userId,
            weekId,
            rank,
            tokens,
            skipped: true,
            reason: 'User doc missing',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return;
        }

        const userData = userSnap.data() || {};
        const currentTokens = Number(userData.tokens || 0);
        const newTokens = currentTokens + tokens;

        tx.update(userRef, {
          tokens: newTokens,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const historyRef = userRef.collection('tokenHistory').doc();
        tx.set(historyRef, {
          amount: tokens,
          reason: `Leaderboard Reward: weekly #${rank}`,
          type: 'gain',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          balanceAfter: newTokens,
          metadata: {
            category: 'leaderboard',
            period: 'weekly',
            rank,
            weekId,
          },
        });

        const notifRef = db.collection('notifications').doc();
        tx.set(notifRef, {
          recipientId: userId,
          senderId: 'system',
          type: 'leaderboard_reward',
          senderDisplayName: 'System',
          previewText: `Weekly leaderboard #${rank}: +${tokens} tokens`,
          read: false,
          createdAt: new Date().toISOString(),
          weekId,
          rank,
          tokens,
        });

        tx.set(payoutRef, {
          userId,
          weekId,
          rank,
          tokens,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    });

    await Promise.all(payoutPromises);
  }
);

// === Algolia search sync for forum_posts ===

// Helper: prepare Algolia record from Firestore doc
function toAlgoliaRecord(postId, data) {
  return {
    objectID: postId,
    title: data.title || '',
    content: data.content || '',
    category: data.category || '',
    userDisplayName: data.userDisplayName || '',
    userId: data.userId || '',
    createdAt: data.createdAt || '',
    // You can add more fields if you want them searchable/filterable
  };
}

// Create: when a new forum post is created
exports.syncForumPostToAlgoliaOnCreate = onDocumentCreated(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() || {};
    const postId = event.params.postId;
    const record = toAlgoliaRecord(postId, data);
    await algoliaIndex.saveObject(record);
  }
);

// Update: when a forum post is updated
exports.syncForumPostToAlgoliaOnUpdate = onDocumentUpdated(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const snap = event.data;
    if (!snap) return;
    const data = snap.after.data() || {};
    const postId = event.params.postId;
    const record = toAlgoliaRecord(postId, data);
    await algoliaIndex.saveObject(record);
  }
);

// Delete: when a forum post is deleted
exports.syncForumPostToAlgoliaOnDelete = onDocumentDeleted(
  {
    document: 'forum_posts/{postId}',
    region: 'asia-east1',
    secrets: [algoliaAppId, algoliaAdminKey],
  },
  async (event) => {
    const algoliaClient = getAlgoliaClient();
    if (!algoliaClient) return;
    const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    const postId = event.params.postId;
    await algoliaIndex.deleteObject(postId);
  }
);
