import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/authApi';
import { User, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import './ProfilePage.css';

export const ProfilePage = () => {
    const { user, updateProfile } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [profileMsg, setProfileMsg] = useState(null);
    const [passwordMsg, setPasswordMsg] = useState(null);
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileMsg(null);
        setIsProfileSaving(true);

        const data = {};
        if (username !== user.username) data.username = username;
        if (email !== user.email) data.email = email;

        if (Object.keys(data).length === 0) {
            setProfileMsg({ type: 'info', text: 'No changes to save.' });
            setIsProfileSaving(false);
            return;
        }

        const result = await updateProfile(data);
        setIsProfileSaving(false);

        if (result.success) {
            setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        } else {
            setProfileMsg({ type: 'error', text: result.message });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordMsg(null);

        if (newPassword.length < 8) {
            setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        setIsPasswordSaving(true);

        try {
            const response = await authApi.changePassword(currentPassword, newPassword);
            setPasswordMsg({ type: 'success', text: response.message || 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordMsg({
                type: 'error',
                text: error.response?.data?.message || 'Failed to change password.'
            });
        } finally {
            setIsPasswordSaving(false);
        }
    };

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1>My Profile</h1>
                <p>Manage your account settings</p>
            </div>

            <div className="profile-sections">
                <div className="profile-card">
                    <div className="card-header">
                        <User size={20} />
                        <h2>Profile Information</h2>
                    </div>

                    {profileMsg && (
                        <div className={`message ${profileMsg.type}`}>
                            {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {profileMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleProfileSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                            />
                        </div>

                        <div className="form-group">
                            <label>Role</label>
                            <input
                                type="text"
                                value={user?.roles?.map(r => r.name).join(', ') || 'user'}
                                disabled
                                className="disabled-input"
                            />
                        </div>

                        <button type="submit" className="save-btn" disabled={isProfileSaving}>
                            <Save size={16} />
                            {isProfileSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                <div className="profile-card">
                    <div className="card-header">
                        <Lock size={20} />
                        <h2>Change Password</h2>
                    </div>

                    {passwordMsg && (
                        <div className={`message ${passwordMsg.type}`}>
                            {passwordMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {passwordMsg.text}
                        </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="currentPassword">Current Password</label>
                            <input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                            />
                        </div>

                        <button type="submit" className="save-btn" disabled={isPasswordSaving}>
                            <Lock size={16} />
                            {isPasswordSaving ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
