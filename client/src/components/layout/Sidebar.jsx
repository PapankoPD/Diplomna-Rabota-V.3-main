import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, Upload, Users, Shield, User, ChevronLeft, ChevronRight, School, Key, Archive, ChevronDown } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

export const Sidebar = ({ isOpen, onToggle }) => {
    const { hasPermission, hasRole } = useAuth();
    const [uploadOpen, setUploadOpen] = useState(false);
    const location = useLocation();

    // Auto-expand the upload dropdown if on a sub-route
    const isUploadActive = location.pathname === '/upload' || location.pathname === '/archived';

    const menuItems = [
        { to: '/dashboard', icon: Home, label: 'Dashboard', show: true },
        { to: '/materials', icon: FileText, label: 'Materials', show: true },
        { to: '/classes', icon: School, label: 'Classes', show: true },
        { to: '/profile', icon: User, label: 'Profile', show: true },
        { to: '/admin/users', icon: Users, label: 'Users', show: hasRole('admin') },
        { to: '/admin/roles', icon: Shield, label: 'Roles', show: hasRole('admin') },
        { to: '/admin/teacher-codes', icon: Key, label: 'Teacher Codes', show: hasRole('admin') },
    ];

    const showUploadMenu = hasPermission('materials:create');

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

                {/* Upload dropdown */}
                {showUploadMenu && (
                    <div className={`nav-dropdown ${isUploadActive ? 'active' : ''}`}>
                        <button
                            className={`nav-item nav-dropdown-toggle ${isUploadActive ? 'active' : ''}`}
                            onClick={() => setUploadOpen(prev => !prev)}
                            title={!isOpen ? 'Upload' : undefined}
                        >
                            <Upload size={20} />
                            {isOpen && (
                                <>
                                    <span>Upload</span>
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
                                    <span>Upload Material</span>
                                </NavLink>
                                <NavLink
                                    to="/archived"
                                    className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                                >
                                    <Archive size={15} />
                                    <span>Archived Materials</span>
                                </NavLink>
                            </div>
                        )}

                        {/* Collapsed state: show icons for sub-items */}
                        {!isOpen && (
                            <div className="nav-subitems-collapsed">
                                <NavLink to="/upload" className={({ isActive }) => `nav-subitem-icon ${isActive ? 'active' : ''}`} title="Upload Material">
                                    <Upload size={16} />
                                </NavLink>
                                <NavLink to="/archived" className={({ isActive }) => `nav-subitem-icon ${isActive ? 'active' : ''}`} title="Archived Materials">
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
