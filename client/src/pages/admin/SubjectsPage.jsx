import React, { useState, useEffect } from 'react';
import { taxonomyApi } from '../../api/taxonomyApi';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Plus, Trash2, BookOpen, RefreshCw } from 'lucide-react';
import './SubjectsPage.css';

const translations = {
    en: {
        pageTitle: 'Subjects',
        addSubject: 'Add Subject',
        refresh: 'Refresh',
        colName: 'Name',
        colCode: 'Code',
        colDesc: 'Description',
        colOrder: 'Order',
        colActions: 'Actions',
        noSubjects: 'No subjects yet.',
        nameLabel: 'Name *',
        namePlaceholder: 'e.g. Mathematics',
        codeLabel: 'Code *',
        codePlaceholder: 'e.g. MATH',
        descLabel: 'Description',
        descPlaceholder: 'Optional description',
        orderLabel: 'Display Order',
        cancel: 'Cancel',
        create: 'Create Subject',
        creating: 'Creating...',
        deleteConfirm: (n) => `Delete subject "${n}"? This cannot be undone.`,
        errLoad: 'Failed to load subjects.',
        errCreate: 'Failed to create subject.',
        errDelete: 'Failed to delete subject.',
        searchFiltersNote: 'Subjects added here will automatically appear as filters on the Materials page.',
    },
    bg: {
        pageTitle: 'Предмети',
        addSubject: 'Добавяне на предмет',
        refresh: 'Опресни',
        colName: 'Име',
        colCode: 'Код',
        colDesc: 'Описание',
        colOrder: 'Ред',
        colActions: 'Действия',
        noSubjects: 'Все още няма предмети.',
        nameLabel: 'Име *',
        namePlaceholder: 'напр. Математика',
        codeLabel: 'Код *',
        codePlaceholder: 'напр. MATH',
        descLabel: 'Описание',
        descPlaceholder: 'По желание',
        orderLabel: 'Ред на показване',
        cancel: 'Отказ',
        create: 'Създай предмет',
        creating: 'Създаване...',
        deleteConfirm: (n) => `Изтриване на предмет "${n}"? Не може да бъде отменено.`,
        errLoad: 'Неуспешно зареждане на предмети.',
        errCreate: 'Неуспешно създаване на предмет.',
        errDelete: 'Неуспешно изтриване на предмет.',
        searchFiltersNote: 'Предметите, добавени тук, автоматично ще се появят като филтри на страницата с материали.',
    }
};

export const SubjectsPage = () => {
    const { language } = useLanguage();
    const t = translations[language];

    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({ name: '', code: '', description: '', displayOrder: 0 });
    const [formError, setFormError] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await taxonomyApi.getSubjects();
            setSubjects(res.data?.subjects || []);
        } catch {
            setError(t.errLoad);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.name.trim() || !form.code.trim()) {
            setFormError('Name and Code are required.');
            return;
        }
        setIsSaving(true);
        try {
            await taxonomyApi.createSubject({
                name: form.name.trim(),
                code: form.code.trim().toUpperCase(),
                description: form.description.trim() || undefined,
                displayOrder: parseInt(form.displayOrder) || 0,
            });
            setForm({ name: '', code: '', description: '', displayOrder: 0 });
            setShowForm(false);
            await load();
        } catch (err) {
            setFormError(err.response?.data?.message || t.errCreate);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (subject) => {
        if (!window.confirm(t.deleteConfirm(subject.name))) return;
        try {
            await taxonomyApi.deleteSubject(subject.id);
            await load();
        } catch {
            setError(t.errDelete);
        }
    };

    return (
        <div className="sp-page">
            <div className="sp-header">
                <div>
                    <h1>{t.pageTitle}</h1>
                    <p className="sp-note">{t.searchFiltersNote}</p>
                </div>
                <div className="sp-header-actions">
                    <button className="sp-refresh-btn" onClick={load}><RefreshCw size={15}/> {t.refresh}</button>
                    <button className="sp-add-btn" onClick={() => { setShowForm(v => !v); setFormError(''); }}>
                        <Plus size={15}/> {t.addSubject}
                    </button>
                </div>
            </div>

            {error && <div className="sp-error">{error}</div>}

            {/* Create form */}
            {showForm && (
                <div className="sp-form-card">
                    <form onSubmit={handleCreate} className="sp-form">
                        {formError && <div className="sp-form-error">{formError}</div>}
                        <div className="sp-form-row">
                            <div className="sp-field">
                                <label>{t.nameLabel}</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder={t.namePlaceholder}
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="sp-field sp-field--sm">
                                <label>{t.codeLabel}</label>
                                <input
                                    value={form.code}
                                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                    placeholder={t.codePlaceholder}
                                    style={{ letterSpacing: '0.1em', fontWeight: 700 }}
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="sp-field sp-field--xs">
                                <label>{t.orderLabel}</label>
                                <input
                                    type="number"
                                    value={form.displayOrder}
                                    onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value }))}
                                    disabled={isSaving}
                                    min={0}
                                />
                            </div>
                        </div>
                        <div className="sp-field">
                            <label>{t.descLabel}</label>
                            <input
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder={t.descPlaceholder}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="sp-form-footer">
                            <button type="button" className="sp-cancel-btn" onClick={() => setShowForm(false)} disabled={isSaving}>
                                {t.cancel}
                            </button>
                            <button type="submit" className="sp-create-btn" disabled={isSaving}>
                                <Plus size={14}/> {isSaving ? t.creating : t.create}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            {isLoading ? (
                <div className="sp-loading"><LoadingSpinner /></div>
            ) : subjects.length === 0 ? (
                <div className="sp-empty">
                    <BookOpen size={48} strokeWidth={1.2}/>
                    <p>{t.noSubjects}</p>
                </div>
            ) : (
                <div className="sp-table-container">
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th>{t.colName}</th>
                                <th>{t.colCode}</th>
                                <th>{t.colDesc}</th>
                                <th>{t.colOrder}</th>
                                <th>{t.colActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.map(s => (
                                <tr key={s.id}>
                                    <td><strong>{s.name}</strong></td>
                                    <td><span className="sp-code-badge">{s.code}</span></td>
                                    <td className="sp-muted">{s.description || '—'}</td>
                                    <td className="sp-muted">{s.display_order ?? 0}</td>
                                    <td>
                                        <button
                                            className="sp-delete-btn"
                                            onClick={() => handleDelete(s)}
                                            title="Delete"
                                        >
                                            <Trash2 size={15}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
