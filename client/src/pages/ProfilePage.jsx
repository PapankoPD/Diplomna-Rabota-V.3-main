import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { authApi } from '../api/authApi';
import { User, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import './ProfilePage.css';

const translations = {
    en: {
        title: "My Profile",
        subtitle: "Manage your account settings",
        profileInfo: "Profile Information",
        noChanges: "No changes to save.",
        profileSuccess: "Profile updated successfully!",
        username: "Username",
        usernamePlaceholder: "Enter your username",
        email: "Email",
        emailPlaceholder: "Enter your email",
        role: "Role",
        saving: "Saving...",
        saveChanges: "Save Changes",
        changePassword: "Change Password",
        pwdLengthErr: "New password must be at least 8 characters.",
        pwdMatchErr: "New passwords do not match.",
        pwdSuccess: "Password changed successfully!",
        pwdFail: "Failed to change password.",
        currentPwd: "Current Password",
        currentPwdPlaceholder: "Enter current password",
        newPwd: "New Password",
        newPwdPlaceholder: "Enter new password",
        confirmPwd: "Confirm New Password",
        confirmPwdPlaceholder: "Confirm new password",
        changing: "Changing..."
    },
    bg: {
        title: "Моят профил",
        subtitle: "Управление на настройките на профила",
        profileInfo: "Информация за профила",
        noChanges: "Няма промени за запазване.",
        profileSuccess: "Профилът е обновен успешно!",
        username: "Потребителско име",
        usernamePlaceholder: "Въведете потребителско име",
        email: "Имейл",
        emailPlaceholder: "Въведете имейл",
        role: "Роля",
        saving: "Запазване...",
        saveChanges: "Запази промените",
        changePassword: "Промяна на паролата",
        pwdLengthErr: "Новата парола трябва да е минимум 8 символа.",
        pwdMatchErr: "Новите пароли не съвпадат.",
        pwdSuccess: "Паролата е променена успешно!",
        pwdFail: "Неуспешна промяна на паролата.",
        currentPwd: "Текуща парола",
        currentPwdPlaceholder: "Въведете текущата парола",
        newPwd: "Нова парола",
        newPwdPlaceholder: "Въведете новата парола",
        confirmPwd: "Потвърдете новата парола",
        confirmPwdPlaceholder: "Потвърдете новата парола",
        changing: "Промяна..."
    }
};

export const ProfilePage = () => {
    const { user, updateProfile } = useAuth();
    const { language } = useLanguage();
    const t = translations[language];

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
            setProfileMsg({ type: 'info', text: t.noChanges });
            setIsProfileSaving(false);
            return;
        }

        const result = await updateProfile(data);
        setIsProfileSaving(false);

        if (result.success) {
            setProfileMsg({ type: 'success', text: t.profileSuccess });
        } else {
            setProfileMsg({ type: 'error', text: result.message });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordMsg(null);

        if (newPassword.length < 8) {
            setPasswordMsg({ type: 'error', text: t.pwdLengthErr });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: t.pwdMatchErr });
            return;
        }

        setIsPasswordSaving(true);

        try {
            const response = await authApi.changePassword(currentPassword, newPassword);
            setPasswordMsg({ type: 'success', text: response.message || t.pwdSuccess });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordMsg({
                type: 'error',
                text: error.response?.data?.message || t.pwdFail
            });
        } finally {
            setIsPasswordSaving(false);
        }
    };

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
            </div>

            <div className="profile-sections">
                <div className="profile-card">
                    <div className="card-header">
                        <User size={20} />
                        <h2>{t.profileInfo}</h2>
                    </div>

                    {profileMsg && (
                        <div className={`message ${profileMsg.type}`}>
                            {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {profileMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleProfileSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="username">{t.username}</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t.usernamePlaceholder}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">{t.email}</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t.emailPlaceholder}
                            />
                        </div>

                        <div className="form-group">
                            <label>{t.role}</label>
                            <input
                                type="text"
                                value={user?.roles?.map(r => r.name).join(', ') || 'user'}
                                disabled
                                className="disabled-input"
                            />
                        </div>

                        <button type="submit" className="save-btn" disabled={isProfileSaving}>
                            <Save size={16} />
                            {isProfileSaving ? t.saving : t.saveChanges}
                        </button>
                    </form>
                </div>

                <div className="profile-card">
                    <div className="card-header">
                        <Lock size={20} />
                        <h2>{t.changePassword}</h2>
                    </div>

                    {passwordMsg && (
                        <div className={`message ${passwordMsg.type}`}>
                            {passwordMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {passwordMsg.text}
                        </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="currentPassword">{t.currentPwd}</label>
                            <input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder={t.currentPwdPlaceholder}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword">{t.newPwd}</label>
                            <input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t.newPwdPlaceholder}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">{t.confirmPwd}</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t.confirmPwdPlaceholder}
                                required
                            />
                        </div>

                        <button type="submit" className="save-btn" disabled={isPasswordSaving}>
                            <Lock size={16} />
                            {isPasswordSaving ? t.changing : t.changePassword}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
