import React, { useState, useEffect } from 'react';
import { taxonomyApi } from '../../api/taxonomyApi';
import { usersApi } from '../../api/usersApi';
import { useLanguage } from '../../contexts/LanguageContext';
import { School, Plus, Trash2, AlertCircle, Users, X, UserMinus } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './AdminClassesPage.css';

// Letters available for classes
const CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const translations = {
    en: {
        pageTitle: "Manage Classes (Grades 8-12)",
        selectGrade: "Select Grade",
        classesForGrade: "Classes for Selected Grade",
        classLetter: "Class Letter",
        addClass: "Add Class",
        noClasses: "No classes found for this grade. Add one above.",
        manageStudents: "Manage Students",
        deleteClassTitle: "Delete class",
        managingStudents: (name) => `Managing Students: ${name}`,
        managingStudentsDesc: "Add or remove students from this class.",
        enrolled: (count) => `Enrolled (${count})`,
        noStudentsEnrolled: "No students enrolled in this class.",
        removeStudentTitle: "Remove student",
        addStudents: "Add Students",
        searchPlaceholder: "Search by username or email...",
        noUnassigned: "No unassigned students found.",
        enrollStudentTitle: "Enroll student",
        addBtn: "Add",
        confirmDeleteClass: "Are you sure you want to delete this class? This action cannot be undone.",
        errLoadGrades: "Failed to load grades.",
        errLoadClasses: "Failed to load classes for this grade.",
        errCreateClass: "Failed to create class.",
        errDeleteClass: "Failed to delete class.",
        errLoadStudents: "Failed to load class students.",
        errEnroll: "Failed to enroll student.",
        errUnenroll: "Failed to unenroll student."
    },
    bg: {
        pageTitle: "Управление на класовете (8-12 клас)",
        selectGrade: "Избор на клас",
        classesForGrade: "Паралелки за избрания клас",
        classLetter: "Буква на паралелката",
        addClass: "Добавяне на паралелка",
        noClasses: "Няма намерени паралелки за този клас. Добавете една по-горе.",
        manageStudents: "Управление на ученици",
        deleteClassTitle: "Изтриване на паралелка",
        managingStudents: (name) => `Управление на ученици: ${name}`,
        managingStudentsDesc: "Добавяне или премахване на ученици от тази паралелка.",
        enrolled: (count) => `Записани (${count})`,
        noStudentsEnrolled: "Няма записани ученици в тази паралелка.",
        removeStudentTitle: "Премахване на ученик",
        addStudents: "Добавяне на ученици",
        searchPlaceholder: "Търсене по потребителско име или имейл...",
        noUnassigned: "Няма намерени незаписани ученици.",
        enrollStudentTitle: "Записване на ученик",
        addBtn: "Добави",
        confirmDeleteClass: "Сигурни ли сте, че искате да изтриете тази паралелка? Това действие не може да бъде отменено.",
        errLoadGrades: "Неуспешно зареждане на класове.",
        errLoadClasses: "Неуспешно зареждане на паралелки за този клас.",
        errCreateClass: "Неуспешно създаване на паралелка.",
        errDeleteClass: "Неуспешно изтриване на паралелка.",
        errLoadStudents: "Неуспешно зареждане на учениците от паралелката.",
        errEnroll: "Неуспешно записване на ученик.",
        errUnenroll: "Неуспешно отписване на ученик."
    }
};

