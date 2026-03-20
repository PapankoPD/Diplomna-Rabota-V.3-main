import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taxonomyApi } from '../../api/taxonomyApi';
import { useLanguage } from '../../contexts/LanguageContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Plus, X, GraduationCap, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { translateGradeName } from '../../utils/formatters';
import './TaxonomyPage.css';

const translations = {
    en: {
        pageTitle: "Grades",
        addGrade: "Add Grade",
        colName: "Name",
        colCode: "Code",
        colCategory: "Category",
        colOrder: "Order",
        colAgeRange: "Age Range",
        colDesc: "Description",
        colActions: "Actions",
        noGrades: "No grades yet",
        deleteGradeConfirm: (name) => `Delete grade "${name}"? This action cannot be undone.`,
        classesIn: (name) => `Classes in ${name}`,
        noClassesYet: "No classes yet — add one below",
        viewMaterials: (name) => `View materials for ${name}`,
        removeClass: "Remove class",
        placeholderClass: (code) => `e.g. ${code}-A or ${code}-B`,
        adding: "Adding...",
        addClass: "Add Class",
        createGradeTitle: "Create Grade",
        nameLabel: "Name *",
        namePlaceholder: "e.g. 9th Grade",
        codeLabel: "Code *",
        codePlaceholder: "e.g. G9",
        categoryLabel: "Category *",
        catK12: "K-12",
        catUndergrad: "Undergraduate",
        catGrad: "Graduate",
        orderLabel: "Level Order *",
        ageRangeLabel: "Age Range",
        ageRangePlaceholder: "e.g. 14-15",
        descLabel: "Description",
        cancel: "Cancel",
        creating: "Creating...",
        createGradeBtn: "Create Grade",
        deleteGradeBtn: "Delete grade",
        deleteClassConfirm: (name) => `Delete class "${name}"?`,
        errLoadGrades: "Failed to load grades.",
        errCreateClass: "Failed to create class.",
        errDeleteClass: "Failed to delete class.",
        errCreateGrade: "Failed to create grade.",
        errDeleteGrade: "Failed to delete grade."
    },
    bg: {
        pageTitle: "Класове",
        addGrade: "Добавяне на клас",
        colName: "Име",
        colCode: "Код",
        colCategory: "Категория",
        colOrder: "Подредба",
        colAgeRange: "Възрастова група",
        colDesc: "Описание",
        colActions: "Действия",
        noGrades: "Все още няма класове",
        deleteGradeConfirm: (name) => `Изтриване на клас "${name}"? Това действие не може да бъде отменено.`,
        classesIn: (name) => `Паралелки в ${name}`,
        noClassesYet: "Все още няма паралелки — добавете по-долу",
        viewMaterials: (name) => `Преглед на материали за ${name}`,
        removeClass: "Премахване на паралелка",
        placeholderClass: (code) => `напр. ${code}-А или ${code}-Б`,
        adding: "Добавяне...",
        addClass: "Добавяне на паралелка",
        createGradeTitle: "Създаване на клас",
        nameLabel: "Име *",
        namePlaceholder: "напр. 9-ти клас",
        codeLabel: "Код *",
        codePlaceholder: "напр. 9",
        categoryLabel: "Категория *",
        catK12: "К-12",
        catUndergrad: "Бакалавър",
        catGrad: "Магистър",
        orderLabel: "Поредност *",
        ageRangeLabel: "Възрастова група",
        ageRangePlaceholder: "напр. 15-16",
        descLabel: "Описание",
        cancel: "Отказ",
        creating: "Създаване...",
        createGradeBtn: "Създаване на клас",
        deleteGradeBtn: "Изтриване на клас",
        deleteClassConfirm: (name) => `Изтриване на паралелка "${name}"?`,
        errLoadGrades: "Неуспешно зареждане на класове.",
        errCreateClass: "Неуспешно създаване на паралелка.",
        errDeleteClass: "Неуспешно изтриване на паралелка.",
        errCreateGrade: "Неуспешно създаване на клас.",
        errDeleteGrade: "Неуспешно изтриване на клас."
    }
};

