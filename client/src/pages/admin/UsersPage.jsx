import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api/usersApi';
import { rolesApi } from '../../api/rolesApi';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { taxonomyApi } from '../../api/taxonomyApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { UserCog, Trash2, Check, ShieldOff, ShieldCheck, BookOpen } from 'lucide-react';
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
        errSuspend: "Failed to toggle suspension status.",
        colStatus: "Status",
        statusActive: "Active",
        statusSuspended: "Suspended",
        suspendUser: "Suspend",
        activateUser: "Activate",
        confirmSuspend: (username) => `Are you sure you want to suspend "${username}"? They will not be able to log in.`,
        confirmActivate: (username) => `Are you sure you want to reactivate "${username}"?`,
        manageClassesTitle: "Manage Classes",
        manageClassesFor: (username) => `Manage Classes for ${username}`,
        classesLimit: "Select up to 6 classes.",
        errClassesLimit: "You can only select a maximum of 6 classes.",
        noClassesFound: "No classes available in the system.",
        errLoadClasses: "Failed to load classes.",
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
        errSuspend: "Неуспешно превключване на статуса на блокиране.",
        colStatus: "Статус",
        statusActive: "Активен",
        statusSuspended: "Блокиран",
        suspendUser: "Блокирай",
        activateUser: "Активирай",
        confirmSuspend: (username) => `Сигурни ли сте, че искате да блокирате "${username}"? Те няма да могат да влизат в системата.`,
        confirmActivate: (username) => `Сигурни ли сте, че искате да активирате "${username}"?`,
        manageClassesTitle: "Управление на класове",
        manageClassesFor: (username) => `Управление на класове за ${username}`,
        classesLimit: "Изберете до 6 класа.",
        errClassesLimit: "Можете да изберете максимум 6 класа.",
        noClassesFound: "Няма налични класове в системата.",
        errLoadClasses: "Неуспешно зареждане на класове.",
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
    const confirm = useConfirm();
    const t = translations[language];
    const translateRole = (r) => t.roleNames?.[r] || r;

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [editingUser, setEditingUser] = useState(null);
    const [selectedRoles, setSelectedRoles] = useState([]);

    const [managingClassesUser, setManagingClassesUser] = useState(null);
    const [allClasses, setAllClasses] = useState([]);
    const [selectedClasses, setSelectedClasses] = useState([]);
    
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

    const handleManageClassesClick = async (user) => {
        setManagingClassesUser(user);
        setSelectedClasses([]);
        setError(null);
        try {
            const [classesRes, assignedRes] = await Promise.all([
                taxonomyApi.getAllClasses(),
                usersApi.getTeacherClasses(user.id)
            ]);
            
            const fetchedClasses = classesRes.data?.classes || [];
            const activeClassesCode = ['8', '9', '10', '11', '12'];
            const filteredClasses = fetchedClasses.filter(c => activeClassesCode.includes(c.grade_code));

            setAllClasses(filteredClasses);
            setSelectedClasses((assignedRes.data?.classes || []).map(c => c.class_id));
        } catch (err) {
            console.error('Failed to load classes info:', err);
            setError(t.errLoadClasses);
        }
    };

    const handleClassToggle = (classId) => {
        setSelectedClasses(prev => {
            if (prev.includes(classId)) {
                return prev.filter(id => id !== classId);
            }
            if (prev.length >= 6) {
                setError(t.errClassesLimit);
                return prev;
            }
            setError(null);
            return [...prev, classId];
        });
    };

    const handleSaveClasses = async () => {
        try {
            setError(null);
            await usersApi.updateTeacherClasses(managingClassesUser.id, selectedClasses);
            setManagingClassesUser(null);
        } catch (err) {
            console.error('Failed to update teacher classes:', err);
            setError(err.response?.data?.message || t.errUpdate);
        }
    };

    const handleDeleteUser = async (user) => {
        const confirmed = await confirm({
            message: t.confirmDelete(user.username),
            isDanger: true
        });
        if (!confirmed) {
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

    const handleToggleSuspend = async (user) => {
        const isConfirmingSuspension = !user.is_suspended;
        const confirmed = await confirm({
            message: isConfirmingSuspension ? t.confirmSuspend(user.username) : t.confirmActivate(user.username),
            confirmText: isConfirmingSuspension ? t.suspendUser : t.activateUser,
            isDanger: isConfirmingSuspension
        });
        if (!confirmed) return;

        try {
            const res = await usersApi.suspendUser(user.id);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_suspended: res.data.is_suspended } : u));
        } catch (err) {
            console.error('Failed to toggle suspension:', err);
            setError(t.errSuspend);
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
                            <th>{t.colStatus}</th>
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
                                    <span className={`status-badge ${user.is_suspended ? 'suspended' : 'active'}`}>
                                        {user.is_suspended ? t.statusSuspended : t.statusActive}
                                    </span>
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
                                            {user.roles.some(r => r.name === 'teacher') && (
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => handleManageClassesClick(user)}
                                                    title={t.manageClassesTitle}
                                                >
                                                    <BookOpen size={18} />
                                                </button>
                                            )}
                                            <button
                                                className={`btn-icon ${user.is_suspended ? 'btn-icon-success' : 'btn-icon-warning'}`}
                                                onClick={() => handleToggleSuspend(user)}
                                                title={user.is_suspended ? t.activateUser : t.suspendUser}
                                            >
                                                {user.is_suspended ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
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

            {managingClassesUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{t.manageClassesFor(managingClassesUser.username)}</h3>
                        </div>
                        <div className="modal-content">
                            <p className="modal-desc" style={{ marginBottom: 15, fontSize: 13, color: 'var(--gray-400)' }}>
                                {t.classesLimit} ({selectedClasses.length}/6)
                            </p>
                            {allClasses.length === 0 ? (
                                <p>{t.noClassesFound}</p>
                            ) : (
                                <div className="roles-selection" style={{ maxHeight: 300, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {allClasses.map(cls => (
                                        <label key={cls.id} className="role-checkbox" style={{ margin: 0 }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedClasses.includes(cls.id)}
                                                onChange={() => handleClassToggle(cls.id)}
                                            />
                                            <span>{cls.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setManagingClassesUser(null)}>{t.cancel}</button>
                            <button className="btn-primary" onClick={handleSaveClasses}>{t.saveChanges}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
