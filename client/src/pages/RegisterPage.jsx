import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { taxonomyApi } from '../api/taxonomyApi';
import { validateEmail, validatePassword } from '../utils/validators';
import './RegisterPage.css';

const translations = {
    en: {
        title: "Create Account",
        subtitle: "Sign up to get started",
        email: "Email",
        emailPlaceholder: "Enter your email",
        username: "Username",
        usernamePlaceholder: "Choose a username",
        password: "Password",
        passwordPlaceholder: "Create a password",
        confirmPassword: "Confirm Password",
        confirmPasswordPlaceholder: "Confirm your password",
        registerAs: "I am registering as a",
        student: "🎓 Student",
        teacher: "📚 Teacher",
        subjectsTeach: "Subjects you will teach",
        subjectsHint: "Select all subjects that apply",
        loadingSubjects: "Loading subjects...",
        teacherPendingNote: "Your account will be registered as a student. An admin will review and approve your teacher access.",
        adminPendingNote: "Your account will be registered as a student. An admin will review and approve your admin access.",
        reasonLabel: "Reason for admin access",
        reasonPlaceholder: "Briefly describe why you need admin access...",
        creatingAccount: "Creating account...",
        signUp: "Sign Up",
        haveAccount: "Already have an account?",
        signIn: "Sign in",
        requestAdmin: "Request admin access",
        errEmail: "Please enter a valid email address",
        errUsernameLength: "Username must be at least 3 characters",
        errUsernameChars: "Username can only contain letters, numbers, underscores, and hyphens",
        errPasswordComplexity: "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        errPasswordMatch: "Passwords do not match",
        errSubjects: "Please select at least one subject you will be teaching.",
    },
    bg: {
        title: "Създаване на профил",
        subtitle: "Регистрирайте се, за да започнете",
        email: "Имейл",
        emailPlaceholder: "Въведете вашия имейл",
        username: "Потребителско име",
        usernamePlaceholder: "Изберете потребителско име",
        password: "Парола",
        passwordPlaceholder: "Създайте парола",
        confirmPassword: "Потвърдете паролата",
        confirmPasswordPlaceholder: "Потвърдете вашата парола",
        registerAs: "Регистрирам се като",
        student: "🎓 Ученик",
        teacher: "📚 Учител",
        subjectsTeach: "Предмети, които ще преподавате",
        subjectsHint: "Изберете всички подходящи предмети",
        loadingSubjects: "Зареждане на предмети...",
        teacherPendingNote: "Профилът ви ще бъде регистриран като ученик. Администратор ще прегледа и одобри достъпа ви като учител.",
        adminPendingNote: "Профилът ви ще бъде регистриран като ученик. Администратор ще прегледа и одобри достъпа ви като администратор.",
        reasonLabel: "Причина за достъп като администратор",
        reasonPlaceholder: "Опишете накратко защо имате нужда от администраторски достъп...",
        creatingAccount: "Създаване на профил...",
        signUp: "Регистрация",
        haveAccount: "Вече имате профил?",
        signIn: "Вход",
        requestAdmin: "Заявете администраторски достъп",
        errEmail: "Моля, въведете валиден имейл адрес",
        errUsernameLength: "Потребителското име трябва да е поне 3 символа",
        errUsernameChars: "Потребителското име може да съдържа само букви, цифри, долни черти и тирета",
        errPasswordComplexity: "Паролата трябва да е поне 8 символа, с главна и малка буква, цифра и специален символ",
        errPasswordMatch: "Паролите не съвпадат",
        errSubjects: "Моля, изберете поне един предмет, по който ще преподавате.",
    }
};

