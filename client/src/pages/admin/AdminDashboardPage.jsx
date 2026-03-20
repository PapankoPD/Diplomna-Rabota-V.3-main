import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Users, Shield, Inbox, BookOpen, Library, School } from 'lucide-react';
import './AdminDashboardPage.css';

const translations = {
    en: {
        title: 'Admin Panel',
        subtitle: 'Manage platform settings, users, taxonomy, and roles.',
        users: 'Users',
        roles: 'Roles',
        roleRequests: 'Role Requests',
        subjects: 'Subjects',
        topics: 'Themes/Topics',
        classes: 'Classes'
    },
    bg: {
        title: 'Админ Панел',
        subtitle: 'Управление на настройки, потребители, таксономия и роли.',
        users: 'Потребители',
        roles: 'Роли',
        roleRequests: 'Заявки за роли',
        subjects: 'Предмети',
        topics: 'Теми/Уроци',
        classes: 'Класове'
    }
};

export const AdminDashboardPage = () => {
    const { language } = useLanguage();
    const t = translations[language];

    const navItems = [
        { to: '/admin/users', icon: Users, label: t.users },
        { to: '/admin/roles', icon: Shield, label: t.roles },
        { to: '/admin/role-requests', icon: Inbox, label: t.roleRequests },
        { to: '/admin/subjects', icon: BookOpen, label: t.subjects },
        { to: '/admin/topics', icon: Library, label: t.topics },
        { to: '/admin/classes', icon: School, label: t.classes }
    ];

    return (
        <div className="admin-dashboard">
            <div className="admin-dashboard-header">
                <div>
                    <h1>{t.title}</h1>
                    <p>{t.subtitle}</p>
                </div>
            </div>

            <nav className="admin-dashboard-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="admin-dashboard-content">
                <Outlet />
            </div>
        </div>
    );
};
