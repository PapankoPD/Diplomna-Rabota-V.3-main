import React, { useState, useEffect } from 'react';
import { groupsApi } from '../api/groupsApi';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Users, Plus, Globe, Lock, UserPlus, LogOut, X, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';
import './GroupsPage.css';

const translations = {
    en: {
        pageTitle: "Groups",
        newGroupBtn: "New Group",
        myGroupsTab: "My Groups",
        publicGroupsTab: "Public Groups",
        noDesc: "No description",
        membersCount: "members",
        joinBtn: "Join",
        viewBtn: "View",
        noMyGroups: "No groups yet",
        noPublicGroups: "No public groups available",
        createDesc: "Create a group to start collaborating.",
        checkLaterDesc: "Check back later for public groups.",
        createBtn: "Create Group",
        modalTitle: "Create New Group",
        groupNameLabel: "Group Name *",
        groupNamePlaceholder: "Enter group name",
        descLabel: "Description",
        descPlaceholder: "What is this group about?",
        makePublicCheck: "Make this group public",
        makePublicHint: "Public groups can be found and joined by anyone.",
        cancel: "Cancel",
        creating: "Creating...",
        backToGroups: "Back to Groups",
        badgePublic: "Public",
        badgePrivate: "Private",
        membersSection: (count) => `Members (${count})`,
        confirmRemove: "Remove this member from the group?",
        titleRemove: "Remove member",
        errLoadGroups: "Failed to load groups.",
        errCreate: "Failed to create group.",
        errJoin: "Failed to join group.",
        errLoadDetail: "Failed to load group details.",
        errRemove: "Failed to remove member."
    },
    bg: {
        pageTitle: "Групи",
        newGroupBtn: "Нова група",
        myGroupsTab: "Моите групи",
        publicGroupsTab: "Публични групи",
        noDesc: "Няма описание",
        membersCount: "членове",
        joinBtn: "Присъедини се",
        viewBtn: "Преглед",
        noMyGroups: "Все още няма групи",
        noPublicGroups: "Няма налични публични групи",
        createDesc: "Създайте група, за да започнете да си сътрудничите.",
        checkLaterDesc: "Проверете отново по-късно за публични групи.",
        createBtn: "Създаване на група",
        modalTitle: "Създаване на нова група",
        groupNameLabel: "Име на групата *",
        groupNamePlaceholder: "Въведете име на групата",
        descLabel: "Описание",
        descPlaceholder: "За какво е тази група?",
        makePublicCheck: "Направете тази група публична",
        makePublicHint: "Публичните групи могат да бъдат намерени и към тях може да се присъедини всеки.",
        cancel: "Отказ",
        creating: "Създаване...",
        backToGroups: "Назад към групите",
        badgePublic: "Публична",
        badgePrivate: "Частна",
        membersSection: (count) => `Членове (${count})`,
        confirmRemove: "Да премахна ли този член от групата?",
        titleRemove: "Премахни член",
        errLoadGroups: "Неуспешно зареждане на групи.",
        errCreate: "Неуспешно създаване на група.",
        errJoin: "Неуспешно присъединяване към група.",
        errLoadDetail: "Неуспешно зареждане на детайлите на групата.",
        errRemove: "Неуспешно премахване на член."
    }
};

