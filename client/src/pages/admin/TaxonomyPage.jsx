import React, { useState, useEffect } from 'react';
import { taxonomyApi } from '../../api/taxonomyApi';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Plus, X, BookOpen, Tag, GraduationCap, Trash2 } from 'lucide-react';
import './TaxonomyPage.css';

const TABS = [
    { key: 'subjects', label: 'Subjects', icon: BookOpen },
    { key: 'topics', label: 'Topics', icon: Tag },
    { key: 'grades', label: 'Grades', icon: GraduationCap }
];

export const TaxonomyPage = () => {
    const { hasRole } = useAuth();
    const [activeTab, setActiveTab] = useState('subjects');
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [grades, setGrades] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Form states
    const [subjectForm, setSubjectForm] = useState({ name: '', code: '', description: '', icon: '', displayOrder: 0 });
    const [topicForm, setTopicForm] = useState({ subjectId: '', name: '', code: '', description: '', parentTopicId: '', difficultyLevel: '', displayOrder: 0 });
    const [gradeForm, setGradeForm] = useState({ name: '', code: '', levelOrder: 0, category: 'K12', description: '', ageRange: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [subjectsRes, topicsRes, gradesRes] = await Promise.all([
                taxonomyApi.getSubjects(),
                taxonomyApi.getTopics(),
                taxonomyApi.getGrades()
            ]);
            setSubjects(subjectsRes.data?.subjects || []);
            setTopics(topicsRes.data?.topics || []);
            setGrades(gradesRes.data?.grades || []);
        } catch (err) {
            console.error('Failed to load taxonomy:', err);
            setError('Failed to load taxonomy data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await taxonomyApi.createSubject(subjectForm);
            setShowModal(false);
            setSubjectForm({ name: '', code: '', description: '', icon: '', displayOrder: 0 });
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create subject.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateTopic = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const data = {
                subjectId: parseInt(topicForm.subjectId),
                name: topicForm.name,
                code: topicForm.code,
                description: topicForm.description || undefined,
                displayOrder: parseInt(topicForm.displayOrder) || 0
            };
            if (topicForm.parentTopicId) data.parentTopicId = parseInt(topicForm.parentTopicId);
            if (topicForm.difficultyLevel) data.difficultyLevel = parseInt(topicForm.difficultyLevel);
            await taxonomyApi.createTopic(data);
            setShowModal(false);
            setTopicForm({ subjectId: '', name: '', code: '', description: '', parentTopicId: '', difficultyLevel: '', displayOrder: 0 });
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create topic.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateGrade = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await taxonomyApi.createGrade(gradeForm);
            setShowModal(false);
            setGradeForm({ name: '', code: '', levelOrder: 0, category: 'K12', description: '', ageRange: '' });
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create grade.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSubject = async (subject) => {
        if (!window.confirm(`Delete subject "${subject.name}"? This action cannot be undone.`)) return;
        try {
            await taxonomyApi.deleteSubject(subject.id);
            setError(null);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete subject.');
        }
    };

    const handleDeleteTopic = async (topic) => {
        if (!window.confirm(`Delete topic "${topic.topic_name}"? This action cannot be undone.`)) return;
        try {
            await taxonomyApi.deleteTopic(topic.id);
            setError(null);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete topic.');
        }
    };

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
                <h1>Taxonomy Management</h1>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add {activeTab === 'subjects' ? 'Subject' : activeTab === 'topics' ? 'Topic' : 'Grade'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="taxonomy-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`taxonomy-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        <span className="tab-count">
                            {tab.key === 'subjects' ? subjects.length : tab.key === 'topics' ? topics.length : grades.length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Subjects Table */}
            {activeTab === 'subjects' && (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Description</th>
                                <th>Icon</th>
                                <th>Order</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.length === 0 ? (
                                <tr><td colSpan={6} className="empty-cell">No subjects yet</td></tr>
                            ) : subjects.map(s => (
                                <tr key={s.id}>
                                    <td className="td-name">{s.name}</td>
                                    <td><span className="code-badge">{s.code}</span></td>
                                    <td className="td-desc">{s.description || '—'}</td>
                                    <td>{s.icon || '—'}</td>
                                    <td>{s.display_order}</td>
                                    <td>
                                        <button
                                            className="btn-icon btn-icon-danger"
                                            onClick={() => handleDeleteSubject(s)}
                                            title="Delete subject"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Topics Table */}
            {activeTab === 'topics' && (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Topic Name</th>
                                <th>Code</th>
                                <th>Subject</th>
                                <th>Parent Topic</th>
                                <th>Difficulty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topics.length === 0 ? (
                                <tr><td colSpan={6} className="empty-cell">No topics yet</td></tr>
                            ) : topics.map(t => (
                                <tr key={t.id}>
                                    <td className="td-name">{t.topic_name}</td>
                                    <td><span className="code-badge">{t.topic_code}</span></td>
                                    <td>{t.subject_name}</td>
                                    <td>{t.parent_topic_name || '—'}</td>
                                    <td>
                                        {t.difficulty_level ? (
                                            <span className={`difficulty-badge level-${t.difficulty_level}`}>
                                                Level {t.difficulty_level}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        <button
                                            className="btn-icon btn-icon-danger"
                                            onClick={() => handleDeleteTopic(t)}
                                            title="Delete topic"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Grades Table */}
            {activeTab === 'grades' && (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
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
                                <tr><td colSpan={7} className="empty-cell">No grades yet</td></tr>
                            ) : grades.map(g => (
                                <tr key={g.id}>
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
                                    <td>
                                        <button
                                            className="btn-icon btn-icon-danger"
                                            onClick={() => handleDeleteGrade(g)}
                                            title="Delete grade"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                {activeTab === 'subjects' ? 'Create Subject' :
                                    activeTab === 'topics' ? 'Create Topic' : 'Create Grade'}
                            </h3>
                            <button className="btn-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {activeTab === 'subjects' && (
                            <form onSubmit={handleCreateSubject}>
                                <div className="modal-content">
                                    <div className="form-group">
                                        <label>Name *</label>
                                        <input type="text" required value={subjectForm.name}
                                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                                            placeholder="e.g. Mathematics" />
                                    </div>
                                    <div className="form-group">
                                        <label>Code *</label>
                                        <input type="text" required value={subjectForm.code}
                                            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. MATH" />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea rows={2} value={subjectForm.description}
                                            onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                                            placeholder="Brief description" />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Icon (emoji)</label>
                                            <input type="text" value={subjectForm.icon}
                                                onChange={(e) => setSubjectForm({ ...subjectForm, icon: e.target.value })}
                                                placeholder="📐" />
                                        </div>
                                        <div className="form-group">
                                            <label>Display Order</label>
                                            <input type="number" value={subjectForm.displayOrder}
                                                onChange={(e) => setSubjectForm({ ...subjectForm, displayOrder: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? 'Creating...' : 'Create Subject'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'topics' && (
                            <form onSubmit={handleCreateTopic}>
                                <div className="modal-content">
                                    <div className="form-group">
                                        <label>Subject *</label>
                                        <select required value={topicForm.subjectId}
                                            onChange={(e) => setTopicForm({ ...topicForm, subjectId: e.target.value })}>
                                            <option value="">Select subject...</option>
                                            {subjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Name *</label>
                                        <input type="text" required value={topicForm.name}
                                            onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                                            placeholder="e.g. Algebra" />
                                    </div>
                                    <div className="form-group">
                                        <label>Code *</label>
                                        <input type="text" required value={topicForm.code}
                                            onChange={(e) => setTopicForm({ ...topicForm, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. ALG" />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea rows={2} value={topicForm.description}
                                            onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })} />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Parent Topic (optional)</label>
                                            <select value={topicForm.parentTopicId}
                                                onChange={(e) => setTopicForm({ ...topicForm, parentTopicId: e.target.value })}>
                                                <option value="">None (top-level)</option>
                                                {topics.filter(t => t.subject_id?.toString() === topicForm.subjectId).map(t => (
                                                    <option key={t.id} value={t.id}>{t.topic_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Difficulty (1-5)</label>
                                            <input type="number" min="1" max="5" value={topicForm.difficultyLevel}
                                                onChange={(e) => setTopicForm({ ...topicForm, difficultyLevel: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? 'Creating...' : 'Create Topic'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'grades' && (
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
                                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? 'Creating...' : 'Create Grade'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
