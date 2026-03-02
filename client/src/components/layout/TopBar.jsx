import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import './TopBar.css';

export const TopBar = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
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
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };

    const isTransparentPage = ['/search', '/groups', '/profile'].includes(location.pathname) || location.pathname.startsWith('/admin');

    return (
        <div className={`topbar ${isTransparentPage ? 'topbar-transparent' : ''}`}>
            <div className="topbar-left">
                {!isTransparentPage && (
                    <form onSubmit={handleSearch} className="search-bar">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                )}
            </div>
            <div className="topbar-right">
                <button className="icon-btn">
                    <Bell size={20} />
                </button>

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
