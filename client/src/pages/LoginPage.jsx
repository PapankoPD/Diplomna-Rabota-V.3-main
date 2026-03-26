import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { validateEmail } from '../utils/validators';
import './LoginPage.css';

const translations = {
    en: {
        welcome: "Welcome Back",
        signInDesc: "Sign in to your account",
        email: "Email",
        emailPlaceholder: "Enter your email",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        signingIn: "Signing in...",
        signIn: "Sign In",
        noAccount: "Don't have an account?",
        errPassword: "Please enter your password",
        errEmail: "Please enter a valid email address",
        forgotPassword: "Forgot Password?",
        signUp: "Sign Up"
    },
    bg: {
        welcome: "Добре дошли отново",
        signInDesc: "Влезте в профила си",
        email: "Имейл",
        emailPlaceholder: "Въведете вашия имейл",
        password: "Парола",
        passwordPlaceholder: "Въведете вашата парола",
        signingIn: "Влизане...",
        signIn: "Вход",
        noAccount: "Нямате профил?",
        errPassword: "Моля, въведете вашата парола",
        errEmail: "Моля, въведете валиден имейл адрес",
        forgotPassword: "Забравена парола?",
        signUp: "Регистрация"
    }
};

export const LoginPage = () => {
    const { language } = useLanguage();
    const t = translations[language];

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateEmail(email)) {
            setError(t.errEmail);
            return;
        }

        if (!password) {
            setError(t.errPassword);
            return;
        }

        setIsLoading(true);
        const result = await login(email, password);
        setIsLoading(false);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <h1>{t.welcome}</h1>
                    <p>{t.signInDesc}</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">{t.email}</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t.emailPlaceholder}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">{t.password}</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.passwordPlaceholder}
                            disabled={isLoading}
                        />
                        <div className="forgot-password-link">
                            <Link to="/forgot-password">{t.forgotPassword}</Link>
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? t.signingIn : t.signIn}
                    </button>
                </form>

                <div className="login-footer">
                    <p>{t.noAccount} <Link to="/register">{t.signUp}</Link></p>
                </div>
            </div>
        </div>
    );
};