export const AdminClassesPage = () => {
    const { language } = useLanguage();
    const t = translations[language];

    const [grades, setGrades] = useState([]);
    const [selectedGradeId, setSelectedGradeId] = useState('');
    const [selectedGradeCode, setSelectedGradeCode] = useState('');

    const [classes, setClasses] = useState([]);
    const [selectedLetter, setSelectedLetter] = useState('A');

    const [isLoadingGrades, setIsLoadingGrades] = useState(true);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Student Management State
    const [managingClass, setManagingClass] = useState(null);
    const [classStudents, setClassStudents] = useState([]);
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Fetch grades on mount, strictly filter to grades 8 through 12
    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const response = await taxonomyApi.getGrades();
                if (response.success) {
                    const allowedCodes = ['8', '9', '10', '11', '12'];
                    const filteredGrades = response.data.grades.filter(grade =>
                        allowedCodes.includes(grade.code)
                    );
                    setGrades(filteredGrades);
                    // Auto-select the first grade
                    if (filteredGrades.length > 0) {
                        setSelectedGradeId(String(filteredGrades[0].id));
                        setSelectedGradeCode(filteredGrades[0].code);
                    }
                }
            } catch (err) {
                console.error('Failed to load grades:', err);
                setError(t.errLoadGrades);
            } finally {
                setIsLoadingGrades(false);
            }
        };

        fetchGrades();
    }, []);

    // Fetch classes when a grade is selected
    useEffect(() => {
        if (!selectedGradeId) {
            setClasses([]);
            return;
        }

        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const response = await taxonomyApi.getGradeClasses(selectedGradeId);
                if (response.success) {
                    setClasses(response.data.classes);
                }
            } catch (err) {
                console.error('Failed to fetch classes:', err);
                setError(t.errLoadClasses);
            } finally {
                setIsLoadingClasses(false);
            }
        };

        fetchClasses();
    }, [selectedGradeId]);

    const handleGradeChange = (e) => {
        const gradeId = e.target.value;
        const grade = grades.find(g => String(g.id) === gradeId);
        setSelectedGradeId(gradeId);
        setSelectedGradeCode(grade ? grade.code : '');
        setSelectedLetter('A');
        setManagingClass(null);
    };

    const handleAddClass = async (e) => {
        e.preventDefault();
        if (!selectedGradeId || !selectedLetter) return;

        // Build the class name from grade code + letter, e.g. "8-A"
        const className = `${selectedGradeCode}-${selectedLetter}`;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await taxonomyApi.createGradeClass(selectedGradeId, className);
            if (response.success) {
                setClasses(prev => [...prev, response.data.class].sort((a, b) => a.name.localeCompare(b.name)));
                setSelectedLetter('A');
            }
        } catch (err) {
            setError(err.response?.data?.message || t.errCreateClass);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClass = async (classId) => {
        if (!window.confirm(t.confirmDeleteClass)) {
            return;
        }

        setError(null);
        try {
            await taxonomyApi.deleteGradeClass(selectedGradeId, classId);
            setClasses(prev => prev.filter(c => c.id !== classId));
            if (managingClass?.id === classId) {
                setManagingClass(null);
            }
        } catch (err) {
            setError(err.response?.data?.message || t.errDeleteClass);
        }
    };

    const openManageStudents = async (cls) => {
        setManagingClass(cls);
        setError(null);
        loadStudents(cls.id);
        loadUnassignedStudents('');
        setStudentSearch('');
    };

    const closeManageStudents = () => {
        setManagingClass(null);
        setClassStudents([]);
        setUnassignedStudents([]);
        setStudentSearch('');
    };

    const loadStudents = async (classId) => {
        setIsLoadingStudents(true);
        try {
            const res = await taxonomyApi.getClassStudents(selectedGradeId, classId);
            setClassStudents(res.data?.students || []);
        } catch (err) {
            setError(t.errLoadStudents);
        } finally {
            setIsLoadingStudents(false);
        }
    };

    const loadUnassignedStudents = async (searchStr) => {
        try {
            const res = await usersApi.getUnassignedStudents(searchStr);
            setUnassignedStudents(res.data?.students || []);
        } catch (err) {
            console.error('Failed to load unassigned students:', err);
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setStudentSearch(val);
        // Debounce simple form or just search
        setTimeout(() => {
            if (val === e.target.value) {
                loadUnassignedStudents(val);
            }
        }, 300);
    };

    const handleEnrollStudent = async (studentId) => {
        if (!managingClass) return;
        setIsActionLoading(true);
        setError(null);
        try {
            await taxonomyApi.enrollStudent(selectedGradeId, managingClass.id, studentId);
            loadStudents(managingClass.id);
            loadUnassignedStudents(studentSearch);
        } catch (err) {
            setError(err.response?.data?.message || t.errEnroll);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUnenrollStudent = async (studentId) => {
        if (!managingClass) return;
        setIsActionLoading(true);
        setError(null);
        try {
            await taxonomyApi.unenrollStudent(selectedGradeId, managingClass.id, studentId);
            loadStudents(managingClass.id);
            loadUnassignedStudents(studentSearch);
        } catch (err) {
            setError(err.response?.data?.message || t.errUnenroll);
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoadingGrades) {
        return <LoadingSpinner fullPage />;
    }

    return (
        <div className="admin-classes-page">
            <div className="admin-header">
                <h1>{t.pageTitle}</h1>
            </div>

            {error && (
                <div className="error-alert">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <div className="content-card">
                <div className="grade-selector">
                    <label htmlFor="gradeSelect">{t.selectGrade}</label>
                    <select
                        id="gradeSelect"
                        className="form-select"
                        value={selectedGradeId}
                        onChange={handleGradeChange}
                    >
                        {grades.map(grade => (
                            <option key={grade.id} value={grade.id}>
                                {grade.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedGradeId && !managingClass && (
                    <div className="classes-manager">
                        <h3>{t.classesForGrade}</h3>

                        <form onSubmit={handleAddClass} className="add-class-form">
                            <div className="form-group">
                                <label htmlFor="classLetter">{t.classLetter}</label>
                                <select
                                    id="classLetter"
                                    value={selectedLetter}
                                    onChange={(e) => setSelectedLetter(e.target.value)}
                                    disabled={isSubmitting}
                                    className="form-select"
                                >
                                    {CLASS_LETTERS.map(letter => (
                                        <option key={letter} value={letter}>
                                            {selectedGradeCode}-{letter}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="btn-add"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <LoadingSpinner size="small" color="white" /> : <Plus size={18} />}
                                {t.addClass}
                            </button>
                        </form>

                        {isLoadingClasses ? (
                            <LoadingSpinner />
                        ) : classes.length === 0 ? (
                            <div className="no-data">
                                <p>{t.noClasses}</p>
                            </div>
                        ) : (
                            <div className="classes-list">
                                {classes.map(cls => (
                                    <div key={cls.id} className="class-item">
                                        <div className="class-info">
                                            <div className="class-icon">
                                                <School size={20} />
                                            </div>
                                            <h4 className="class-name">{cls.name}</h4>
                                        </div>
                                        <div className="class-actions" style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn-manage-students"
                                                onClick={() => openManageStudents(cls)}
                                                style={{ padding: '8px 12px', background: 'var(--gray-100)', borderRadius: '6px', border: '1px solid var(--gray-300)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <Users size={16} /> {t.manageStudents}
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDeleteClass(cls.id)}
                                                title={t.deleteClassTitle}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Manage Students Panel */}
                {managingClass && (
                    <div className="students-manager">
                        <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{t.managingStudents(managingClass.name)}</h3>
                                <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: '14px' }}>{t.managingStudentsDesc}</p>
                            </div>
                            <button onClick={closeManageStudents} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--gray-500)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="manager-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Current Students List */}
                            <div className="current-students" style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t.enrolled(classStudents.length)}</h4>
                                {isLoadingStudents ? (
                                    <LoadingSpinner size="small" />
                                ) : classStudents.length === 0 ? (
                                    <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>{t.noStudentsEnrolled}</p>
                                ) : (
                                    <div className="student-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {classStudents.map(student => (
                                            <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '6px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{student.username}</div>
                                                    <div style={{ color: 'var(--gray-500)', fontSize: '12px' }}>{student.email}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnenrollStudent(student.id)}
                                                    disabled={isActionLoading}
                                                    title={t.removeStudentTitle}
                                                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    <UserMinus size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add Students Section */}
                            <div className="add-students" style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t.addStudents}</h4>
                                <input
                                    type="text"
                                    placeholder={t.searchPlaceholder}
                                    value={studentSearch}
                                    onChange={handleSearchChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--gray-300)', marginBottom: '16px' }}
                                />
                                
                                <div className="student-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '344px', overflowY: 'auto' }}>
                                    {unassignedStudents.length === 0 ? (
                                        <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>{t.noUnassigned}</p>
                                    ) : (
                                        unassignedStudents.map(student => (
                                            <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', border: '1px solid var(--gray-200)', borderRadius: '6px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{student.username}</div>
                                                    <div style={{ color: 'var(--gray-500)', fontSize: '12px' }}>{student.email}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleEnrollStudent(student.id)}
                                                    disabled={isActionLoading}
                                                    title={t.enrollStudentTitle}
                                                    style={{ background: 'var(--primary-color)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                                                >
                                                    {t.addBtn}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
