import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taxonomyApi } from '../../api/taxonomyApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Plus, X, GraduationCap, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import './TaxonomyPage.css';

export const TaxonomyPage = () => {
    const navigate = useNavigate();
    const [grades, setGrades] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Expanded state: gradeId -> { open, classes, loading }
    const [expanded, setExpanded] = useState({});

    // Grade create modal
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [gradeForm, setGradeForm] = useState({ name: '', code: '', levelOrder: 0, category: 'K12', description: '', ageRange: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Class create state: gradeId -> name string
    const [newClassName, setNewClassName] = useState({});
    const [classSubmitting, setClassSubmitting] = useState({});

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const gradesRes = await taxonomyApi.getGrades();
            setGrades(gradesRes.data?.grades || []);
        } catch (err) {
            setError('Failed to load grades.');
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Grade expand / collapse ── */
    const toggleGrade = async (grade) => {
        const id = grade.id;
        if (expanded[id]?.open) {
            setExpanded(prev => ({ ...prev, [id]: { ...prev[id], open: false } }));
            return;
        }

        // Already fetched — just re-open
        if (expanded[id]?.classes) {
            setExpanded(prev => ({ ...prev, [id]: { ...prev[id], open: true } }));
            return;
        }

        setExpanded(prev => ({ ...prev, [id]: { open: true, classes: null, loading: true } }));
        try {
            const res = await taxonomyApi.getGradeClasses(id);
            setExpanded(prev => ({ ...prev, [id]: { open: true, classes: res.data?.classes || [], loading: false } }));
        } catch {
            setExpanded(prev => ({ ...prev, [id]: { open: true, classes: [], loading: false } }));
        }
    };

    const refreshClasses = async (gradeId) => {
        try {
            const res = await taxonomyApi.getGradeClasses(gradeId);
            setExpanded(prev => ({ ...prev, [gradeId]: { ...prev[gradeId], classes: res.data?.classes || [] } }));
        } catch { }
    };

    /* ── Class create ── */
    const handleAddClass = async (gradeId) => {
        const name = (newClassName[gradeId] || '').trim();
        if (!name) return;
        setClassSubmitting(prev => ({ ...prev, [gradeId]: true }));
        try {
            await taxonomyApi.createGradeClass(gradeId, name);
            setNewClassName(prev => ({ ...prev, [gradeId]: '' }));
            await refreshClasses(gradeId);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create class.');
        } finally {
            setClassSubmitting(prev => ({ ...prev, [gradeId]: false }));
        }
    };

    /* ── Class delete ── */
    const handleDeleteClass = async (gradeId, cls) => {
        if (!window.confirm(`Delete class "${cls.name}"?`)) return;
        try {
            await taxonomyApi.deleteGradeClass(gradeId, cls.id);
            await refreshClasses(gradeId);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete class.');
        }
    };

    /* ── Grade create ── */
    const handleCreateGrade = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await taxonomyApi.createGrade(gradeForm);
            setShowGradeModal(false);
            setGradeForm({ name: '', code: '', levelOrder: 0, category: 'K12', description: '', ageRange: '' });
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create grade.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ── Grade delete ── */
    const handleDeleteGrade = async (grade) => {
        if (!window.confirm(`Delete grade "${grade.name}"? This action cannot be undone.`)) return;
        try {
            await taxonomyApi.deleteGrade(grade.id);
            setError(null);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete grade.');
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="admin-page taxonomy-page">
            <div className="page-header">
                <div className="page-header-title">
                    <GraduationCap size={24} />
                    <h1>Grades</h1>
                    <span className="tab-count">{grades.length}</span>
                </div>
                <button className="btn-primary" onClick={() => setShowGradeModal(true)}>
                    <Plus size={16} /> Add Grade
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 32 }}></th>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Category</th>
                            <th>Order</th>
                            <th>Age Range</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {grades.length === 0 ? (
                            <tr><td colSpan={8} className="empty-cell">No grades yet</td></tr>
                        ) : grades.map(g => (
                            <React.Fragment key={g.id}>
                                {/* Grade row */}
                                <tr
                                    className={`grade-row ${expanded[g.id]?.open ? 'grade-row-open' : ''}`}
                                    onClick={() => toggleGrade(g)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>
                                        <span className="expand-icon">
                                            {expanded[g.id]?.open
                                                ? <ChevronDown size={16} />
                                                : <ChevronRight size={16} />}
                                        </span>
                                    </td>
                                    <td className="td-name">{g.name}</td>
                                    <td><span className="code-badge">{g.code}</span></td>
                                    <td>
                                        <span className={`category-badge cat-${g.category?.toLowerCase()}`}>
                                            {g.category}
                                        </span>
                                    </td>
                                    <td>{g.level_order}</td>
                                    <td>{g.age_range || '—'}</td>
                                    <td className="td-desc">{g.description || '—'}</td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <button
                                            className="btn-icon btn-icon-danger"
                                            onClick={() => handleDeleteGrade(g)}
                                            title="Delete grade"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>

                                {/* Expanded: classes */}
                                {expanded[g.id]?.open && (
                                    <tr className="classes-row">
                                        <td colSpan={8}>
                                            <div className="classes-panel">
                                                <div className="classes-header">
                                                    <span className="classes-title">Classes in {g.name}</span>
                                                </div>

                                                {expanded[g.id]?.loading ? (
                                                    <div className="classes-loading"><LoadingSpinner /></div>
                                                ) : (
                                                    <>
                                                        <div className="classes-list">
                                                            {(expanded[g.id]?.classes || []).length === 0 ? (
                                                                <span className="classes-empty">No classes yet — add one below</span>
                                                            ) : (expanded[g.id]?.classes || []).map(cls => (
                                                                <div
                                                                    key={cls.id}
                                                                    className="class-chip"
                                                                    onClick={() => navigate(`/materials?gradeId=${g.id}&class=${encodeURIComponent(cls.name)}`)}
                                                                    title={`View materials for ${cls.name}`}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <span>{cls.name}</span>
                                                                    <button
                                                                        className="class-chip-del"
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(g.id, cls); }}
                                                                        title="Remove class"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="add-class-row">
                                                            <input
                                                                type="text"
                                                                className="add-class-input"
                                                                placeholder={`e.g. ${g.code}-А or ${g.code}-В`}
                                                                value={newClassName[g.id] || ''}
                                                                onChange={e => setNewClassName(prev => ({ ...prev, [g.id]: e.target.value }))}
                                                                onKeyDown={e => { if (e.key === 'Enter') handleAddClass(g.id); }}
                                                            />
                                                            <button
                                                                className="add-class-btn"
                                                                onClick={() => handleAddClass(g.id)}
                                                                disabled={classSubmitting[g.id]}
                                                            >
                                                                <Plus size={14} />
                                                                {classSubmitting[g.id] ? 'Adding...' : 'Add Class'}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Grade create modal */}
            {showGradeModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create Grade</h3>
                            <button className="btn-close" onClick={() => setShowGradeModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGrade}>
                            <div className="modal-content">
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input type="text" required value={gradeForm.name}
                                        onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                                        placeholder="e.g. 9th Grade" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Code *</label>
                                        <input type="text" required value={gradeForm.code}
                                            onChange={(e) => setGradeForm({ ...gradeForm, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. G9" />
                                    </div>
                                    <div className="form-group">
                                        <label>Category *</label>
                                        <select required value={gradeForm.category}
                                            onChange={(e) => setGradeForm({ ...gradeForm, category: e.target.value })}>
                                            <option value="K12">K-12</option>
                                            <option value="UNDERGRADUATE">Undergraduate</option>
                                            <option value="GRADUATE">Graduate</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Level Order *</label>
                                        <input type="number" required value={gradeForm.levelOrder}
                                            onChange={(e) => setGradeForm({ ...gradeForm, levelOrder: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Age Range</label>
                                        <input type="text" value={gradeForm.ageRange}
                                            onChange={(e) => setGradeForm({ ...gradeForm, ageRange: e.target.value })}
                                            placeholder="e.g. 14-15" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea rows={2} value={gradeForm.description}
                                        onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowGradeModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Grade'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
