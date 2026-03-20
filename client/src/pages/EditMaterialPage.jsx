import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { materialsApi } from '../api/materialsApi';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Save, X, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import { formatFileSize } from '../utils/formatters';
import './UploadMaterialPage.css'; // Reuse upload styles

const translations = {
    en: {
        pageTitle: "Edit Material",
        subtitle: "Update material details and visibility",
        backToDetails: "Back to Details",
        titleLabel: "Title *",
        descLabel: "Description",
        currentFile: "Current File",
        fileHint: "File cannot be changed in edit mode",
        makePublic: "Make Public",
        publicDesc: "Allow all users to view and download this material",
        cancel: "Cancel",
        saving: "Saving...",
        saveChanges: "Save Changes",
        errNoTitle: "Please enter a title for the material.",
        errLoadDetails: "Failed to load material details.",
        errUpdateFail: "Failed to update material. Please try again."
    },
    bg: {
        pageTitle: "Редактиране на материал",
        subtitle: "Обновете детайлите и видимостта на материала",
        backToDetails: "Назад към детайлите",
        titleLabel: "Заглавие *",
        descLabel: "Описание",
        currentFile: "Текущ файл",
        fileHint: "Файлът не може да бъде променян в режим на редакция",
        makePublic: "Публичен",
        publicDesc: "Позволете на всички потребители да преглеждат и изтеглят този материал",
        cancel: "Отказ",
        saving: "Запазване...",
        saveChanges: "Запазване на промените",
        errNoTitle: "Моля, въведете заглавие на материала.",
        errLoadDetails: "Неуспешно зареждане на детайлите за материала.",
        errUpdateFail: "Неуспешно обновяване на материала. Моля, опитайте отново."
    }
};

export const EditMaterialPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { language } = useLanguage();
    const t = translations[language];

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        is_public: true
    });

    const [fileInfo, setFileInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadMaterial();
    }, [id]);

    const loadMaterial = async () => {
        setIsLoading(true);
        try {
            const response = await materialsApi.getMaterialById(id);
            const material = response.data?.material || response.data;

            // Verify ownership
            if (user && material.uploaded_by !== user.id && user.role !== 'admin') {
                navigate('/materials');
                return;
            }

            setFormData({
                title: material.title,
                description: material.description || '',
                is_public: material.is_public
            });

            setFileInfo({
                name: material.file_name,
                size: material.file_size,
                type: material.file_type
            });
        } catch (err) {
            console.error('Failed to load material:', err);
            setError(t.errLoadDetails);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) {
            setError(t.errNoTitle);
            return;
        }

        setIsSaving(true);

        try {
            await materialsApi.updateMaterial(id, formData);
            navigate(`/materials/${id}`);
        } catch (err) {
            console.error('Update failed:', err);
            setError(err.response?.data?.message || t.errUpdateFail);
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="upload-page">
            <div className="upload-container">
                <button onClick={() => navigate(`/materials/${id}`)} className="back-link">
                    <ArrowLeft size={16} /> {t.backToDetails}
                </button>

                <h1>{t.pageTitle}</h1>
                <p className="subtitle">{t.subtitle}</p>

                {error && (
                    <div className="error-alert">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="upload-form">
                    <div className="form-group">
                        <label htmlFor="title">{t.titleLabel}</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            disabled={isSaving}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">{t.descLabel}</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={4}
                            disabled={isSaving}
                        />
                    </div>

                    <div className="form-group">
                        <label>{t.currentFile}</label>
                        <div className="selected-file">
                            <div className="file-info">
                                <FileText size={24} className="file-icon" />
                                <div>
                                    <p className="file-name">{fileInfo?.name}</p>
                                    <p className="file-size">{formatFileSize(fileInfo?.size)}</p>
                                </div>
                            </div>
                            <span className="file-hint">{t.fileHint}</span>
                        </div>
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="is_public"
                                checked={formData.is_public}
                                onChange={handleInputChange}
                                disabled={isSaving}
                            />
                            <span className="checkbox-text">
                                <span className="checkbox-title">{t.makePublic}</span>
                                <span className="checkbox-desc">{t.publicDesc}</span>
                            </span>
                        </label>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => navigate(`/materials/${id}`)}
                            disabled={isSaving}
                        >
                            {t.cancel}
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <LoadingSpinner size="small" color="white" />
                                    <span>{t.saving}</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>{t.saveChanges}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
