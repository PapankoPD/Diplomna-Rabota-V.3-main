import React, { useState, useEffect } from 'react';
import Object from 'react'; // For formatting if needed
import apiClient from '../../api/apiClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Key, Plus, Trash2, Copy, Check, RefreshCw } from 'lucide-react';
import './TeacherCodesPage.css';

const translations = {
    en: {
        pageTitle: "Teacher Registration Codes",
        available: "available",
        used: "used",
        refresh: "Refresh",
        generating: "Generating...",
        generateCode: "Generate Code",
        emptyState: "No codes yet. Generate one above.",
        availableCodes: "Available Codes",
        usedCodes: "Used Codes",
        createdBy: "Created by",
        system: "system",
        expires: "Expires",
        copyCodeTitle: "Copy code",
        copied: "Copied!",
        copy: "Copy",
        deleteCodeTitle: "Delete code",
        deleteRecordTitle: "Delete record",
        usedBy: "Used by",
        confirmDelete: "Delete this code?",
        errLoad: "Failed to load codes.",
        errGenerate: "Failed to generate code.",
        errDelete: "Failed to delete code."
    },
    bg: {
        pageTitle: "Кодове за регистрация на учители",
        available: "налични",
        used: "използвани",
        refresh: "Обновяване",
        generating: "Генериране...",
        generateCode: "Генериране на код",
        emptyState: "Все още няма кодове. Генерирайте един по-горе.",
        availableCodes: "Налични кодове",
        usedCodes: "Използвани кодове",
        createdBy: "Създаден от",
        system: "системата",
        expires: "Изтича на",
        copyCodeTitle: "Копиране на кода",
        copied: "Копиран!",
        copy: "Копирай",
        deleteCodeTitle: "Изтриване на кода",
        deleteRecordTitle: "Изтриване на записа",
        usedBy: "Използван от",
        confirmDelete: "Да изтрия ли този код?",
        errLoad: "Неуспешно зареждане на кодове.",
        errGenerate: "Неуспешно генериране на код.",
        errDelete: "Неуспешно изтриване на код."
    }
};

export const TeacherCodesPage = () => {
    const { language } = useLanguage();
    const t = translations[language];

    const [codes, setCodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(null);

    useEffect(() => { loadCodes(); }, []);

    const loadCodes = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/admin/teacher-codes');
            setCodes(res.data.data?.codes || []);
        } catch (e) {
            setError(t.errLoad);
        } finally {
            setIsLoading(false);
        }
    };

    const generateCode = async () => {
        setIsGenerating(true);
        try {
            await apiClient.post('/admin/teacher-codes', {});
            await loadCodes();
        } catch (e) {
            setError(t.errGenerate);
        } finally {
            setIsGenerating(false);
        }
    };

    const deleteCode = async (id) => {
        if (!window.confirm(t.confirmDelete)) return;
        try {
            await apiClient.delete(`/admin/teacher-codes/${id}`);
            setCodes(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            setError(t.errDelete);
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(code);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    const unused = codes.filter(c => !c.is_used);
    const used = codes.filter(c => c.is_used);

    return (
        <div className="admin-page tcp-page">
            <div className="tcp-header">
                <div className="tcp-header-left">
                    <Key size={26} className="tcp-icon" />
                    <div>
                        <h1>{t.pageTitle}</h1>
                        <p>{unused.length} {t.available} · {used.length} {t.used}</p>
                    </div>
                </div>
                <div className="tcp-header-actions">
                    <button className="btn-refresh" onClick={loadCodes} title={t.refresh}>
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn-generate" onClick={generateCode} disabled={isGenerating}>
                        <Plus size={16} />
                        {isGenerating ? t.generating : t.generateCode}
                    </button>
                </div>
            </div>

            {error && (
                <div className="tcp-error">{error} <button onClick={() => setError(null)}>✕</button></div>
            )}

            {codes.length === 0 ? (
                <div className="tcp-empty">
                    <Key size={40} />
                    <p>{t.emptyState}</p>
                </div>
            ) : (
                <>
                    {unused.length > 0 && (
                        <section className="tcp-section">
                            <h2 className="tcp-section-title">{t.availableCodes}</h2>
                            <div className="tcp-codes-grid">
                                {unused.map(c => (
                                    <div key={c.id} className="tcp-code-card available">
                                        <div className="tcp-code-value">{c.code}</div>
                                        <div className="tcp-code-meta">
                                            {t.createdBy} {c.created_by_username || t.system} · {new Date(c.created_at).toLocaleDateString()}
                                            {c.expires_at && ` · ${t.expires} ${new Date(c.expires_at).toLocaleDateString()}`}
                                        </div>
                                        <div className="tcp-code-actions">
                                            <button
                                                className="btn-copy"
                                                onClick={() => copyCode(c.code)}
                                                title={t.copyCodeTitle}
                                            >
                                                {copied === c.code ? <Check size={14} /> : <Copy size={14} />}
                                                {copied === c.code ? t.copied : t.copy}
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => deleteCode(c.id)}
                                                title={t.deleteCodeTitle}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {used.length > 0 && (
                        <section className="tcp-section">
                            <h2 className="tcp-section-title">{t.usedCodes}</h2>
                            <div className="tcp-codes-grid">
                                {used.map(c => (
                                    <div key={c.id} className="tcp-code-card used">
                                        <div className="tcp-code-value">{c.code}</div>
                                        <div className="tcp-code-meta">
                                            {t.usedBy} <strong>{c.used_by_username || '?'}</strong>
                                        </div>
                                        <div className="tcp-code-actions">
                                            <button
                                                className="btn-delete"
                                                onClick={() => deleteCode(c.id)}
                                                title={t.deleteRecordTitle}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};
