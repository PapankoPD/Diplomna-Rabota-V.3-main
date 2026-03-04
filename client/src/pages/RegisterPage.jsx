import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { taxonomyApi } from '../api/taxonomyApi';
import { validateEmail, validatePassword } from '../utils/validators';
import './RegisterPage.css';

export const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('student');
    const [subjects, setSubjects] = useState([]);           // all subjects from API
    const [selectedSubjects, setSelectedSubjects] = useState([]); // teacher's chosen subjects
    const [teacherCode, setTeacherCode] = useState('');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateEmail(email)) { setError('Please enter a valid email address'); return; }
        if (!username || username.length < 3) { setError('Username must be at least 3 characters'); return; }
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) { setError('Username can only contain letters, numbers, underscores, and hyphens'); return; }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) { setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }

        if (role === 'teacher' && !teacherCode.trim()) {
            setError('Please enter the teacher registration code.');
            return;
        }

        if (role === 'teacher' && selectedSubjects.length === 0) {
            setError('Please select at least one subject you will be teaching.');
            return;
        }

        setIsLoading(true);
        const result = await register(email, username, password, role, role === 'teacher' ? selectedSubjects : [], role === 'teacher' ? teacherCode.trim() : undefined);
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
                    <h1>Create Account</h1>
                    <p>Sign up to get started</p>
                </div>

                <form onSubmit={handleSubmit} className="register-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Enter your email" disabled={isLoading} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input id="username" type="text" value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Choose a username" disabled={isLoading} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Create a password" disabled={isLoading} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input id="confirmPassword" type="password" value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password" disabled={isLoading} />
                    </div>

                    {/* Role selector */}
                    <div className="form-group">
                        <label>I am registering as a</label>
                        <div className="role-selector">
                            <button
                                type="button"
                                className={`role-btn ${role === 'student' ? 'active' : ''}`}
                                onClick={() => { setRole('student'); setSelectedSubjects([]); setTeacherCode(''); }}
                                disabled={isLoading}
                            >
                                🎓 Student
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${role === 'teacher' ? 'active' : ''}`}
                                onClick={() => setRole('teacher')}
                                disabled={isLoading}
                            >
                                📚 Teacher
                            </button>
                        </div>
                    </div>

                    {/* Teacher-only fields */}
                    {role === 'teacher' && (
                        <>
                            {/* Registration code */}
                            <div className="form-group">
                                <label htmlFor="teacherCode">Teacher Registration Code <span className="req">*</span></label>
                                <p className="form-hint">Enter the code provided by your administrator</p>
                                <input
                                    id="teacherCode"
                                    type="text"
                                    value={teacherCode}
                                    onChange={e => setTeacherCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. 3806F183"
                                    disabled={isLoading}
                                    style={{ letterSpacing: '0.15em', fontWeight: 700 }}
                                />
                            </div>

                            {/* Subject picker */}
                            <div className="form-group">
                                <label>Subjects you will teach <span className="req">*</span></label>
                                <p className="form-hint">Select all subjects that apply</p>
                                {subjects.length === 0 ? (
                                    <p className="form-hint">Loading subjects...</p>
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

                    <button type="submit" className="register-btn" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="register-footer">
                    <p>Already have an account? <Link to="/login">Sign in</Link></p>
                </div>
            </div>
        </div>
    );
};
