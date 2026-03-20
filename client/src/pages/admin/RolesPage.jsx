import React, { useState, useEffect } from 'react';
import { rolesApi } from '../../api/rolesApi';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Shield, Lock, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import './RolesPage.css';

const translations = {
    en: {
        roles: "Roles",
        createNewRole: "Create New Role",
        roleName: "Role Name",
        description: "Description",
        cancel: "Cancel",
        createRole: "Create Role",
        saving: "Saving...",
        savePermissions: "Save Permissions",
        selectRole: "Select a role to manage permissions",
        successUpdate: "Permissions updated successfully",
        errLoad: "Failed to load roles and permissions.",
        errUpdate: "Failed to update permissions.",
        errCreate: "Failed to create role.",
        roleNames: {
            admin: "admin",
            teacher: "teacher",
            student: "student"
        }
    },
    bg: {
        roles: "Роли",
        createNewRole: "Създаване на нова роля",
        roleName: "Име на ролята",
        description: "Описание",
        cancel: "Отказ",
        createRole: "Създаване на роля",
        saving: "Запазване...",
        savePermissions: "Запазване на правата",
        selectRole: "Изберете роля за управление на правата",
        successUpdate: "Правата са актуализирани успешно",
        errLoad: "Неуспешно зареждане на роли и права.",
        errUpdate: "Неуспешно актуализиране на права.",
        errCreate: "Неуспешно създаване на роля.",
        roleNames: {
            admin: "админ",
            teacher: "учител",
            student: "ученик"
        }
    }
};

export const RolesPage = () => {
    const { language } = useLanguage();
    const t = translations[language];
    const translateRole = (r) => t.roleNames?.[r] || r;

    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState(null);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [newRoleMode, setNewRoleMode] = useState(false);
    const [newRoleData, setNewRoleData] = useState({ name: '', description: '' });
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [rolesRes, permissionsRes] = await Promise.all([
                rolesApi.getRoles(),
                rolesApi.getPermissions()
            ]);
            setRoles(rolesRes.data?.roles || []);
            setPermissions(permissionsRes.data?.permissions || []);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError(t.errLoad);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setRolePermissions(role.permissions.map(p => p.id));
        setNewRoleMode(false);
    };

    const handlePermissionToggle = (permId) => {
        setRolePermissions(prev => {
            if (prev.includes(permId)) {
                return prev.filter(id => id !== permId);
            }
            return [...prev, permId];
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;

        try {
            setIsSaving(true);
            await rolesApi.updateRolePermissions(selectedRole.id, rolePermissions);

            // Refresh roles to get updated permissions
            const rolesRes = await rolesApi.getRoles();
            const rolesData = rolesRes.data?.roles || [];
            setRoles(rolesData);

            // Update selected role ref
            const updatedRole = rolesData.find(r => r.id === selectedRole.id);
            setSelectedRole(updatedRole);

            alert(t.successUpdate);
        } catch (err) {
            console.error('Failed to update permissions:', err);
            setError(t.errUpdate);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            await rolesApi.createRole(newRoleData.name, newRoleData.description);
            const rolesRes = await rolesApi.getRoles();
            setRoles(rolesRes.data?.roles || []);
            setNewRoleMode(false);
            setNewRoleData({ name: '', description: '' });
        } catch (err) {
            console.error('Failed to create role:', err);
            setError(t.errCreate);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="admin-page-split">
            <div className="roles-sidebar">
                <div className="sidebar-header">
                    <h2>{t.roles}</h2>
                    <button className="btn-icon" onClick={() => setNewRoleMode(true)}>
                        <Plus size={20} />
                    </button>
                </div>
                <div className="roles-list">
                    {roles.map(role => (
                        <div
                            key={role.id}
                            className={`role-item ${selectedRole?.id === role.id ? 'active' : ''}`}
                            onClick={() => handleRoleSelect(role)}
                        >
                            <Shield size={18} />
                            <span>{translateRole(role.name)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="role-details">
                {error && <div className="error-alert">{error}</div>}

                {newRoleMode ? (
                    <div className="new-role-form">
                        <h2>{t.createNewRole}</h2>
                        <form onSubmit={handleCreateRole}>
                            <div className="form-group">
                                <label>{t.roleName}</label>
                                <input
                                    type="text"
                                    value={newRoleData.name}
                                    onChange={e => setNewRoleData({ ...newRoleData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t.description}</label>
                                <textarea
                                    value={newRoleData.description}
                                    onChange={e => setNewRoleData({ ...newRoleData, description: e.target.value })}
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" onClick={() => setNewRoleMode(false)}>{t.cancel}</button>
                                <button type="submit" disabled={isSaving}>{t.createRole}</button>
                            </div>
                        </form>
                    </div>
                ) : selectedRole ? (
                    <div className="permissions-editor">
                        <div className="editor-header">
                            <div>
                                <h2>{translateRole(selectedRole.name)}</h2>
                                <p>{selectedRole.description}</p>
                            </div>
                            <button
                                className="btn-save"
                                onClick={handleSavePermissions}
                                disabled={isSaving}
                            >
                                <Save size={18} />
                                <span>{isSaving ? t.saving : t.savePermissions}</span>
                            </button>
                        </div>

                        <div className="permissions-grid">
                            {permissions.map(perm => (
                                <label key={perm.id} className="permission-item">
                                    <input
                                        type="checkbox"
                                        checked={rolePermissions.includes(perm.id)}
                                        onChange={() => handlePermissionToggle(perm.id)}
                                    />
                                    <div className="perm-info">
                                        <span className="perm-name">{perm.name}</span>
                                        <span className="perm-desc">{perm.description}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <Shield size={48} color="#cbd5e1" />
                        <p>{t.selectRole}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
