// ============================================================================
// FORUM SERVICE - Complete with fixes for likes, nested comments, notifications
// ============================================================================

import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, arrayUnion, arrayRemove, increment, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function canEditComment(createdAt) {
  if (!createdAt) return false;
  const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  return Date.now() - createdDate.getTime() < EDIT_WINDOW_MS;
}

export function editTimeRemaining(createdAt) {
  if (!createdAt) return null;
  const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const elapsed = Date.now() - createdDate.getTime();
  const remaining = EDIT_WINDOW_MS - elapsed;
  
  if (remaining <= 0) return null;
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// MCQ QUESTION COMMENTS
// ============================================================================

/**
 * Add a comment to a question
 */
export async function addComment(questionId, userId, userDisplayName, text, userProfilePic = 'flask_blue') {
  try {
    const commentRef = await addDoc(collection(db, 'question_comments'), {
      questionId,
      userId,
      userDisplayName,
      userProfilePic, // NEW: Store user's profile pic
      text,
      likes: 0,
      likedBy: [],
      replyCount: 0, // NEW: Track number of replies
      createdAt: Timestamp.now(),
      edited: false
    });
    
    return { success: true, commentId: commentRef.id };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Get all comments for a question
 */
export async function getQuestionComments(questionId) {
  try {
    const q = query(
      collection(db, 'question_comments'),
      where('questionId', '==', questionId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

/**
 * Update a comment (with edit window check)
 */
export async function updateComment(commentId, newText) {
  try {
    const commentRef = doc(db, 'question_comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }
    
    const comment = commentSnap.data();
    
    if (!canEditComment(comment.createdAt)) {
      throw new Error('EDIT_EXPIRED');
    }
    
    await updateDoc(commentRef, {
      text: newText,
      edited: true,
      lastEditedAt: Timestamp.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId) {
  try {
    // Delete all replies to this comment first
    const repliesQuery = query(
      collection(db, 'comment_replies'),
      where('parentCommentId', '==', commentId)
    );
    const repliesSnapshot = await getDocs(repliesQuery);
    const deletePromises = repliesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Delete the comment itself
    await deleteDoc(doc(db, 'question_comments', commentId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Toggle like on a comment (FIXED)
 */
export async function toggleLike(commentId, userId) {
  try {
    const commentRef = doc(db, 'question_comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }
    
    const comment = commentSnap.data();
    const likedBy = comment.likedBy || [];
    const isLiked = likedBy.includes(userId);
    
    if (isLiked) {
      // Unlike
      await updateDoc(commentRef, {
        likedBy: arrayRemove(userId),
        likes: increment(-1)
      });
    } else {
      // Like and create notification
      await updateDoc(commentRef, {
        likedBy: arrayUnion(userId),
        likes: increment(1)
      });
      
      // Create notification for comment owner (if not liking own comment)
      if (comment.userId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: comment.userId,
          type: 'comment_like',
          commentId: commentId,
          fromUserId: userId,
          questionId: comment.questionId,
          previewText: comment.text.substring(0, 100),
          read: false,
          createdAt: Timestamp.now()
        });
      }
    }
    
    return { success: true, isLiked: !isLiked };
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

// ============================================================================
// NESTED COMMENTS (Replies to Comments)
// ============================================================================

/**
 * Add a reply to a comment
 */
export async function addReplyToComment(parentCommentId, userId, userDisplayName, text, userProfilePic = 'flask_blue') {
  try {
    // Add the reply
    const replyRef = await addDoc(collection(db, 'comment_replies'), {
      parentCommentId,
      userId,
      userDisplayName,
      userProfilePic,
      text,
      likes: 0,
      likedBy: [],
      createdAt: Timestamp.now(),
      edited: false
    });
    
    // Update parent comment's reply count
    const parentRef = doc(db, 'question_comments', parentCommentId);
    await updateDoc(parentRef, {
      replyCount: increment(1)
    });
    
    // Get parent comment for notification
    const parentSnap = await getDoc(parentRef);
    if (parentSnap.exists()) {
      const parentComment = parentSnap.data();
      
      // Create notification for parent comment owner
      if (parentComment.userId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: parentComment.userId,
          type: 'comment_reply',
          commentId: parentCommentId,
          replyId: replyRef.id,
          fromUserId: userId,
          fromUserDisplayName: userDisplayName,
          questionId: parentComment.questionId,
          previewText: text.substring(0, 100),
          read: false,
          createdAt: Timestamp.now()
        });
      }
    }
    
    return { success: true, replyId: replyRef.id };
  } catch (error) {
    console.error('Error adding reply:', error);
    throw error;
  }
}

/**
 * Get all replies for a comment
 */
export async function getCommentReplies(parentCommentId) {
  try {
    const q = query(
      collection(db, 'comment_replies'),
      where('parentCommentId', '==', parentCommentId),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching replies:', error);
    return [];
  }
}

/**
 * Update a reply
 */
export async function updateReply(replyId, newText) {
  try {
    const replyRef = doc(db, 'comment_replies', replyId);
    const replySnap = await getDoc(replyRef);
    
    if (!replySnap.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replySnap.data();
    
    if (!canEditComment(reply.createdAt)) {
      throw new Error('EDIT_EXPIRED');
    }
    
    await updateDoc(replyRef, {
      text: newText,
      edited: true,
      lastEditedAt: Timestamp.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating reply:', error);
    throw error;
  }
}

/**
 * Delete a reply
 */
export async function deleteReply(replyId) {
  try {
    const replyRef = doc(db, 'comment_replies', replyId);
    const replySnap = await getDoc(replyRef);
    
    if (!replySnap.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replySnap.data();
    
    // Decrement parent comment's reply count
    await updateDoc(doc(db, 'question_comments', reply.parentCommentId), {
      replyCount: increment(-1)
    });
    
    // Delete the reply
    await deleteDoc(replyRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting reply:', error);
    throw error;
  }
}

/**
 * Toggle like on a reply
 */
export async function toggleReplyLike(replyId, userId) {
  try {
    const replyRef = doc(db, 'comment_replies', replyId);
    const replySnap = await getDoc(replyRef);
    
    if (!replySnap.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replySnap.data();
    const likedBy = reply.likedBy || [];
    const isLiked = likedBy.includes(userId);
    
    if (isLiked) {
      // Unlike
      await updateDoc(replyRef, {
        likedBy: arrayRemove(userId),
        likes: increment(-1)
      });
    } else {
      // Like and create notification
      await updateDoc(replyRef, {
        likedBy: arrayUnion(userId),
        likes: increment(1)
      });
      
      // Create notification for reply owner
      if (reply.userId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: reply.userId,
          type: 'reply_like',
          replyId: replyId,
          commentId: reply.parentCommentId,
          fromUserId: userId,
          previewText: reply.text.substring(0, 100),
          read: false,
          createdAt: Timestamp.now()
        });
      }
    }
    
    return { success: true, isLiked: !isLiked };
  } catch (error) {
    console.error('Error toggling reply like:', error);
    throw error;
  }
}

// ============================================================================
// GENERAL FORUM POSTS
// ============================================================================

/**
 * Create a general forum post
 */
export async function createPost(userId, userDisplayName, postData, userProfilePic = 'flask_blue') {
  try {
    const postRef = await addDoc(collection(db, 'forum_posts'), {
      userId,
      userDisplayName,
      userProfilePic, // NEW: Store user's profile pic
      title: postData.title,
      content: postData.content,
      category: postData.category || 'general',
      likes: 0,
      likedBy: [],
      replyCount: 0,
      views: 0,
      createdAt: Timestamp.now(),
      edited: false
    });
    
    return { success: true, postId: postRef.id };
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * Get general forum posts
 */
export async function getPosts(options = {}) {
  try {
    const { category, limit: limitCount = 50 } = options;
    
    let q = query(
      collection(db, 'forum_posts'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    if (category && category !== 'all') {
      q = query(
        collection(db, 'forum_posts'),
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

/**
 * Get a single post
 */
export async function getPost(postId) {
  try {
    const postRef = doc(db, 'forum_posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    return {
      id: postSnap.id,
      ...postSnap.data()
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
}

/**
 * Update a post
 */
export async function updatePost(postId, userId, newContent, newTitle) {
  try {
    const postRef = doc(db, 'forum_posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postSnap.data();
    
    if (post.userId !== userId) {
      throw new Error('Unauthorized');
    }
    
    if (!canEditComment(post.createdAt)) {
      throw new Error('EDIT_EXPIRED');
    }
    
    const updates = {
      content: newContent,
      edited: true,
      lastEditedAt: Timestamp.now()
    };
    
    if (newTitle) {
      updates.title = newTitle;
    }
    
    await updateDoc(postRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
}

/**
 * Delete a post
 */
export async function deletePost(postId) {
  try {
    // Delete all replies to this post
    const repliesQuery = query(
      collection(db, 'post_replies'),
      where('postId', '==', postId)
    );
    const repliesSnapshot = await getDocs(repliesQuery);
    const deletePromises = repliesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Delete the post
    await deleteDoc(doc(db, 'forum_posts', postId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * Toggle like on a post
 */
export async function togglePostLike(postId, userId) {
  try {
    const postRef = doc(db, 'forum_posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postSnap.data();
    const likedBy = post.likedBy || [];
    const isLiked = likedBy.includes(userId);
    
    if (isLiked) {
      await updateDoc(postRef, {
        likedBy: arrayRemove(userId),
        likes: increment(-1)
      });
    } else {
      await updateDoc(postRef, {
        likedBy: arrayUnion(userId),
        likes: increment(1)
      });
      
      // Create notification for post owner
      if (post.userId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.userId,
          type: 'post_like',
          postId: postId,
          fromUserId: userId,
          postTitle: post.title,
          read: false,
          createdAt: Timestamp.now()
        });
      }
    }
    
    return { success: true, isLiked: !isLiked };
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw error;
  }
}

/**
 * Add a reply to a post
 */
export async function addReply(postId, userId, userDisplayName, text, userProfilePic = 'flask_blue') {
  try {
    const replyRef = await addDoc(collection(db, 'post_replies'), {
      postId,
      userId,
      userDisplayName,
      userProfilePic,
      text,
      likes: 0,
      likedBy: [],
      createdAt: Timestamp.now(),
      edited: false
    });
    
    // Update post's reply count
    await updateDoc(doc(db, 'forum_posts', postId), {
      replyCount: increment(1)
    });
    
    // Get post for notification
    const postSnap = await getDoc(doc(db, 'forum_posts', postId));
    if (postSnap.exists()) {
      const post = postSnap.data();
      
      // Notify post owner
      if (post.userId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.userId,
          type: 'reply',
          postId: postId,
          replyId: replyRef.id,
          fromUserId: userId,
          fromUserDisplayName: userDisplayName,
          postTitle: post.title,
          previewText: text.substring(0, 100),
          read: false,
          createdAt: Timestamp.now()
        });
      }
    }
    
    return { success: true, replyId: replyRef.id };
  } catch (error) {
    console.error('Error adding reply:', error);
    throw error;
  }
}

/**
 * Get replies for a post
 */
export async function getReplies(postId) {
  try {
    const q = query(
      collection(db, 'post_replies'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching replies:', error);
    return [];
  }
}

/**
 * Update a reply
 */
export async function updateReply(replyId, newText) {
  try {
    const replyRef = doc(db, 'post_replies', replyId);
    const replySnap = await getDoc(replyRef);
    
    if (!replySnap.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replySnap.data();
    
    if (!canEditComment(reply.createdAt)) {
      throw new Error('EDIT_EXPIRED');
    }
    
    await updateDoc(replyRef, {
      text: newText,
      edited: true,
      lastEditedAt: Timestamp.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating reply:', error);
    throw error;
  }
}

/**
 * Delete a reply
 */
export async function deleteReply(replyId) {
  try {
    const replyRef = doc(db, 'post_replies', replyId);
    const replySnap = await getDoc(replyRef);
    
    if (!replySnap.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replySnap.data();
    
    // Decrement post's reply count
    await updateDoc(doc(db, 'forum_posts', reply.postId), {
      replyCount: increment(-1)
    });
    
    await deleteDoc(replyRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting reply:', error);
    throw error;
  }
}

/**
 * Toggle like on a reply
 */
export async function toggleReplyLike(replyId, userId) {
  try {
    const replyRef = doc(db, 'post_replies', replyId);
    const replySnap = await getDoc(replyRef);
    
    if (!replySnap.exists()) {
      throw new Error('Reply not found');
    }
    
    const reply = replySnap.data();
    const likedBy = reply.likedBy || [];
    const isLiked = likedBy.includes(userId);
    
    if (isLiked) {
      await updateDoc(replyRef, {
        likedBy: arrayRemove(userId),
        likes: increment(-1)
      });
    } else {
      await updateDoc(replyRef, {
        likedBy: arrayUnion(userId),
        likes: increment(1)
      });
      
      // Notify reply owner
      if (reply.userId !== userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: reply.userId,
          type: 'reply_like',
          replyId: replyId,
          postId: reply.postId,
          fromUserId: userId,
          previewText: reply.text.substring(0, 100),
          read: false,
          createdAt: Timestamp.now()
        });
      }
    }
    
    return { success: true, isLiked: !isLiked };
  } catch (error) {
    console.error('Error toggling reply like:', error);
    throw error;
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Subscribe to user notifications (real-time)
 */
export function subscribeToNotifications(userId, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(notifications);
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(doc =>
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get questions with comments (for MCQ forum list)
 */
export async function getQuestionsWithComments() {
  try {
    const snapshot = await getDocs(collection(db, 'question_comments'));
    
    const questionMap = new Map();
    
    snapshot.docs.forEach(doc => {
      const comment = doc.data();
      const qId = comment.questionId;
      
      if (!questionMap.has(qId)) {
        questionMap.set(qId, {
          questionId: qId,
          commentCount: 0,
          lastActivity: comment.createdAt
        });
      }
      
      const qData = questionMap.get(qId);
      qData.commentCount++;
      
      if (comment.createdAt > qData.lastActivity) {
        qData.lastActivity = comment.createdAt;
      }
    });
    
    return Array.from(questionMap.values());
  } catch (error) {
    console.error('Error getting questions with comments:', error);
    return [];
  }
}

export default {
  // MCQ Comments
  addComment,
  getQuestionComments,
  updateComment,
  deleteComment,
  toggleLike,
  addReplyToComment,
  getCommentReplies,
  updateReply,
  deleteReply,
  toggleReplyLike,
  
  // General Posts
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  togglePostLike,
  addReply,
  getReplies,
  
  // Notifications
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  
  // Utility
  getQuestionsWithComments,
  canEditComment,
  editTimeRemaining
};