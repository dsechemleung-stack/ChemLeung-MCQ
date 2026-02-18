const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const algoliasearch = require('algoliasearch');

admin.initializeApp();

function encodeKey(value) {
  const s = value == null ? '' : String(value);
  return encodeURIComponent(s);
}

function safeString(value) {
  return value == null ? '' : String(value);
}

async function applySrsSummaryDelta(db, userId, dateStr, delta, topic, subtopic) {
  const uid = safeString(userId);
  const dateKey = safeString(dateStr);
  if (!uid || !dateKey || !Number.isFinite(delta) || delta === 0) return;

  const topicKey = encodeKey(topic || '');
  const subtopicKey = encodeKey(subtopic || '');
  const hasTopic = Boolean(topicKey);
  const hasSubtopic = Boolean(topicKey) && Boolean(subtopicKey);
  const compoundSubKey = hasSubtopic ? `${topicKey}::${subtopicKey}` : '';

  const summaryRef = db.collection('users').doc(uid).collection('srs_daily_summaries').doc(dateKey);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(summaryRef);
    const prev = snap.exists ? (snap.data() || {}) : {};

    const next = { ...prev };
    next.date = dateKey;
    next.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const prevTotal = Number(prev.dueTotal || 0);
    next.dueTotal = Math.max(0, prevTotal + delta);

    const prevTopics = prev.topicCounts && typeof prev.topicCounts === 'object' ? prev.topicCounts : {};
    const prevSubs = prev.subtopicCounts && typeof prev.subtopicCounts === 'object' ? prev.subtopicCounts : {};

    const nextTopics = { ...prevTopics };
    const nextSubs = { ...prevSubs };

    if (hasTopic) {
      const old = Number(nextTopics[topicKey] || 0);
      const v = Math.max(0, old + delta);
      if (v === 0) delete nextTopics[topicKey];
      else nextTopics[topicKey] = v;
    }

    if (hasSubtopic) {
      const old = Number(nextSubs[compoundSubKey] || 0);
      const v = Math.max(0, old + delta);
      if (v === 0) delete nextSubs[compoundSubKey];
      else nextSubs[compoundSubKey] = v;
    }

    next.topicCounts = nextTopics;
    next.subtopicCounts = nextSubs;

    tx.set(summaryRef, next, { merge: true });
  });
}

function isActiveCard(card) {
  if (!card || typeof card !== 'object') return false;
  if (card.isActive === false) return false;
  if (!card.userId) return false;
  if (!card.nextReviewDate) return false;
  return true;
}

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

exports.rebuildSrsDailySummaries = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in to rebuild summaries');
    }

    const db = admin.firestore();

    // Page through all active cards for this user
    const cardsRef = db.collection('spaced_repetition_cards');
    const pageSize = 500;
    let last = null;
    let totalCards = 0;

    // dateStr => { dueTotal, topicCounts, subtopicCounts }
    const aggregated = new Map();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = cardsRef
        .where('userId', '==', uid)
        .where('isActive', '==', true)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(pageSize);

      if (last) {
        q = q.startAfter(last);
      }

      const snap = await q.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        const card = docSnap.data() || {};
        if (!card.nextReviewDate) continue;

        const dateKey = safeString(card.nextReviewDate);
        const topicEnc = encodeKey(card.topic || '');
        const subEnc = encodeKey(card.subtopic || '');
        const compound = (topicEnc && subEnc) ? `${topicEnc}::${subEnc}` : '';

        if (!aggregated.has(dateKey)) {
          aggregated.set(dateKey, {
            date: dateKey,
            dueTotal: 0,
            topicCounts: {},
            subtopicCounts: {},
          });
        }

        const entry = aggregated.get(dateKey);
        entry.dueTotal += 1;

        if (topicEnc) {
          entry.topicCounts[topicEnc] = (entry.topicCounts[topicEnc] || 0) + 1;
        }
        if (compound) {
          entry.subtopicCounts[compound] = (entry.subtopicCounts[compound] || 0) + 1;
        }
      }

      totalCards += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    // Write summaries for encountered dates (overwrite those docs).
    const summariesRef = db.collection('users').doc(uid).collection('srs_daily_summaries');
    const dateKeys = Array.from(aggregated.keys()).sort((a, b) => String(a).localeCompare(String(b)));

    let written = 0;
    for (let i = 0; i < dateKeys.length; i += 400) {
      const batch = db.batch();
      const slice = dateKeys.slice(i, i + 400);

      for (const dateKey of slice) {
        const data = aggregated.get(dateKey);
        const ref = summariesRef.doc(dateKey);
        batch.set(ref, {
          date: data.date,
          dueTotal: data.dueTotal,
          topicCounts: data.topicCounts,
          subtopicCounts: data.subtopicCounts,
          rebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await batch.commit();
      written += slice.length;
    }

    return {
      ok: true,
      userId: uid,
      cardsProcessed: totalCards,
      datesWritten: written,
    };
  }
);

// Maintain SRS daily summaries (cheap calendar counts)
exports.updateSrsDailySummaryOnCardCreate = onDocumentCreated(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const card = snap.data() || {};
    if (!isActiveCard(card)) return;

    const db = admin.firestore();
    await applySrsSummaryDelta(db, card.userId, card.nextReviewDate, 1, card.topic, card.subtopic);
  }
);

exports.updateSrsDailySummaryOnCardUpdate = onDocumentUpdated(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const before = event.data?.before?.data?.() || {};
    const after = event.data?.after?.data?.() || {};

    const beforeActive = isActiveCard(before);
    const afterActive = isActiveCard(after);

    const db = admin.firestore();

    // Removed from active set
    if (beforeActive && !afterActive) {
      await applySrsSummaryDelta(db, before.userId, before.nextReviewDate, -1, before.topic, before.subtopic);
      return;
    }

    // Added to active set
    if (!beforeActive && afterActive) {
      await applySrsSummaryDelta(db, after.userId, after.nextReviewDate, 1, after.topic, after.subtopic);
      return;
    }

    if (!beforeActive && !afterActive) return;

    const uid = after.userId || before.userId;
    const beforeDate = safeString(before.nextReviewDate);
    const afterDate = safeString(after.nextReviewDate);
    const beforeTopic = safeString(before.topic);
    const afterTopic = safeString(after.topic);
    const beforeSub = safeString(before.subtopic);
    const afterSub = safeString(after.subtopic);

    const dateChanged = beforeDate !== afterDate;
    const topicChanged = beforeTopic !== afterTopic;
    const subChanged = beforeSub !== afterSub;

    if (!dateChanged && !topicChanged && !subChanged) return;

    // Remove old
    await applySrsSummaryDelta(db, uid, beforeDate, -1, beforeTopic, beforeSub);
    // Add new
    await applySrsSummaryDelta(db, uid, afterDate, 1, afterTopic, afterSub);
  }
);

exports.updateSrsDailySummaryOnCardDelete = onDocumentDeleted(
  {
    document: 'spaced_repetition_cards/{cardId}',
    region: 'asia-east1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const card = snap.data() || {};
    if (!isActiveCard(card)) return;

    const db = admin.firestore();
    await applySrsSummaryDelta(db, card.userId, card.nextReviewDate, -1, card.topic, card.subtopic);
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
