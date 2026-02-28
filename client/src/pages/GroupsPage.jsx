import React, { useState, useEffect } from 'react';
import { groupsApi } from '../api/groupsApi';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Users, Plus, Globe, Lock, UserPlus, LogOut, X, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';
import './GroupsPage.css';

export const GroupsPage = () => {
    const { user } = useAuth();
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
            setError('Failed to load groups.');
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
            setError(err.response?.data?.message || 'Failed to create group.');
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
            setError(err.response?.data?.message || 'Failed to join group.');
        }
    };

    const handleViewGroup = async (groupId) => {
        try {
            const response = await groupsApi.getGroupById(groupId);
            setSelectedGroup(response.data || response);
        } catch (err) {
            console.error('Failed to load group:', err);
            setError('Failed to load group details.');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Remove this member from the group?')) return;
        try {
            await groupsApi.removeMember(selectedGroup.id, userId);
            handleViewGroup(selectedGroup.id);
        } catch (err) {
            console.error('Failed to remove member:', err);
            setError('Failed to remove member.');
        }
    };

    if (selectedGroup) {
        const isOwner = selectedGroup.created_by === user?.id;
        const isAdmin = selectedGroup.my_role === 'admin' || isOwner;
        return (
            <div className="groups-page">
                <button className="back-link" onClick={() => setSelectedGroup(null)}>
                    <ArrowLeft size={16} /> Back to Groups
                </button>

                <div className="group-detail-header">
                    <div>
                        <h1>{selectedGroup.name}</h1>
                        <p className="group-detail-desc">{selectedGroup.description || 'No description'}</p>
                        <span className={`visibility-badge ${selectedGroup.is_public ? 'public' : 'private'}`}>
                            {selectedGroup.is_public ? <><Globe size={14} /> Public</> : <><Lock size={14} /> Private</>}
                        </span>
                    </div>
                </div>

                <div className="members-section">
                    <h2>Members ({selectedGroup.members?.length || 0})</h2>
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
                                        title="Remove member"
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
                <h1>Groups</h1>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} /> New Group
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'my' ? 'active' : ''}`}
                    onClick={() => setActiveTab('my')}
                >
                    My Groups
                </button>
                <button
                    className={`tab ${activeTab === 'public' ? 'active' : ''}`}
                    onClick={() => setActiveTab('public')}
                >
                    Public Groups
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
                                {group.description || 'No description'}
                            </p>
                            <div className="group-card-footer">
                                <span className="member-count">
                                    <Users size={14} /> {group.member_count || 0} members
                                </span>
                                <div className="group-actions">
                                    {activeTab === 'public' && !group.is_member && (
                                        <button
                                            className="btn-join"
                                            onClick={() => handleJoinGroup(group.id)}
                                        >
                                            <UserPlus size={14} /> Join
                                        </button>
                                    )}
                                    <button
                                        className="btn-view"
                                        onClick={() => handleViewGroup(group.id)}
                                    >
                                        View <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <Users size={48} />
                    <h3>{activeTab === 'my' ? 'No groups yet' : 'No public groups available'}</h3>
                    <p>{activeTab === 'my' ? 'Create a group to start collaborating.' : 'Check back later for public groups.'}</p>
                    {activeTab === 'my' && (
                        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                            <Plus size={16} /> Create Group
                        </button>
                    )}
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New Group</h3>
                            <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGroup}>
                            <div className="modal-content">
                                <div className="form-group">
                                    <label>Group Name *</label>
                                    <input
                                        type="text"
                                        value={newGroup.name}
                                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                        placeholder="Enter group name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={newGroup.description}
                                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                        placeholder="What is this group about?"
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
                                        <span>Make this group public</span>
                                    </label>
                                    <p className="form-help">Public groups can be found and joined by anyone.</p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={isCreating}>
                                    {isCreating ? 'Creating...' : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
