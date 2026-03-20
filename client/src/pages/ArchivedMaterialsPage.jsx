import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialsApi } from '../api/materialsApi';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Archive, RotateCcw, Trash2, FileText, Calendar, User } from 'lucide-react';
import { formatFileSize, formatDateTime } from '../utils/formatters';
import './ArchivedMaterialsPage.css';

const translations = {
    en: {
        pageTitle: "Archived Materials",
        subtitle: "Materials stored here are hidden from the main library. Restore or permanently delete them.",
        errLoad: "Failed to load archived materials.",
        successUnarchive: "Material restored to the main library.",
        errUnarchive: "Failed to unarchive material.",
        confirmDelete: "Permanently delete this material? This cannot be undone.",
        successDelete: "Material permanently deleted.",
        errDelete: "Failed to delete material.",
        emptyTitle: "No archived materials",
        emptyDesc: "When you archive a material it will appear here.",
        noDesc: "No description",
        unknown: "Unknown",
        restoreTitle: "Restore to library",
        restoring: "Restoring...",
        restoreBtn: "Restore",
        deleteTitle: "Permanently delete",
        viewTitle: "View material"
    },
    bg: {
        pageTitle: "Архивирани материали",
        subtitle: "Материалите, съхранявани тук, са скрити от основната библиотека. Възстановете или ги изтрийте завинаги.",
        errLoad: "Неуспешно зареждане на архивирани материали.",
        successUnarchive: "Материалът е възстановен в основната библиотека.",
        errUnarchive: "Неуспешно възстановяване на материала.",
        confirmDelete: "Да изтрия ли завинаги този материал? Това действие е необратимо.",
        successDelete: "Материалът е изтрит завинаги.",
        errDelete: "Неуспешно изтриване на материала.",
        emptyTitle: "Няма архивирани материали",
        emptyDesc: "Когато архивирате материал, той ще се появи тук.",
        noDesc: "Няма описание",
        unknown: "Неизвестен",
        restoreTitle: "Възстановяване в библиотеката",
        restoring: "Възстановяване...",
        restoreBtn: "Възстанови",
        deleteTitle: "Изтрий завинаги",
        viewTitle: "Преглед на материала"
    }
};

export const ArchivedMaterialsPage = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = translations[language];

    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadArchivedMaterials();
    }, []);

    const loadArchivedMaterials = async () => {
        setIsLoading(true);
        try {
            const response = await materialsApi.getArchivedMaterials();
            setMaterials(response.data?.materials || []);
        } catch (err) {
            console.error('Failed to load archived materials:', err);
            setMessage({ type: 'error', text: t.errLoad });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnarchive = async (id) => {
        setActionLoadingId(id);
        try {
            await materialsApi.unarchiveMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
            setMessage({ type: 'success', text: t.successUnarchive });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || t.errUnarchive });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.confirmDelete)) return;
        setActionLoadingId(id);
        try {
            await materialsApi.deleteMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
            setMessage({ type: 'success', text: t.successDelete });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || t.errDelete });
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="archived-page">
            <div className="archived-header">
                <div className="archived-header-icon">
                    <Archive size={28} />
                </div>
                <div>
                    <h1>{t.pageTitle}</h1>
                    <p>{t.subtitle}</p>
                </div>
            </div>

            {message && (
                <div className={`archived-message ${message.type}`}>
                    {message.text}
                    <button className="msg-dismiss" onClick={() => setMessage(null)}>✕</button>
                </div>
            )}

            {isLoading ? (
                <LoadingSpinner />
            ) : materials.length === 0 ? (
                <div className="archived-empty">
                    <Archive size={56} />
                    <h3>{t.emptyTitle}</h3>
                    <p>{t.emptyDesc}</p>
                </div>
            ) : (
                <div className="archived-list">
                    {materials.map(material => (
                        <div key={material.id} className="archived-card">
                            <div
                                className="archived-card-icon"
                                onClick={() => navigate(`/materials/${material.id}`)}
                                title={t.viewTitle}
                            >
                                <FileText size={24} />
                            </div>
                            <div className="archived-card-info" onClick={() => navigate(`/materials/${material.id}`)}>
                                <h3>{material.title}</h3>
                                <p className="archived-card-desc">
                                    {material.description
                                        ? material.description.substring(0, 100) + (material.description.length > 100 ? '…' : '')
                                        : t.noDesc}
                                </p>
                                <div className="archived-card-meta">
                                    <span><FileText size={13} /> {material.file_type?.split('/').pop()}</span>
                                    <span>{formatFileSize(material.file_size)}</span>
                                    <span><User size={13} /> {material.uploader_username || t.unknown}</span>
                                    <span><Calendar size={13} /> {formatDateTime(material.updated_at)}</span>
                                </div>
                            </div>
                            <div className="archived-card-actions">
                                <button
                                    className="btn-unarchive"
                                    onClick={() => handleUnarchive(material.id)}
                                    disabled={actionLoadingId === material.id}
                                    title={t.restoreTitle}
                                >
                                    <RotateCcw size={15} />
                                    {actionLoadingId === material.id ? t.restoring : t.restoreBtn}
                                </button>
                                <button
                                    className="btn-delete-archived"
                                    onClick={() => handleDelete(material.id)}
                                    disabled={actionLoadingId === material.id}
                                    title={t.deleteTitle}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
