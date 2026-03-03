import React, { useState, useEffect } from 'react';
import { classesApi } from '../api/classesApi';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { GraduationCap, User, ChevronDown, ChevronRight, X, UserCheck } from 'lucide-react';
import './ClassesPage.css';

export const ClassesPage = () => {
    const { hasRole } = useAuth();
    const isAdmin = hasRole('admin');

    const [grades, setGrades] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState({});

    // Which class is being assigned right now
    const [assigning, setAssigning] = useState(null); // classId
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

    const totalClasses = grades.reduce((s, g) => s + (g.classes?.length || 0), 0);

    return (
        <div className="classes-page">
            <div className="classes-header">
                <div className="classes-header-title">
                    <GraduationCap size={28} />
                    <div>
                        <h1>Classes</h1>
                        <p>{totalClasses} classes across {grades.length} grades</p>
                    </div>
                </div>
            </div>

            {error && <div className="classes-error">{error}<button onClick={() => setError(null)}><X size={14} /></button></div>}

            {grades.length === 0 ? (
                <div className="classes-empty-state">
                    <GraduationCap size={48} />
                    <h3>No grades found</h3>
                    <p>Create grades and classes in the Taxonomy page first.</p>
                </div>
            ) : (
                <div className="grades-list">
                    {grades.map(grade => (
                        <div key={grade.id} className={`grade-block ${expanded[grade.id] ? 'open' : ''}`}>
                            {/* Grade header row */}
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

                            {/* Classes */}
                            {expanded[grade.id] && (
                                <div className="classes-panel">
                                    {grade.classes?.length === 0 ? (
                                        <p className="no-classes-msg">No classes yet — add them in the Taxonomy page.</p>
                                    ) : (
                                        <div className="classes-cards">
                                            {grade.classes.map(cls => (
                                                <div key={cls.id} className="class-card">
                                                    <div className="class-card-top">
                                                        <span className="class-name">{cls.name}</span>
                                                        {cls.teacher && (
                                                            <span className="teacher-badge">
                                                                <UserCheck size={13} />
                                                                {cls.teacher.username}
                                                            </span>
                                                        )}
                                                    </div>

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
                                                                    onClick={() => handleRemove(cls.id)}
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
                                                        <div className="assign-row">
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
                                                            <button
                                                                className="btn-save-assign"
                                                                onClick={() => handleAssign(cls.id)}
                                                                disabled={!selectedTeacher || isSaving}
                                                            >
                                                                {isSaving ? 'Saving...' : 'Assign'}
                                                            </button>
                                                            <button
                                                                className="btn-cancel-assign"
                                                                onClick={() => { setAssigning(null); setSelectedTeacher(''); }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : isAdmin && (
                                                        <button
                                                            className="btn-assign-teacher"
                                                            onClick={() => { setAssigning(cls.id); setSelectedTeacher(''); }}
                                                        >
                                                            <User size={13} />
                                                            {cls.teacher ? 'Change Teacher' : 'Assign Teacher'}
                                                        </button>
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