export const RegisterPage = () => {
    const { language } = useLanguage();
    const t = translations[language];

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('student');
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [adminReason, setAdminReason] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    // Load subjects when role = teacher
    useEffect(() => {
        if (role === 'teacher') {
            taxonomyApi.getSubjects().then(res => {
                setSubjects(res.data?.subjects || []);
            }).catch(() => { });
        }
    }, [role]);

    const toggleSubject = (id) => {
        setSelectedSubjects(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleRoleSwitch = (newRole) => {
        setRole(newRole);
        setSelectedSubjects([]);
        setAdminReason('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateEmail(email)) { setError(t.errEmail); return; }
        if (!username || username.length < 3) { setError(t.errUsernameLength); return; }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) { setError(t.errUsernameChars); return; }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) { setError(t.errPasswordComplexity); return; }
        if (password !== confirmPassword) { setError(t.errPasswordMatch); return; }

        if (role === 'teacher' && selectedSubjects.length === 0) {
            setError(t.errSubjects);
            return;
        }

        setIsLoading(true);
        const result = await register(
            email, username, password, role,
            role === 'teacher' ? selectedSubjects : [],
            undefined, // teacherCode no longer used
            role === 'admin' ? adminReason : undefined
        );
        setIsLoading(false);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.errors?.[0]?.msg || result.message);
        }
    };

    return (
        <div className="register-page">
            <div className="register-container">
                <div className="register-header">
                    <h1>{t.title}</h1>
                    <p>{t.subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="register-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">{t.email}</label>
                        <input id="email" type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder={t.emailPlaceholder} disabled={isLoading} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="username">{t.username}</label>
                        <input id="username" type="text" value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder={t.usernamePlaceholder} disabled={isLoading} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">{t.password}</label>
                        <input id="password" type="password" value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder={t.passwordPlaceholder} disabled={isLoading} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">{t.confirmPassword}</label>
                        <input id="confirmPassword" type="password" value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder={t.confirmPasswordPlaceholder} disabled={isLoading} />
                    </div>

                    {/* Role selector */}
                    <div className="form-group">
                        <label>{t.registerAs}</label>
                        <div className="role-selector">
                            <button
                                type="button"
                                className={`role-btn ${role === 'student' ? 'active' : ''}`}
                                onClick={() => handleRoleSwitch('student')}
                                disabled={isLoading}
                            >
                                {t.student}
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${role === 'teacher' ? 'active' : ''}`}
                                onClick={() => handleRoleSwitch('teacher')}
                                disabled={isLoading}
                            >
                                {t.teacher}
                            </button>
                        </div>
                    </div>

                    {/* Teacher fields */}
                    {role === 'teacher' && (
                        <>
                            <div className="pending-note">{t.teacherPendingNote}</div>
                            <div className="form-group">
                                <label>{t.subjectsTeach} <span className="req">*</span></label>
                                <p className="form-hint">{t.subjectsHint}</p>
                                {subjects.length === 0 ? (
                                    <p className="form-hint">{t.loadingSubjects}</p>
                                ) : (
                                    <div className="subject-chips">
                                        {subjects.map(s => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                className={`subject-chip ${selectedSubjects.includes(s.id) ? 'selected' : ''}`}
                                                onClick={() => toggleSubject(s.id)}
                                                disabled={isLoading}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Admin request fields */}
                    {role === 'admin' && (
                        <>
                            <div className="pending-note pending-note--admin">{t.adminPendingNote}</div>
                            <div className="form-group">
                                <label htmlFor="adminReason">{t.reasonLabel}</label>
                                <textarea
                                    id="adminReason"
                                    value={adminReason}
                                    onChange={e => setAdminReason(e.target.value)}
                                    placeholder={t.reasonPlaceholder}
                                    disabled={isLoading}
                                    rows={3}
                                />
                            </div>
                        </>
                    )}

                    <button type="submit" className="register-btn" disabled={isLoading}>
                        {isLoading ? t.creatingAccount : t.signUp}
                    </button>
                </form>

                <div className="register-footer">
                    <p>{t.haveAccount} <Link to="/login">{t.signIn}</Link></p>
                    {/* Hidden admin request link */}
                    {role !== 'admin' && (
                        <button
                            type="button"
                            className="admin-request-link"
                            onClick={() => handleRoleSwitch('admin')}
                        >
                            {t.requestAdmin}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
