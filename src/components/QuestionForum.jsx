import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { forumService, canEditComment, editTimeRemaining, EDIT_WINDOW_MS } from '../services/forumService';
import { MessageSquare, Send, Edit2, Trash2, ThumbsUp, X, AlertCircle, Clock, Lock } from 'lucide-react';

function EditTimer({ createdAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => editTimeRemaining(createdAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const r = editTimeRemaining(createdAt);
      setRemaining(r);
      if (!r) { clearInterval(interval); onExpire && onExpire(); }
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, onExpire]);

  if (!remaining) return (
    <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
      <Lock size={11} /> Edit locked
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
      <Clock size={11} /> Edit in {remaining}
    </span>
  );
}

export default function QuestionForum({ question, onClose }) {
  const { currentUser } = useAuth();
  const { isEnglish } = useLanguage();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [, forceUpdate] = useState(0); // for timer re-render

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await forumService.getQuestionComments(question.ID);
      setComments(fetched);
    } catch { /* ignore */ }
    setLoading(false);
  }, [question.ID]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // Refresh edit-timers every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmitComment() {
    if (!newComment.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      await forumService.addComment(question.ID, currentUser.uid, currentUser.displayName || 'Anonymous', newComment.trim());
      setNewComment('');
      await loadComments();
    } catch (error) {
      alert(isEnglish ? `Failed to add comment: ${error.message}` : `新增評論失敗: ${error.message}`);
    }
    setSubmitting(false);
  }

  async function handleEditComment(commentId) {
    if (!editText.trim()) return;
    try {
      await forumService.updateComment(commentId, editText.trim());
      setEditingId(null);
      setEditText('');
      await loadComments();
    } catch (error) {
      if (error.message === 'EDIT_EXPIRED') {
        alert(isEnglish ? 'Edit window has expired (15 minutes). You can no longer edit this comment.' : '編輯時間已過（15分鐘）。您無法再編輯此評論。');
        setEditingId(null);
      } else {
        alert(isEnglish ? 'Failed to update comment' : '更新評論失敗');
      }
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm(isEnglish ? 'Are you sure you want to delete this comment?' : '確定要刪除此評論嗎？')) return;
    try {
      await forumService.deleteComment(commentId);
      await loadComments();
    } catch { alert(isEnglish ? 'Failed to delete comment' : '刪除評論失敗'); }
  }

  async function handleToggleLike(commentId) {
    if (!currentUser) { alert(isEnglish ? 'Please log in to like comments' : '請登入以按讚評論'); return; }
    try {
      await forumService.toggleLike(commentId, currentUser.uid);
      await loadComments();
    } catch { /* ignore */ }
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return isEnglish ? 'Just now' : '剛剛';
    if (diffMins < 60) return `${diffMins} ${isEnglish ? 'min ago' : '分鐘前'}`;
    if (diffHours < 24) return `${diffHours} ${isEnglish ? 'hr ago' : '小時前'}`;
    if (diffDays < 7) return `${diffDays} ${isEnglish ? 'days ago' : '天前'}`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 p-6 rounded-t-2xl z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
                <MessageSquare className="text-lab-blue" size={24} />
                {isEnglish ? 'Discussion' : '討論區'}
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-blue-100 text-lab-blue px-2 py-1 rounded font-bold">{question.Topic}</span>
                {question.DSEcode && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{question.DSEcode}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"><X size={24} /></button>
          </div>
        </div>

        {/* Question */}
        <div className="p-6 bg-slate-50 border-b-2 border-slate-200">
          <div className="prose prose-slate max-w-none text-base text-slate-800 font-medium whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: question.Question }} />
          {question.Pictureurl && (
            <div className="mt-4 flex justify-center">
              <img src={question.Pictureurl} alt="Question Diagram" className="max-w-full h-auto max-h-[200px] object-contain rounded-lg border-2 border-slate-200" />
            </div>
          )}
        </div>

        {/* Comment Input */}
        {currentUser ? (
          <div className="p-6 border-b-2 border-slate-200 bg-white">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-lab-blue flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{currentUser.displayName?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
              <div className="flex-1">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder={isEnglish ? 'Share your thoughts...' : '分享您的想法...'}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-lab-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none" rows="3" />
                <div className="flex justify-end mt-2">
                  <button onClick={handleSubmitComment} disabled={!newComment.trim() || submitting}
                    className="flex items-center gap-2 px-6 py-2 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all">
                    {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={16} />}
                    {isEnglish ? 'Post' : '發表'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 border-b-2 border-slate-200 bg-amber-50">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertCircle size={20} />
              <p className="font-semibold">{isEnglish ? 'Please log in to join the discussion' : '請登入以參與討論'}</p>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lab-blue" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">{isEnglish ? 'No comments yet' : '尚無評論'}</p>
              <p className="text-slate-500 text-sm">{isEnglish ? 'Be the first to share your thoughts!' : '成為第一個分享想法的人！'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700 mb-4">{comments.length} {isEnglish ? 'Comments' : '則評論'}</h3>
              {comments.map(comment => {
                const isOwner = currentUser && comment.userId === currentUser.uid;
                const editable = isOwner && canEditComment(comment.createdAt);
                return (
                  <div key={comment.id} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-lab-blue flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{comment.userDisplayName?.charAt(0).toUpperCase() || 'U'}</span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{comment.userDisplayName || 'Anonymous'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            {formatDate(comment.createdAt)}
                            {comment.edited && <span className="text-slate-400 italic">({isEnglish ? 'edited' : '已編輯'})</span>}
                          </div>
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-2">
                          {/* Edit timer badge */}
                          {editingId !== comment.id && (
                            <EditTimer createdAt={comment.createdAt} onExpire={() => forceUpdate(n => n + 1)} />
                          )}
                          {editable && (
                            <button onClick={() => { setEditingId(comment.id); setEditText(comment.text); }}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-all" title={isEnglish ? 'Edit' : '編輯'}>
                              <Edit2 size={16} className="text-lab-blue" />
                            </button>
                          )}
                          {!editable && editingId !== comment.id && (
                            <button disabled title={isEnglish ? 'Edit window expired' : '編輯時間已過'}
                              className="p-2 opacity-30 cursor-not-allowed rounded-lg">
                              <Lock size={16} className="text-slate-400" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteComment(comment.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-all" title={isEnglish ? 'Delete' : '刪除'}>
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === comment.id ? (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2 text-xs text-amber-600 font-semibold">
                          <Clock size={12} />
                          {isEnglish ? 'Edit window: ' : '編輯時限：'}
                          <EditTimer createdAt={comment.createdAt} onExpire={() => { setEditingId(null); forceUpdate(n => n + 1); }} />
                        </div>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-lab-blue outline-none resize-none" rows="3" />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleEditComment(comment.id)}
                            className="px-4 py-2 bg-lab-blue text-white rounded-lg font-bold hover:bg-blue-700 transition-all text-sm">
                            {isEnglish ? 'Save' : '儲存'}
                          </button>
                          <button onClick={() => { setEditingId(null); setEditText(''); }}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-all text-sm">
                            {isEnglish ? 'Cancel' : '取消'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap">{comment.text}</p>
                        <div className="mt-3 pt-3 border-t border-slate-300">
                          <button onClick={() => handleToggleLike(comment.id)} disabled={!currentUser}
                            className={`flex items-center gap-2 px-3 py-1 rounded-lg font-semibold text-sm transition-all ${comment.likedBy?.includes(currentUser?.uid) ? 'bg-blue-100 text-lab-blue' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} ${!currentUser ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <ThumbsUp size={14} fill={comment.likedBy?.includes(currentUser?.uid) ? 'currentColor' : 'none'} />
                            {comment.likes || 0}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}