import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Check, X, RefreshCw, Inbox } from 'lucide-react';
import './RoleRequestsPage.css';

const translations = {
    en: {
        pageTitle: 'Role Requests',
        pending: 'Pending',
        reviewed: 'Reviewed',
        approve: 'Approve',
        reject: 'Reject',
        username: 'Username',
        email: 'Email',
        requestedRole: 'Requested Role',
        date: 'Date',
        status: 'Status',
        message: 'Note',
        noRequests: 'No requests yet.',
        noPending: 'No pending requests.',
        noReviewed: 'No reviewed requests.',
        refresh: 'Refresh',
        reviewedBy: 'Reviewed by',
        roles: { teacher: 'Teacher', admin: 'Admin' },
        statuses: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
        errLoad: 'Failed to load requests.',
        errAction: 'Action failed.',
    },
    bg: {
        pageTitle: 'Заявки за роли',
        pending: 'Чакащи',
        reviewed: 'Прегледани',
        approve: 'Одобри',
        reject: 'Откажи',
        username: 'Потребител',
        email: 'Имейл',
        requestedRole: 'Заявена роля',
        date: 'Дата',
        status: 'Статус',
        message: 'Бележка',
        noRequests: 'Все още няма заявки.',
        noPending: 'Няма чакащи заявки.',
        noReviewed: 'Няма прегледани заявки.',
        refresh: 'Опресни',
        reviewedBy: 'Прегледан от',
        roles: { teacher: 'Учител', admin: 'Администратор' },
        statuses: { pending: 'Чакаща', approved: 'Одобрена', rejected: 'Отхвърлена' },
        errLoad: 'Неуспешно зареждане на заявките.',
        errAction: 'Действието е неуспешно.',
    }
};

export const RoleRequestsPage = () => {
    const { language } = useLanguage();
    const t = translations[language];

    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('pending');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => { loadRequests(); }, []);

    const loadRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/admin/role-requests');
            setRequests(res.data.data?.requests || []);
        } catch {
            setError(t.errLoad);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        setActionLoading(id + action);
        try {
            await apiClient.post(`/admin/role-requests/${id}/${action}`);
            await loadRequests();
        } catch {
            setError(t.errAction);
        } finally {
            setActionLoading(null);
        }
    };

    const pending = requests.filter(r => r.status === 'pending');
    const reviewed = requests.filter(r => r.status !== 'pending');
    const shown = tab === 'pending' ? pending : reviewed;

    const formatDate = (d) => new Date(d).toLocaleDateString();
    const roleLabel = (r) => t.roles[r] || r;
    const statusLabel = (s) => t.statuses[s] || s;

    return (
        <div className="rr-page">
            <div className="rr-header">
                <div>
                    <h1>{t.pageTitle}</h1>
                </div>
                <button className="rr-refresh-btn" onClick={loadRequests} title={t.refresh}>
                    <RefreshCw size={16} />
                    {t.refresh}
                </button>
            </div>

            {error && <div className="rr-error">{error}</div>}

            <div className="rr-tabs">
                <button
                    className={`rr-tab ${tab === 'pending' ? 'active' : ''}`}
                    onClick={() => setTab('pending')}
                >
                    {t.pending}
                    {pending.length > 0 && <span className="rr-badge">{pending.length}</span>}
                </button>
                <button
                    className={`rr-tab ${tab === 'reviewed' ? 'active' : ''}`}
                    onClick={() => setTab('reviewed')}
                >
                    {t.reviewed}
                </button>
            </div>

            {isLoading ? (
                <div className="rr-loading"><LoadingSpinner /></div>
            ) : shown.length === 0 ? (
                <div className="rr-empty">
                    <Inbox size={48} strokeWidth={1.2} />
                    <p>{tab === 'pending' ? t.noPending : t.noReviewed}</p>
                </div>
            ) : (
                <div className="rr-table-container">
                    <table className="rr-table">
                        <thead>
                            <tr>
                                <th>{t.username}</th>
                                <th>{t.email}</th>
                                <th>{t.requestedRole}</th>
                                <th>{t.message}</th>
                                <th>{t.date}</th>
                                {tab === 'reviewed' && <th>{t.status}</th>}
                                {tab === 'reviewed' && <th>{t.reviewedBy}</th>}
                                {tab === 'pending' && <th></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map(req => {
                                let note = null;
                                try {
                                    const parsed = JSON.parse(req.message);
                                    note = parsed.note || null;
                                } catch {
                                    note = req.message;
                                }
                                return (
                                    <tr key={req.id}>
                                        <td><strong>{req.username}</strong></td>
                                        <td className="rr-muted">{req.email}</td>
                                        <td>
                                            <span className={`rr-role-badge rr-role-${req.requested_role}`}>
                                                {roleLabel(req.requested_role)}
                                            </span>
                                        </td>
                                        <td className="rr-muted">{note || '—'}</td>
                                        <td className="rr-muted">{formatDate(req.created_at)}</td>
                                        {tab === 'reviewed' && (
                                            <td>
                                                <span className={`rr-status rr-status-${req.status}`}>
                                                    {statusLabel(req.status)}
                                                </span>
                                            </td>
                                        )}
                                        {tab === 'reviewed' && (
                                            <td className="rr-muted">{req.reviewed_by_username || '—'}</td>
                                        )}
                                        {tab === 'pending' && (
                                            <td className="rr-actions">
                                                <button
                                                    className="rr-btn rr-approve"
                                                    onClick={() => handleAction(req.id, 'approve')}
                                                    disabled={!!actionLoading}
                                                    title={t.approve}
                                                >
                                                    <Check size={15} /> {t.approve}
                                                </button>
                                                <button
                                                    className="rr-btn rr-reject"
                                                    onClick={() => handleAction(req.id, 'reject')}
                                                    disabled={!!actionLoading}
                                                    title={t.reject}
                                                >
                                                    <X size={15} /> {t.reject}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
