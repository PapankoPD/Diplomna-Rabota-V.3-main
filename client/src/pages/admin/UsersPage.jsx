import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api/usersApi';
import { rolesApi } from '../../api/rolesApi';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { UserCog, Trash2, Check, X } from 'lucide-react';
import './UsersPage.css';

export const UsersPage = () => {
    const { hasPermission } = useAuth();
    const canDeleteUsers = hasPermission('users:delete');

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [editingUser, setEditingUser] = useState(null);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [usersRes, rolesRes] = await Promise.all([
                usersApi.getUsers(),
                rolesApi.getRoles()
            ]);
            setUsers(usersRes.data?.users || []);
            setRoles(rolesRes.data?.roles || []);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Failed to load users and roles.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setSelectedRoles(user.roles.map(r => r.id));
    };

    const handleRoleToggle = (roleId) => {
        setSelectedRoles(prev => {
            if (prev.includes(roleId)) {
                return prev.filter(id => id !== roleId);
            }
            return [...prev, roleId];
        });
    };

    const handleSaveRoles = async () => {
        try {
            await usersApi.updateUserRoles(editingUser.id, selectedRoles);

            // Update local state
            setUsers(prev => prev.map(u => {
                if (u.id === editingUser.id) {
                    const newRoles = roles.filter(r => selectedRoles.includes(r.id));
                    return { ...u, roles: newRoles };
                }
                return u;
            }));

            setEditingUser(null);
        } catch (err) {
            console.error('Failed to update roles:', err);
            setError('Failed to update user roles.');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Are you sure you want to delete the account "${user.username}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await usersApi.deleteUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (err) {
            console.error('Failed to delete user:', err);
            setError('Failed to delete user account.');
        }
    };



    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>User Management</h1>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="users-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Roles</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.username}</td>
                                <td>{user.email}</td>
                                <td>
                                    <div className="roles-tags">
                                        {user.roles.map(role => (
                                            <span key={role.id} className="role-tag">{role.name}</span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleEditClick(user)}
                                            title="Edit Roles"
                                        >
                                            <UserCog size={18} />
                                        </button>
                                        {canDeleteUsers && (
                                            <button
                                                className="btn-icon btn-icon-danger"
                                                onClick={() => handleDeleteUser(user)}
                                                title="Delete Account"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Edit Roles for {editingUser.username}</h3>
                            <button className="btn-close" onClick={() => setEditingUser(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-content">
                            <div className="roles-selection">
                                {roles.map(role => (
                                    <label key={role.id} className="role-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedRoles.includes(role.id)}
                                            onChange={() => handleRoleToggle(role.id)}
                                        />
                                        <span>{role.name}</span>
                                        <span className="role-desc">{role.description}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveRoles}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
