import React, { useState, useEffect } from 'react';
import { taxonomyApi } from '../../api/taxonomyApi';
import { useLanguage } from '../../contexts/LanguageContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Plus, Trash2, Library, RefreshCw } from 'lucide-react';
import { translateSubjectName, translateSubjectCode } from '../../utils/formatters';
import './TopicsPage.css';

const translations = {
    en: {
        pageTitle: 'Themes / Topics',
        addTopic: 'Add Theme',
        refresh: 'Refresh',
        colSubj: 'Subject',
        colName: 'Theme Name',
        colDesc: 'Description',
        colActions: 'Actions',
        noTopics: 'No themes yet.',
        subjLabel: 'Subject *',
        selectSubj: '-- Select Subject --',
        nameLabel: 'Theme Name *',
        namePlaceholder: 'e.g. Algebra Basics',
        descLabel: 'Description',
        descPlaceholder: 'Optional description',
        cancel: 'Cancel',
        create: 'Create Theme',
        creating: 'Creating...',
        deleteConfirm: (n) => `Delete theme "${n}"? This cannot be undone.`,
        errLoad: 'Failed to load data.',
        errCreate: 'Failed to create theme.',
        errDelete: 'Failed to delete theme.',
        searchFiltersNote: 'Themes added here will appear as nested filters under Subjects on the Materials page.',
    },
    bg: {
        pageTitle: 'Теми / Уроци',
        addTopic: 'Добавяне на тема',
        refresh: 'Опресни',
        colSubj: 'Предмет',
        colName: 'Име на темата',
        colDesc: 'Описание',
        colActions: 'Действия',
        noTopics: 'Все още няма теми.',
        subjLabel: 'Предмет *',
        selectSubj: '-- Избери Предмет --',
        nameLabel: 'Име на темата *',
        namePlaceholder: 'напр. Основи на алгебрата',
        descLabel: 'Описание',
        descPlaceholder: 'По желание',
        cancel: 'Отказ',
        create: 'Създай тема',
        creating: 'Създаване...',
        deleteConfirm: (n) => `Изтриване на тема "${n}"? Не може да бъде отменено.`,
        errLoad: 'Неуспешно зареждане на данни.',
        errCreate: 'Неуспешно създаване на тема.',
        errDelete: 'Неуспешно изтриване на тема.',
        searchFiltersNote: 'Темите, добавени тук, ще се появят като вложени филтри под Предмети на страницата с материали.',
    }
};

export const TopicsPage = () => {
    const { language } = useLanguage();
    const confirm = useConfirm();
    const t = translations[language];

    const [topics, setTopics] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({ subjectId: '', name: '', description: '' });
    const [formError, setFormError] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [topRes, subjRes] = await Promise.all([
                taxonomyApi.getTopics(),
                taxonomyApi.getSubjects()
            ]);
            setTopics(topRes.data?.topics || []);
            setSubjects(subjRes.data?.subjects || []);
        } catch {
            setError(t.errLoad);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.subjectId || !form.name.trim()) {
            setFormError('Subject and Name are required.');
            return;
        }
        setIsSaving(true);
        try {
            await taxonomyApi.createTopic({
                subjectId: parseInt(form.subjectId),
                name: form.name.trim(),
                description: form.description.trim() || undefined
            });
            setForm({ subjectId: '', name: '', description: '' });
            setShowForm(false);
            await load();
        } catch (err) {
            setFormError(err.response?.data?.message || t.errCreate);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (topic) => {
        const confirmed = await confirm({
            message: t.deleteConfirm(topic.topic_name || topic.name),
            isDanger: true
        });
        if (!confirmed) return;
        try {
            await taxonomyApi.deleteTopic(topic.id);
            await load();
        } catch {
            setError(t.errDelete);
        }
    };

    return (
        <div className="tp-page">
            <div className="tp-header">
                <div>
                    <h1>{t.pageTitle}</h1>
                    <p className="tp-note">{t.searchFiltersNote}</p>
                </div>
                <div className="tp-header-actions">
                    <button className="tp-refresh-btn" onClick={load} disabled={isLoading}><RefreshCw size={15}/> {t.refresh}</button>
                    <button className="tp-add-btn" onClick={() => { setShowForm(v => !v); setFormError(''); }}>
                        <Plus size={15}/> {t.addTopic}
                    </button>
                </div>
            </div>

            {error && <div className="tp-error">{error}</div>}

            {/* Create form */}
            {showForm && (
                <div className="tp-form-card">
                    <form onSubmit={handleCreate} className="tp-form">
                        {formError && <div className="tp-form-error">{formError}</div>}
                        
                        <div className="tp-form-row">
                            <div className="tp-field tp-field--subj">
                                <label>{t.subjLabel}</label>
                                <select 
                                    value={form.subjectId} 
                                    onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                                    disabled={isSaving}
                                    required
                                >
                                    <option value="">{t.selectSubj}</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{translateSubjectName(s.name, language)} ({translateSubjectCode(s.code, language)})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="tp-field">
                                <label>{t.nameLabel}</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder={t.namePlaceholder}
                                    disabled={isSaving}
                                    required
                                />
                            </div>
                        </div>

                        <div className="tp-form-row">
                            <div className="tp-field">
                                <label>{t.descLabel}</label>
                                <input
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder={t.descPlaceholder}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        <div className="tp-form-footer">
                            <button type="button" className="tp-cancel-btn" onClick={() => setShowForm(false)} disabled={isSaving}>
                                {t.cancel}
                            </button>
                            <button type="submit" className="tp-create-btn" disabled={isSaving || !form.subjectId}>
                                <Plus size={14}/> {isSaving ? t.creating : t.create}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            {isLoading ? (
                <div className="tp-loading"><LoadingSpinner /></div>
            ) : topics.length === 0 ? (
                <div className="tp-empty">
                    <Library size={48} strokeWidth={1.2}/>
                    <p>{t.noTopics}</p>
                </div>
            ) : (
                <div className="tp-table-container">
                    <table className="tp-table">
                        <thead>
                            <tr>
                                <th>{t.colSubj}</th>
                                <th>{t.colName}</th>
                                <th>{t.colDesc}</th>
                                <th>{t.colActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topics.map(tData => (
                                <tr key={tData.id}>
                                    <td>
                                        <span className="tp-subj-badge">
                                            {translateSubjectName(tData.subject_name, language)}
                                        </span>
                                    </td>
                                    <td><strong>{tData.topic_name || tData.name}</strong></td>
                                    <td className="tp-muted">{tData.topic_description || tData.description || '—'}</td>
                                    <td>
                                        <button
                                            className="tp-delete-btn"
                                            onClick={() => handleDelete(tData)}
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
