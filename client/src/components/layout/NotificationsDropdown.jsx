import React, { useState, useEffect, useRef } from 'react';
import { notificationsApi } from '../../api/notificationsApi';
import { Bell, Check, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import './NotificationsDropdown.css';

export const NotificationsDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Fetch unread count on mount
    useEffect(() => {
        fetchUnreadCount();

        // Listen for clicks outside to close dropdown
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load notifications when opened
    useEffect(() => {
        if (isOpen && notifications.length === 0) {
            loadNotifications(1);
        }
    }, [isOpen, notifications.length]);

    const fetchUnreadCount = async () => {
        try {
            const res = await notificationsApi.getUnreadCount();
            if (res.success) {
                setUnreadCount(res.data.count);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    const loadNotifications = async (pageNum = 1) => {
        setIsLoading(true);
        try {
            const res = await notificationsApi.getNotifications({ page: pageNum, limit: 10 });
            if (res.success) {
                if (pageNum === 1) {
                    setNotifications(res.data.notifications);
                } else {
                    setNotifications(prev => [...prev, ...res.data.notifications]);
                }
                setHasMore(pageNum < res.data.pagination.totalPages);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            const res = await notificationsApi.markAsRead(id);
            if (res.success) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
                );
                fetchUnreadCount();
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const res = await notificationsApi.markAllAsRead();
            if (res.success) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            const res = await notificationsApi.deleteNotification(id);
            if (res.success) {
                setNotifications(prev => prev.filter(n => n.id !== id));
                fetchUnreadCount(); // Recalculate in case an unread was deleted
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            handleMarkAsRead(notification.id, { stopPropagation: () => { } });
        }
        setIsOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <div className="notifications-container" ref={dropdownRef}>
            <button
                className="icon-btn bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notifications-dropdown">
                    <div className="notifications-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
                                <Check size={14} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notifications-list">
                        {notifications.length === 0 && !isLoading ? (
                            <div className="empty-notifications">
                                <Bell size={32} className="empty-icon" />
                                <p>You have no notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`notification-item ${!notif.is_read ? 'unread' : ''} ${notif.link ? 'clickable' : ''}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="notification-status">
                                        {!notif.is_read ? (
                                            <Circle size={10} className="unread-dot" fill="currentColor" />
                                        ) : (
                                            <div style={{ width: 10 }}></div>
                                        )}
                                    </div>
                                    <div className="notification-content">
                                        <p className="notification-message">{notif.message}</p>
                                        <span className="notification-time">{formatDateTime(notif.created_at)}</span>
                                    </div>
                                    <div className="notification-actions">
                                        {!notif.is_read && (
                                            <button
                                                className="action-btn read-btn"
                                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                                title="Mark as read"
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={(e) => handleDelete(notif.id, e)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        {isLoading && (
                            <div className="loading-notifications">Loading...</div>
                        )}

                        {hasMore && !isLoading && notifications.length > 0 && (
                            <button
                                className="load-more-btn"
                                onClick={() => loadNotifications(page + 1)}
                            >
                                Load more
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
