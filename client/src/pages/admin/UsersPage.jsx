import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api/usersApi';
import { rolesApi } from '../../api/rolesApi';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { UserCog, Trash2, Check, X } from 'lucide-react';
import './UsersPage.css';

const translations = {
    en: {
        pageTitle: "User Management",
        colUsername: "Username",
        colEmail: "Email",
        colRoles: "Roles",
        colActions: "Actions",
        editRolesTitle: "Edit Roles",
        deleteAccountTitle: "Delete Account",
        confirmDelete: (username) => `Are you sure you want to delete the account "${username}"? This action cannot be undone.`,
        editRolesFor: (username) => `Edit Roles for ${username}`,
        cancel: "Cancel",
        saveChanges: "Save Changes",
        errLoad: "Failed to load users and roles.",
        errUpdate: "Failed to update user roles.",
        errDelete: "Failed to delete user account.",
        roleNames: {
            admin: "admin",
            teacher: "teacher",
            student: "student"
        }
    },
    bg: {
        pageTitle: "Управление на потребители",
        colUsername: "Потребителско име",
        colEmail: "Имейл",
        colRoles: "Роли",
        colActions: "Действия",
        editRolesTitle: "Редактиране на роли",
        deleteAccountTitle: "Изтриване на акаунт",
        confirmDelete: (username) => `Сигурни ли сте, че искате да изтриете акаунта "${username}"? Това действие не може да бъде отменено.`,
        editRolesFor: (username) => `Редактиране на роли за ${username}`,
        cancel: "Отказ",
        saveChanges: "Запазване на промените",
        errLoad: "Неуспешно зареждане на потребители и роли.",
        errUpdate: "Неуспешно актуализиране на потребителски роли.",
        errDelete: "Неуспешно изтриване на потребителски акаунт.",
        roleNames: {
            admin: "админ",
            teacher: "учител",
            student: "ученик"
        }
    }
};

export const UsersPage = () => {
    const { hasPermission } = useAuth();
    const canDeleteUsers = hasPermission('users:delete');
    const { language } = useLanguage();
    const t = translations[language];
    const translateRole = (r) => t.roleNames?.[r] || r;

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
            setError(t.errLoad);
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
            setError(t.errUpdate);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(t.confirmDelete(user.username))) {
            return;
        }

        try {
            await usersApi.deleteUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (err) {
            console.error('Failed to delete user:', err);
            setError(t.errDelete);
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>{t.pageTitle}</h1>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="users-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t.colUsername}</th>
                            <th>{t.colEmail}</th>
                            <th>{t.colRoles}</th>
                            <th>{t.colActions}</th>
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
                                            <span key={role.id} className={`role-tag role-${role.name.toLowerCase()}`}>{translateRole(role.name)}</span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleEditClick(user)}
                                            title={t.editRolesTitle}
                                        >
                                            <UserCog size={18} />
                                        </button>
                                        {canDeleteUsers && (
                                            <button
                                                className="btn-icon btn-icon-danger"
                                                onClick={() => handleDeleteUser(user)}
                                                title={t.deleteAccountTitle}
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
                            <h3>{t.editRolesFor(editingUser.username)}</h3>
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
                                        <span>{translateRole(role.name)}</span>
                                        <span className="role-desc">{role.description}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setEditingUser(null)}>{t.cancel}</button>
                            <button className="btn-primary" onClick={handleSaveRoles}>{t.saveChanges}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
