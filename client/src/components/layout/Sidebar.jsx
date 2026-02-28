import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, Upload, Users, Shield, User, ChevronLeft, ChevronRight, Search, UsersRound, Tags } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

export const Sidebar = ({ isOpen, onToggle }) => {
    const { hasPermission, hasRole } = useAuth();

    const menuItems = [
        { to: '/dashboard', icon: Home, label: 'Dashboard', show: true },
        { to: '/materials', icon: FileText, label: 'Materials', show: true },
        { to: '/search', icon: Search, label: 'Search', show: true },
        { to: '/upload', icon: Upload, label: 'Upload', show: hasPermission('materials:create') },
        { to: '/groups', icon: UsersRound, label: 'Groups', show: true },
        { to: '/profile', icon: User, label: 'Profile', show: true },
        { to: '/admin/users', icon: Users, label: 'Users', show: hasRole('admin') },
        { to: '/admin/roles', icon: Shield, label: 'Roles', show: hasRole('admin') },
        { to: '/admin/taxonomy', icon: Tags, label: 'Taxonomy', show: hasRole('admin') },
    ];


    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <h2 className="sidebar-title">{isOpen && 'Learning Platform'}</h2>
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
            </nav>
        </div>
    );
};
