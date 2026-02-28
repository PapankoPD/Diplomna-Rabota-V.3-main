import React, { useState, useEffect } from 'react';
import { commentsApi } from '../../api/commentsApi';
import { useAuth } from '../../hooks/useAuth';
import { User, Send, Trash2, Edit2, X, MoreVertical } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import './CommentsSection.css';

export const CommentsSection = ({ materialId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        loadComments();
    }, [materialId, page]);

    const loadComments = async () => {
        setIsLoading(true);
        try {
            const response = await commentsApi.getComments(materialId, { page, limit: 10 });
            if (response.success) {
                setComments(response.data.comments);
                setTotalPages(response.data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const response = await commentsApi.createComment(materialId, newComment);
            if (response.success) {
                setNewComment('');
                loadComments(); // Reload to show new comment
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
            alert('Failed to post comment');
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

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

    return (
        <div className="comments-section">
            <h3>Comments ({comments.length})</h3>

            {user ? (
                <form onSubmit={handleSubmit} className="comment-form">
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
                {comments.map(comment => (
                    <div key={comment.id} className={`comment-item ${comment.status === 'deleted' ? 'deleted' : ''}`}>
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

                        {user && user.id === comment.user_id && !editingId && comment.status === 'active' && (
                            <div className="comment-actions">
                                <button onClick={() => startEdit(comment)} aria-label="Edit">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(comment.id)} aria-label="Delete">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
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
