import React, { useState, useEffect, useCallback } from 'react';
import { commentsApi } from '../../api/commentsApi';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { User, Send, Trash2, Edit2, CornerDownRight } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import './CommentsSection.css';

// Recursive component for a single comment and its replies
const CommentItem = ({
    comment,
    user,
    onEdit,
    onDelete,
    onReply,
    editingId,
    editContent,
    setEditContent,
    saveEdit,
    cancelEdit,
    replyingToId,
    replyContent,
    setReplyContent,
    submitReply,
    cancelReply,
    depth = 0
}) => {
    return (
        <div className={`comment-thread depth-${depth}`}>
            <div className={`comment-item ${comment.status === 'deleted' ? 'deleted' : ''}`}>
                <div className="comment-avatar">
                    <User size={20} />
                </div>
                <div className="comment-content">
                    <div className="comment-header">
                        <span className="username">{comment.username}</span>
                        <span className="date">{formatDateTime(comment.created_at)}</span>
                        {comment.is_edited && <span className="edited-badge">(edited)</span>}
                    </div>

                    {editingId === comment.id ? (
                        <div className="edit-mode">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={2}
                            />
                            <div className="edit-actions">
                                <button onClick={() => saveEdit(comment.id)} className="save-btn">Save</button>
                                <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <p className="comment-text">{comment.content}</p>
                    )}
                </div>

                {comment.status === 'active' && !editingId && user && (
                    <div className="comment-actions">
                        {depth < 3 && user && (
                            <button onClick={() => onReply(comment)} aria-label="Reply" className="action-reply-btn" title="Reply">
                                <CornerDownRight size={14} /> Reply
                            </button>
                        )}
                        {user.id === comment.user_id && (
                            <>
                                <button onClick={() => onEdit(comment)} aria-label="Edit" title="Edit">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => onDelete(comment.id)} aria-label="Delete" title="Delete">
                                    <Trash2 size={14} />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Inline Reply Form */}
            {replyingToId === comment.id && (
                <div className="inline-reply-form">
                    <div className="reply-indicator">
                        <CornerDownRight size={16} /> Replying to @{comment.username}
                    </div>
                    <div className="input-wrapper">
                        <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`Reply to ${comment.username}...`}
                            rows={2}
                            autoFocus
                        />
                        <div className="reply-actions-inline">
                            <button onClick={cancelReply} className="cancel-reply-btn">Cancel</button>
                            <button
                                onClick={() => submitReply(comment.id)}
                                disabled={!replyContent.trim()}
                                className="send-reply-btn"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Render children (replies) recursively */}
            {comment.children && comment.children.length > 0 && (
                <div className="comment-replies">
                    {comment.children.map(child => (
                        <CommentItem
                            key={child.id}
                            comment={child}
                            user={user}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onReply={onReply}
                            editingId={editingId}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            saveEdit={saveEdit}
                            cancelEdit={cancelEdit}
                            replyingToId={replyingToId}
                            replyContent={replyContent}
                            setReplyContent={setReplyContent}
                            submitReply={submitReply}
                            cancelReply={cancelReply}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const CommentsSection = ({ materialId }) => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const confirm = useConfirm();

    const t = {
        en: { deleteConfirm: 'Are you sure you want to delete this comment?' },
        bg: { deleteConfirm: 'Сигурни ли сте, че искате да изтриете този коментар?' }
    }[language] || { deleteConfirm: 'Are you sure you want to delete this comment?' };
    const [comments, setComments] = useState([]);
    const [commentTree, setCommentTree] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Editing state
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');

    // Replying state
    const [replyingToId, setReplyingToId] = useState(null);
    const [replyContent, setReplyContent] = useState('');

    // Build hierarchical tree from flat list
    const buildTree = (flatComments) => {
        const commentMap = {};
        const roots = [];

        // First pass: initialize comment map with children array
        flatComments.forEach(comment => {
            commentMap[comment.id] = { ...comment, children: [] };
        });

        // Second pass: build the tree
        flatComments.forEach(comment => {
            if (comment.parent_id && commentMap[comment.parent_id]) {
                commentMap[comment.parent_id].children.push(commentMap[comment.id]);
            } else {
                roots.push(commentMap[comment.id]);
            }
        });

        return roots;
    };

    const loadComments = useCallback(async () => {
        try {
            const response = await commentsApi.getComments(materialId, { page, limit: 10 });
            if (response.success) {
                setComments(response.data.comments);
                setCommentTree(buildTree(response.data.comments));
                setTotalPages(response.data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    }, [materialId, page]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadComments();
    }, [loadComments]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const response = await commentsApi.createComment(materialId, newComment);
            if (response.success) {
                setNewComment('');
                loadComments();
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
            alert('Failed to post comment');
        }
    };

    const submitReply = async (parentId) => {
        if (!replyContent.trim()) return;

        try {
            const response = await commentsApi.createComment(materialId, replyContent, parentId);
            if (response.success) {
                setReplyContent('');
                setReplyingToId(null);
                loadComments();
            }
        } catch (error) {
            console.error('Failed to post reply:', error);
            alert('Failed to post reply');
        }
    };

    const handleDelete = async (commentId) => {
        const confirmed = await confirm({
            message: t.deleteConfirm,
            isDanger: true
        });
        if (!confirmed) return;

        try {
            await commentsApi.deleteComment(commentId);
            loadComments();
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    };

    const startEdit = (comment) => {
        setEditingId(comment.id);
        setEditContent(comment.content);
        setReplyingToId(null); // Close reply form if open
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    const saveEdit = async (commentId) => {
        try {
            await commentsApi.updateComment(commentId, editContent);
            setEditingId(null);
            loadComments();
        } catch (error) {
            console.error('Failed to update comment:', error);
        }
    };

    const startReply = (comment) => {
        setReplyingToId(comment.id);
        setReplyContent('');
        setEditingId(null); // Close edit form if open
    };

    const cancelReply = () => {
        setReplyingToId(null);
        setReplyContent('');
    };

    return (
        <div className="comments-section">
            <h3>Comments ({comments.length})</h3>

            {user ? (
                <form onSubmit={handleSubmit} className="comment-form main-comment-form">
                    <div className="input-wrapper">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            rows={3}
                        />
                        <button type="submit" disabled={!newComment.trim()} className="send-btn">
                            <Send size={16} />
                        </button>
                    </div>
                </form>
            ) : (
                <div className="login-prompt">
                    Please log in to post comments.
                </div>
            )}

            <div className="comments-list">
                {commentTree.map(comment => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        user={user}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                        onReply={startReply}
                        editingId={editingId}
                        editContent={editContent}
                        setEditContent={setEditContent}
                        saveEdit={saveEdit}
                        cancelEdit={cancelEdit}
                        replyingToId={replyingToId}
                        replyContent={replyContent}
                        setReplyContent={setReplyContent}
                        submitReply={submitReply}
                        cancelReply={cancelReply}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};
