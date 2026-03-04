import React, { useState, useEffect } from 'react';
import { classesApi } from '../api/classesApi';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
    GraduationCap, User, ChevronDown, ChevronRight,
    X, UserCheck, BookOpen, Users, ArrowRight
} from 'lucide-react';
import './ClassesPage.css';

// ── Initials avatar ──────────────────────────────────────────────────────────
const Avatar = ({ username }) => {
    const initials = username
        ? username.slice(0, 2).toUpperCase()
        : '??';
    const hue = [...username].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return (
        <div
            className="classmate-avatar"
            style={{ background: `hsl(${hue},55%,60%)` }}
            title={username}
        >
            {initials}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

export const ClassesPage = () => {
    const { hasRole, user } = useAuth();
    const isAdmin = hasRole('admin');
    const isTeacher = hasRole('teacher');
    const navigate = useNavigate();

    const [grades, setGrades] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState({});
    const [serverIsTeacher, setServerIsTeacher] = useState(false);
    const [isStudent, setIsStudent] = useState(false);

    // Assign-teacher state (admin only)
    const [assigning, setAssigning] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setIsLoading(true);
        try {
            const [classesRes, teachersRes] = await Promise.all([
                classesApi.getClasses(),
                isAdmin ? classesApi.getTeachers() : Promise.resolve({ data: { teachers: [] } }),
            ]);
            setGrades(classesRes.data?.grades || []);
            setTeachers(teachersRes.data?.teachers || []);
            setServerIsTeacher(classesRes.data?.isTeacher || false);
            setIsStudent(classesRes.data?.isStudent || false);
        } catch (err) {
            setError('Failed to load classes.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleGrade = (id) =>
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const handleAssign = async (classId) => {
        if (!selectedTeacher) return;
        setIsSaving(true);
        try {
            await classesApi.assignTeacher(classId, selectedTeacher);
            setAssigning(null);
            setSelectedTeacher('');
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign teacher.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async (classId) => {
        if (!window.confirm('Remove teacher from this class?')) return;
        try {
            await classesApi.removeTeacher(classId);
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove teacher.');
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    // ── STUDENT VIEW ─────────────────────────────────────────────────────────
    if (isStudent) {
        // grades[0] has exactly one class when enrolled
        const myGrade = grades[0];
        const myClass = myGrade?.classes?.[0];
        const students = myClass?.students || [];

        return (
            <div className="classes-page">
                <div className="classes-header">
                    <div className="classes-header-title">
                        <GraduationCap size={28} />
                        <div>
                            <h1>My Class</h1>
                            <p>{myClass ? `${myGrade.name} – ${myClass.name}` : 'No class assigned yet'}</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="classes-error">
                        {error}
                        <button onClick={() => setError(null)}><X size={14} /></button>
                    </div>
                )}

                {!myClass ? (
                    // Unenrolled empty state
                    <div className="classes-empty-state">
                        <GraduationCap size={48} />
                        <h3>You haven't been assigned to a class yet</h3>
                        <p>An administrator will enrol you soon.</p>
                    </div>
                ) : (
                    <div className="student-class-wrapper">

                        {/* Hero card */}
                        <div className="student-class-hero">
                            <div className="hero-left">
                                <div className="hero-grade-badge">{myGrade.name}</div>
                                <h2 className="hero-class-name">{myClass.name}</h2>
                                {myClass.teacher ? (
                                    <div className="hero-teacher">
                                        <UserCheck size={15} />
                                        <span>Teacher: <strong>{myClass.teacher.username}</strong></span>
                                    </div>
                                ) : (
                                    <div className="hero-teacher no-teacher">
                                        <User size={15} />
                                        <span>No teacher assigned yet</span>
                                    </div>
                                )}
                                <div className="hero-students-count">
                                    <Users size={15} />
                                    <span>{students.length} student{students.length !== 1 ? 's' : ''} enrolled</span>
                                </div>
                            </div>
                            <button
                                className="hero-materials-btn"
                                onClick={() => navigate(`/classes/${myClass.id}/materials`)}
                            >
                                <BookOpen size={16} />
                                View Class Materials
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        {/* Classmates roster */}
                        <div className="classmates-card">
                            <div className="classmates-header">
                                <Users size={20} />
                                <h3>Classmates</h3>
                                <span className="classmates-count">{students.length}</span>
                            </div>
                            <div className="classmates-grid">
                                {students.map(s => (
                                    <div
                                        key={s.id}
                                        className={`classmate-chip ${s.id === user?.id ? 'classmate-self' : ''}`}
                                        title={s.id === user?.id ? `${s.username} (you)` : s.username}
                                    >
                                        <Avatar username={s.username} />
                                        <span className="classmate-name">
                                            {s.username}
                                            {s.id === user?.id && <em> (you)</em>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── ADMIN / TEACHER VIEW ─────────────────────────────────────────────────
    const totalClasses = grades.reduce((s, g) => s + (g.classes?.length || 0), 0);
    const teacherMode = serverIsTeacher && !isAdmin;

    return (
        <div className="classes-page">
            <div className="classes-header">
                <div className="classes-header-title">
                    <GraduationCap size={28} />
                    <div>
                        <h1>{teacherMode ? 'My Classes' : 'Classes'}</h1>
                        <p>
                            {teacherMode
                                ? `${totalClasses} class${totalClasses !== 1 ? 'es' : ''} assigned to you`
                                : `${totalClasses} classes across ${grades.length} grades`}
                        </p>
                    </div>
                </div>
            </div>

            {error && <div className="classes-error">{error}<button onClick={() => setError(null)}><X size={14} /></button></div>}

            {grades.length === 0 ? (
                <div className="classes-empty-state">
                    <GraduationCap size={48} />
                    {teacherMode ? (
                        <>
                            <h3>No classes assigned yet</h3>
                            <p>An administrator needs to assign you to classes first.</p>
                        </>
                    ) : (
                        <>
                            <h3>No grades found</h3>
                            <p>Create grades and classes in the Taxonomy page first.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="grades-list">
                    {grades.map(grade => (
                        <div key={grade.id} className={`grade-block ${expanded[grade.id] ? 'open' : ''}`}>
                            <button
                                className="grade-block-header"
                                onClick={() => toggleGrade(grade.id)}
                            >
                                <div className="grade-block-left">
                                    {expanded[grade.id]
                                        ? <ChevronDown size={18} />
                                        : <ChevronRight size={18} />}
                                    <span className="grade-block-name">{grade.name}</span>
                                    <span className={`grade-cat-badge cat-${grade.category?.toLowerCase()}`}>
                                        {grade.category}
                                    </span>
                                </div>
                                <span className="grade-class-count">
                                    {grade.classes?.length || 0} {grade.classes?.length === 1 ? 'class' : 'classes'}
                                </span>
                            </button>

                            {expanded[grade.id] && (
                                <div className="classes-panel">
                                    {grade.classes?.length === 0 ? (
                                        <p className="no-classes-msg">No classes yet — add them in the Taxonomy page.</p>
                                    ) : (
                                        <div className="classes-cards">
                                            {grade.classes.map(cls => (
                                                <div key={cls.id} className={`class-card ${teacherMode ? 'teacher-view' : ''}`}
                                                    onClick={() => navigate(`/classes/${cls.id}/materials`)}
                                                    style={{ cursor: 'pointer' }}
                                                    title={`View materials for ${cls.name}`}
                                                >
                                                    <div className="class-card-top">
                                                        <span className="class-name">
                                                            <BookOpen size={15} style={{ marginRight: 6, opacity: 0.6 }} />
                                                            {cls.name}
                                                        </span>
                                                        {teacherMode && (
                                                            <span className="teacher-badge self">
                                                                <UserCheck size={13} /> Your class
                                                            </span>
                                                        )}
                                                        {!teacherMode && cls.teacher && (
                                                            <span className="teacher-badge">
                                                                <UserCheck size={13} />
                                                                {cls.teacher.username}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {!teacherMode && (
                                                        <>
                                                            {cls.teacher ? (
                                                                <div className="teacher-info">
                                                                    <div>
                                                                        <span className="teacher-label">Teacher</span>
                                                                        <span className="teacher-name">{cls.teacher.username}</span>
                                                                        <span className="teacher-email">{cls.teacher.email}</span>
                                                                    </div>
                                                                    {isAdmin && (
                                                                        <button
                                                                            className="btn-remove-teacher"
                                                                            onClick={(e) => { e.stopPropagation(); handleRemove(cls.id); }}
                                                                            title="Remove teacher"
                                                                        >
                                                                            <X size={13} /> Remove
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="no-teacher">
                                                                    <User size={14} />
                                                                    <span>No teacher assigned</span>
                                                                </div>
                                                            )}

                                                            {isAdmin && assigning === cls.id ? (
                                                                <div className="assign-row" onClick={e => e.stopPropagation()}>
                                                                    <select
                                                                        value={selectedTeacher}
                                                                        onChange={e => setSelectedTeacher(e.target.value)}
                                                                        className="teacher-select"
                                                                    >
                                                                        <option value="">— Select teacher —</option>
                                                                        {teachers.map(t => (
                                                                            <option
                                                                                key={t.id}
                                                                                value={t.id}
                                                                                disabled={parseInt(t.class_count) >= 4 && t.id !== cls.teacher?.id}
                                                                            >
                                                                                {t.username} ({t.class_count}/4 classes)
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <button className="btn-save-assign" onClick={() => handleAssign(cls.id)} disabled={!selectedTeacher || isSaving}>
                                                                        {isSaving ? 'Saving...' : 'Assign'}
                                                                    </button>
                                                                    <button className="btn-cancel-assign" onClick={() => { setAssigning(null); setSelectedTeacher(''); }}>
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : isAdmin && (
                                                                <button
                                                                    className="btn-assign-teacher"
                                                                    onClick={(e) => { e.stopPropagation(); setAssigning(cls.id); setSelectedTeacher(''); }}
                                                                >
                                                                    <User size={13} />
                                                                    {cls.teacher ? 'Change Teacher' : 'Assign Teacher'}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
