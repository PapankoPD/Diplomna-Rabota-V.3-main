import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, Upload, Users, Shield, User, ChevronLeft, ChevronRight, School, Inbox, Archive, ChevronDown, BookOpen, Library } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import './Sidebar.css';

const translations = {
    en: {
        dashboard: "Dashboard",
        materials: "Materials",
        profile: "Profile",
        users: "Users",
        roles: "Roles",
        subjects: "Subjects",
        topics: "Themes/Topics",
        teacherCodes: "Role Requests",
        manageClasses: "Manage Classes",
        adminPanel: "Admin Panel",
        platformName: "Learning Platform",
        upload: "Upload",
        uploadMaterial: "Upload Material",
        archivedMaterials: "Archived Materials"
    },
    bg: {
        dashboard: "Табло",
        materials: "Материали",
        profile: "Профил",
        users: "Потребители",
        roles: "Роли",
        subjects: "Предмети",
        topics: "Теми/Уроци",
        teacherCodes: "Заявки за роли",
        manageClasses: "Управление на класове",
        adminPanel: "Админ Панел",
        platformName: "Учебна платформа",
        upload: "Качване",
        uploadMaterial: "Качване на материал",
        archivedMaterials: "Архивирани материали"
    }
};

export const Sidebar = ({ isOpen, onToggle }) => {
    const { hasPermission, hasRole } = useAuth();
    const { language } = useLanguage();
    const t = translations[language];

    const [uploadOpen, setUploadOpen] = useState(false);
    const location = useLocation();

    // Auto-expand the upload dropdown if on a sub-route
    const isUploadActive = location.pathname === '/upload' || location.pathname === '/archived';

    const menuItems = [
        { to: '/dashboard', icon: Home, label: t.dashboard, show: true },
        { to: '/materials', icon: FileText, label: t.materials, show: true },
        { to: '/profile', icon: User, label: t.profile, show: true },
        { to: '/admin', icon: Shield, label: t.adminPanel, show: hasRole('admin') },
    ];

    const showUploadMenu = hasPermission('materials:create');

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <h2 className="sidebar-title">{isOpen && t.platformName}</h2>
                <button className="sidebar-toggle" onClick={onToggle}>
                    {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.filter(item => item.show).map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        {isOpen && <span>{item.label}</span>}
                    </NavLink>
                ))}

                {/* Upload dropdown */}
                {showUploadMenu && (
                    <div className={`nav-dropdown ${isUploadActive ? 'active' : ''}`}>
                        <button
                            className={`nav-item nav-dropdown-toggle ${isUploadActive ? 'active' : ''}`}
                            onClick={() => setUploadOpen(prev => !prev)}
                            title={!isOpen ? t.upload : undefined}
                        >
                            <Upload size={20} />
                            {isOpen && (
                                <>
                                    <span>{t.upload}</span>
                                    <ChevronDown
                                        size={15}
                                        className={`dropdown-chevron ${uploadOpen || isUploadActive ? 'rotated' : ''}`}
                                    />
                                </>
                            )}
                        </button>

                        {isOpen && (uploadOpen || isUploadActive) && (
                            <div className="nav-subitems">
                                <NavLink
                                    to="/upload"
                                    className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                                >
                                    <Upload size={15} />
                                    <span>{t.uploadMaterial}</span>
                                </NavLink>
                                <NavLink
                                    to="/archived"
                                    className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                                >
                                    <Archive size={15} />
                                    <span>{t.archivedMaterials}</span>
                                </NavLink>
                            </div>
                        )}

                        {/* Collapsed state: show icons for sub-items */}
                        {!isOpen && (
                            <div className="nav-subitems-collapsed">
                                <NavLink to="/upload" className={({ isActive }) => `nav-subitem-icon ${isActive ? 'active' : ''}`} title={t.uploadMaterial}>
                                    <Upload size={16} />
                                </NavLink>
                                <NavLink to="/archived" className={({ isActive }) => `nav-subitem-icon ${isActive ? 'active' : ''}`} title={t.archivedMaterials}>
                                    <Archive size={16} />
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}
            </nav>
        </div>
    );
};