export const TaxonomyPage = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const confirm = useConfirm();
    const t = translations[language];

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
            setError(t.errLoadGrades);
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
            setError(err.response?.data?.message || t.errCreateClass);
        } finally {
            setClassSubmitting(prev => ({ ...prev, [gradeId]: false }));
        }
    };

    /* ── Class delete ── */
    const handleDeleteClass = async (gradeId, cls) => {
        const confirmed = await confirm({
            message: t.deleteClassConfirm(cls.name),
            isDanger: true
        });
        if (!confirmed) return;
        try {
            await taxonomyApi.deleteGradeClass(gradeId, cls.id);
            await refreshClasses(gradeId);
        } catch (err) {
            setError(err.response?.data?.message || t.errDeleteClass);
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
            setError(err.response?.data?.message || t.errCreateGrade);
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ── Grade delete ── */
    const handleDeleteGrade = async (grade) => {
        const confirmed = await confirm({
            message: t.deleteGradeConfirm(grade.name),
            isDanger: true
        });
        if (!confirmed) return;
        try {
            await taxonomyApi.deleteGrade(grade.id);
            setError(null);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || t.errDeleteGrade);
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="admin-page taxonomy-page">
            <div className="page-header">
                <div className="page-header-title">
                    <GraduationCap size={24} />
                    <h1>{t.pageTitle}</h1>
                    <span className="tab-count">{grades.length}</span>
                </div>
                <button className="btn-primary" onClick={() => setShowGradeModal(true)}>
                    <Plus size={16} /> {t.addGrade}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 32 }}></th>
                            <th>{t.colName}</th>
                            <th>{t.colCode}</th>
                            <th>{t.colCategory}</th>
                            <th>{t.colOrder}</th>
                            <th>{t.colAgeRange}</th>
                            <th>{t.colDesc}</th>
                            <th>{t.colActions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {grades.length === 0 ? (
                            <tr><td colSpan={8} className="empty-cell">{t.noGrades}</td></tr>
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
                                    <td className="td-name">{translateGradeName(g.name, language)}</td>
                                    <td><span className="code-badge">{g.code}</span></td>
                                    <td>
                                        <span className={`category-badge cat-${g.category?.toLowerCase()}`}>
                                            {g.category === 'K12' ? t.catK12 : g.category === 'UNDERGRADUATE' ? t.catUndergrad : g.category === 'GRADUATE' ? t.catGrad : g.category}
                                        </span>
                                    </td>
                                    <td>{g.level_order}</td>
                                    <td>{g.age_range || '—'}</td>
                                    <td className="td-desc">{g.description || '—'}</td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <button
                                            className="btn-icon btn-icon-danger"
                                            onClick={() => handleDeleteGrade(g)}
                                            title={t.deleteGradeBtn}
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
                                                    <span className="classes-title">{t.classesIn(g.name)}</span>
                                                </div>

                                                {expanded[g.id]?.loading ? (
                                                    <div className="classes-loading"><LoadingSpinner /></div>
                                                ) : (
                                                    <>
                                                        <div className="classes-list">
                                                            {(expanded[g.id]?.classes || []).length === 0 ? (
                                                                <span className="classes-empty">{t.noClassesYet}</span>
                                                            ) : (expanded[g.id]?.classes || []).map(cls => (
                                                                <div
                                                                    key={cls.id}
                                                                    className="class-chip"
                                                                    onClick={() => navigate(`/materials?gradeId=${g.id}&class=${encodeURIComponent(cls.name)}`)}
                                                                    title={t.viewMaterials(cls.name)}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <span>{cls.name}</span>
                                                                    <button
                                                                        className="class-chip-del"
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(g.id, cls); }}
                                                                        title={t.removeClass}
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
                                                                placeholder={t.placeholderClass(g.code)}
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
                                                                {classSubmitting[g.id] ? t.adding : t.addClass}
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
                            <h3>{t.createGradeTitle}</h3>
                        </div>
                        <form onSubmit={handleCreateGrade}>
                            <div className="modal-content">
                                <div className="form-group">
                                    <label>{t.nameLabel}</label>
                                    <input type="text" required value={gradeForm.name}
                                        onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                                        placeholder={t.namePlaceholder} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t.codeLabel}</label>
                                        <input type="text" required value={gradeForm.code}
                                            onChange={(e) => setGradeForm({ ...gradeForm, code: e.target.value.toUpperCase() })}
                                            placeholder={t.codePlaceholder} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.categoryLabel}</label>
                                        <select required value={gradeForm.category}
                                            onChange={(e) => setGradeForm({ ...gradeForm, category: e.target.value })}>
                                            <option value="K12">{t.catK12}</option>
                                            <option value="UNDERGRADUATE">{t.catUndergrad}</option>
                                            <option value="GRADUATE">{t.catGrad}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t.orderLabel}</label>
                                        <input type="number" required value={gradeForm.levelOrder}
                                            onChange={(e) => setGradeForm({ ...gradeForm, levelOrder: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.ageRangeLabel}</label>
                                        <input type="text" value={gradeForm.ageRange}
                                            onChange={(e) => setGradeForm({ ...gradeForm, ageRange: e.target.value })}
                                            placeholder={t.ageRangePlaceholder} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t.descLabel}</label>
                                    <textarea rows={2} value={gradeForm.description}
                                        onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowGradeModal(false)}>{t.cancel}</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? t.creating : t.createGradeBtn}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
