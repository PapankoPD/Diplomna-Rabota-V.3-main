import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, LogOut, Search, Sun, Moon } from 'lucide-react';
import { NotificationsDropdown } from './NotificationsDropdown';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './TopBar.css';

export const TopBar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { language, toggleLanguage } = useLanguage();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/materials?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };

    const isTransparentPage = ['/groups', '/profile', '/upload', '/classes', '/materials'].includes(location.pathname)
        || location.pathname.startsWith('/admin')
        || location.pathname.startsWith('/classes/')
        || location.pathname.startsWith('/materials/');

    const t = {
        en: { searchMaterials: "Search materials..." },
        bg: { searchMaterials: "Търсене на материали..." }
    }[language];

    return (
        <div className={`topbar ${isTransparentPage ? 'topbar-transparent' : ''}`}>
            <div className="topbar-left">
                {!isTransparentPage && (
                    <form onSubmit={handleSearch} className="search-bar">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder={t.searchMaterials}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                )}
            </div>
            <div className="topbar-right">
                <button
                    className="icon-btn lang-toggle-btn"
                    onClick={toggleLanguage}
                    title={language === 'en' ? 'Превключи на Български' : 'Switch to English'}
                    style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'inherit' }}
                >
                    {language === 'en' ? 'BG' : 'EN'}
                </button>
                <button
                    className="icon-btn theme-toggle-btn"
                    onClick={toggleTheme}
                    title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <NotificationsDropdown />

                <div className="user-menu" ref={menuRef}>
                    <button
                        className="user-btn"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <User size={20} />
                        <span>{user?.username}</span>
                    </button>

                    {showUserMenu && (
                        <div className="user-dropdown">
                            <div className="user-info">
                                <p className="user-name">{user?.username}</p>
                                <p className="user-email">{user?.email}</p>
                            </div>
                            <div className="user-roles">
                                {user?.roles?.map(role => (
                                    <span key={role.id} className="role-badge">{role.name}</span>
                                ))}
                            </div>
                            <button className="logout-btn" onClick={handleLogout}>
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
