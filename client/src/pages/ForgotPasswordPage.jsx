import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useLanguage } from '../contexts/LanguageContext';
import { validateEmail } from '../utils/validators';
import { Lock, Mail, User, ArrowLeft, CheckCircle } from 'lucide-react';
import './LoginPage.css'; // Reuse container styles

const translations = {
    en: {
        title: "Reset Password",
        subtitle: "Enter your account details to set a new password",
        email: "Email",
        emailPlaceholder: "Enter your registered email",
        username: "Username",
        usernamePlaceholder: "Enter your username for verification",
        newPassword: "New Password",
        newPasswordPlaceholder: "At least 8 characters",
        confirmPassword: "Confirm New Password",
        confirmPasswordPlaceholder: "Repeat your new password",
        resetBtn: "Reset Password",
        resetting: "Resetting...",
        backToLogin: "Back to login",
        successMsg: "Your password has been reset successfully!",
        errEmail: "Please enter a valid email address",
        errFill: "Please fill in all fields",
        errMatch: "Passwords do not match",
        errLength: "Password must be at least 8 characters"
    },
    bg: {
        title: "Нулиране на парола",
        subtitle: "Въведете детайлите на профила си за нова парола",
        email: "Имейл",
        emailPlaceholder: "Въведете регистрирания имейл",
        username: "Потребителско име",
        usernamePlaceholder: "Въведете потребителско име за верификация",
        newPassword: "Нова парола",
        newPasswordPlaceholder: "Минимум 8 символа",
        confirmPassword: "Потвърдете парола",
        confirmPasswordPlaceholder: "Повторете новата парола",
        resetBtn: "Нулирай паролата",
        resetting: "Нулиране...",
        backToLogin: "Обратно към входа",
        successMsg: "Паролата ви беше успешно нулирана!",
        errEmail: "Моля, въведете валиден имейл адрес",
        errFill: "Моля, попълнете всички полета",
        errMatch: "Паролите не съвпадат",
        errLength: "Паролата трябва да е поне 8 символа"
    }
};

export const ForgotPasswordPage = () => {
    const { language } = useLanguage();
    const t = translations[language];
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateEmail(email)) {
            setError(t.errEmail);
            return;
        }

        if (!username || !newPassword || !confirmPassword) {
            setError(t.errFill);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t.errMatch);
            return;
        }

        if (newPassword.length < 8) {
            setError(t.errLength);
            return;
        }

        setIsLoading(true);
        try {
            const response = await authApi.resetForgottenPassword(email, username, newPassword);
            if (response.success) {
                setIsSuccess(true);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Reset failed. Please verify your details.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-header" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: '#10b981' }}>
                            <CheckCircle size={64} />
                        </div>
                        <h1>{t.successMsg}</h1>
                        <p style={{ marginTop: '16px' }}>
                            <Link to="/login" className="back-link">
                                <ArrowLeft size={16} /> {t.backToLogin}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <Link to="/login" className="back-link">
                        <ArrowLeft size={16} /> {t.backToLogin}
                    </Link>
                    <h1 style={{ marginTop: '12px' }}>{t.title}</h1>
                    <p>{t.subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">{t.email}</label>
                        <div className="input-with-icon">
                            <Mail size={18} className="input-icon" />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t.emailPlaceholder}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="username">{t.username}</label>
                        <div className="input-with-icon">
                            <User size={18} className="input-icon" />
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t.usernamePlaceholder}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword">{t.newPassword}</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t.newPasswordPlaceholder}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">{t.confirmPassword}</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t.confirmPasswordPlaceholder}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading} style={{ marginTop: '10px' }}>
                        {isLoading ? t.resetting : t.resetBtn}
                    </button>
                </form>
            </div>
        </div>
    );
};