export const GroupsPage = () => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const t = translations[language];

    const [activeTab, setActiveTab] = useState('my');
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [error, setError] = useState(null);

    // Create form
    const [newGroup, setNewGroup] = useState({ name: '', description: '', isPublic: false });
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadGroups();
    }, [activeTab]);

    const loadGroups = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await groupsApi.getGroups({ type: activeTab });
            setGroups(response.data || []);
        } catch (err) {
            console.error('Failed to load groups:', err);
            setError(t.errLoadGroups);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroup.name.trim()) return;
        setIsCreating(true);
        try {
            await groupsApi.createGroup(newGroup);
            setShowCreateModal(false);
            setNewGroup({ name: '', description: '', isPublic: false });
            loadGroups();
        } catch (err) {
            console.error('Failed to create group:', err);
            setError(err.response?.data?.message || t.errCreate);
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinGroup = async (groupId) => {
        try {
            await groupsApi.joinGroup(groupId);
            loadGroups();
        } catch (err) {
            console.error('Failed to join group:', err);
            setError(err.response?.data?.message || t.errJoin);
        }
    };

    const handleViewGroup = async (groupId) => {
        try {
            const response = await groupsApi.getGroupById(groupId);
            setSelectedGroup(response.data || response);
        } catch (err) {
            console.error('Failed to load group:', err);
            setError(t.errLoadDetail);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm(t.confirmRemove)) return;
        try {
            await groupsApi.removeMember(selectedGroup.id, userId);
            handleViewGroup(selectedGroup.id);
        } catch (err) {
            console.error('Failed to remove member:', err);
            setError(t.errRemove);
        }
    };

    if (selectedGroup) {
        const isOwner = selectedGroup.created_by === user?.id;
        const isAdmin = selectedGroup.my_role === 'admin' || isOwner;
        return (
            <div className="groups-page">
                <button className="back-link" onClick={() => setSelectedGroup(null)}>
                    <ArrowLeft size={16} /> {t.backToGroups}
                </button>

                <div className="group-detail-header">
                    <div>
                        <h1>{selectedGroup.name}</h1>
                        <p className="group-detail-desc">{selectedGroup.description || t.noDesc}</p>
                        <span className={`visibility-badge ${selectedGroup.is_public ? 'public' : 'private'}`}>
                            {selectedGroup.is_public ? <><Globe size={14} /> {t.badgePublic}</> : <><Lock size={14} /> {t.badgePrivate}</>}
                        </span>
                    </div>
                </div>

                <div className="members-section">
                    <h2>{t.membersSection(selectedGroup.members?.length || 0)}</h2>
                    <div className="members-list">
                        {(selectedGroup.members || []).map(member => (
                            <div key={member.id} className="member-card">
                                <div className="member-info">
                                    <span className="member-name">{member.username}</span>
                                    <span className="member-email">{member.email}</span>
                                    <span className={`member-role role-${member.role}`}>{member.role}</span>
                                </div>
                                {isAdmin && member.id !== user?.id && (
                                    <button
                                        className="btn-icon btn-icon-danger"
                                        onClick={() => handleRemoveMember(member.id)}
                                        title={t.titleRemove}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="groups-page">
            <div className="page-header">
                <h1>{t.pageTitle}</h1>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} /> {t.newGroupBtn}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'my' ? 'active' : ''}`}
                    onClick={() => setActiveTab('my')}
                >
                    {t.myGroupsTab}
                </button>
                <button
                    className={`tab ${activeTab === 'public' ? 'active' : ''}`}
                    onClick={() => setActiveTab('public')}
                >
                    {t.publicGroupsTab}
                </button>
            </div>

            {isLoading ? (
                <LoadingSpinner />
            ) : groups.length > 0 ? (
                <div className="groups-grid">
                    {groups.map(group => (
                        <div key={group.id} className="group-card">
                            <div className="group-card-header">
                                <h3>{group.name}</h3>
                                <span className={`visibility-badge ${group.is_public ? 'public' : 'private'}`}>
                                    {group.is_public ? <Globe size={12} /> : <Lock size={12} />}
                                </span>
                            </div>
                            <p className="group-description">
                                {group.description || t.noDesc}
                            </p>
                            <div className="group-card-footer">
                                <span className="member-count">
                                    <Users size={14} /> {group.member_count || 0} {t.membersCount}
                                </span>
                                <div className="group-actions">
                                    {activeTab === 'public' && !group.is_member && (
                                        <button
                                            className="btn-join"
                                            onClick={() => handleJoinGroup(group.id)}
                                        >
                                            <UserPlus size={14} /> {t.joinBtn}
                                        </button>
                                    )}
                                    <button
                                        className="btn-view"
                                        onClick={() => handleViewGroup(group.id)}
                                    >
                                        {t.viewBtn} <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <Users size={48} />
                    <h3>{activeTab === 'my' ? t.noMyGroups : t.noPublicGroups}</h3>
                    <p>{activeTab === 'my' ? t.createDesc : t.checkLaterDesc}</p>
                    {activeTab === 'my' && (
                        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                            <Plus size={16} /> {t.createBtn}
                        </button>
                    )}
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{t.modalTitle}</h3>
                            <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGroup}>
                            <div className="modal-content">
                                <div className="form-group">
                                    <label>{t.groupNameLabel}</label>
                                    <input
                                        type="text"
                                        value={newGroup.name}
                                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                        placeholder={t.groupNamePlaceholder}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t.descLabel}</label>
                                    <textarea
                                        value={newGroup.description}
                                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                        placeholder={t.descPlaceholder}
                                        rows={3}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={newGroup.isPublic}
                                            onChange={(e) => setNewGroup({ ...newGroup, isPublic: e.target.checked })}
                                        />
                                        <span>{t.makePublicCheck}</span>
                                    </label>
                                    <p className="form-help">{t.makePublicHint}</p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                                    {t.cancel}
                                </button>
                                <button type="submit" className="btn-primary" disabled={isCreating}>
                                    {isCreating ? t.creating : t.createBtn}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
