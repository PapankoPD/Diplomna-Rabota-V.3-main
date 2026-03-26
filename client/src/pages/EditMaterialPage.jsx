import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { materialsApi } from '../api/materialsApi';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Save, X, AlertCircle, FileText, ArrowLeft, Eye, ChevronDown, Check, Lock, Upload } from 'lucide-react';
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
        errUpdateFail: "Failed to update material. Please try again.",
        newFileLabel: "Upload New Version (Optional)",
        newFileDesc: "Select a new file to replace the current one. This will create a new version in the history.",
        changeFile: "Change File",
        makePublic: "Make Public",
        publicDesc: "Allow all users to view and download this material",
        cancel: "Cancel",
        saving: "Saving...",
        saveChanges: "Save Changes",
        errNoTitle: "Please enter a title for the material.",
        errLoadDetails: "Failed to load material details.",
        visibilityOptions: "Visibility Options",
        privateOption: "Private",
        privateDesc: "Visible only to assigned class students",
        forEveryone: "For Everyone",
        forEveryoneDesc: "Upload without class restriction — visible to all students"
    },
    bg: {
        pageTitle: "Редактиране на материал",
        subtitle: "Обновете детайлите и видимостта на материала",
        backToDetails: "Назад към детайлите",
        titleLabel: "Заглавие *",
        descLabel: "Описание",
        currentFile: "Текущ файл",
        errUpdateFail: "Неуспешно обновяване на материала. Моля, опитайте отново.",
        newFileLabel: "Качете нова версия (по избор)",
        newFileDesc: "Изберете нов файл, за да замените текущия. Това ще създаде нова версия в историята.",
        changeFile: "Промяна на файл",
        makePublic: "Публичен",
        publicDesc: "Позволете на всички потребители да преглеждат и изтеглят този материал",
        cancel: "Отказ",
        saving: "Запазване...",
        saveChanges: "Запазване на промените",
        errNoTitle: "Моля, въведете заглавие на материала.",
        errLoadDetails: "Неуспешно зареждане на детайлите за материала.",
        visibilityOptions: "Опции за видимост",
        privateOption: "Частен",
        privateDesc: "Видим само за учениците от разпределения клас",
        forEveryone: "За всички",
        forEveryoneDesc: "Качване без ограничение на клас — видимо за всички ученици"
    }
};

export const EditMaterialPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const { language } = useLanguage();
    const t = translations[language];

    const isTeacher = hasRole('teacher');
    const isAdmin = hasRole('admin');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        is_public: true,
        for_everyone: false,
        is_private: false
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [fileInfo, setFileInfo] = useState(null);
    const [newFile, setNewFile] = useState(null);
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
                is_public: material.is_public,
                for_everyone: false, // Cannot infer securely since we don't return class_id reliably
                is_private: false
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewFile(file);
        }
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
            const submitData = new FormData();
            submitData.append('title', formData.title.trim());
            submitData.append('description', formData.description);

            if (formData.is_private) {
                submitData.append('isPublic', false);
                submitData.append('forEveryone', true); // Forces backend to remove class_id links so no student can view it
            } else {
                submitData.append('isPublic', formData.is_public);
                if (formData.for_everyone) submitData.append('forEveryone', formData.for_everyone);
            }
            
            if (newFile) {
                submitData.append('file', newFile);
            }

            await materialsApi.updateMaterial(id, submitData);
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
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="file-upload">{t.newFileLabel}</label>
                        <div className={`file-drop-area ${newFile ? 'has-file' : ''}`}>
                            <input
                                type="file"
                                id="file-upload"
                                onChange={handleFileChange}
                                disabled={isSaving}
                                className="file-input-hidden"
                            />
                            <div className="drop-area-content">
                                {newFile ? (
                                    <div className="selected-file-preview">
                                        <FileText size={32} />
                                        <div className="file-details">
                                            <p className="name">{newFile.name}</p>
                                            <p className="size">{formatFileSize(newFile.size)}</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="change-file-btn"
                                            onClick={() => document.getElementById('file-upload').click()}
                                        >
                                            {t.changeFile}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <FileText size={32} />
                                        <p>{t.newFileDesc}</p>
                                        <button 
                                            type="button" 
                                            className="btn-browse"
                                            onClick={() => document.getElementById('file-upload').click()}
                                        >
                                            {t.changeFile}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="visibility-dropdown-container" ref={dropdownRef}>
                        <button
                            type="button"
                            className="btn-visibility-toggle"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isSaving}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {formData.is_private ? (
                                    <><Lock size={18} /> <span>{t.privateOption}</span></>
                                ) : formData.for_everyone ? (
                                    <><Upload size={18} /> <span>{t.forEveryone}</span></>
                                ) : (
                                    <><Eye size={18} /> <span>{t.makePublic}</span></>
                                )}
                            </div>
                            <ChevronDown size={18} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>

                        {isDropdownOpen && (
                            <div className="visibility-dropdown-menu">
                                <button
                                    type="button"
                                    className={`dropdown-item ${formData.is_private ? 'active' : ''}`}
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            is_public: false,
                                            for_everyone: false,
                                            is_private: true
                                        }));
                                    }}
                                    disabled={isSaving}
                                >
                                    <div className="dropdown-item-icon"><Lock size={18} /></div>
                                    <div className="dropdown-item-content">
                                        <div className="dropdown-item-title">{t.privateOption}</div>
                                        <div className="dropdown-item-desc">{t.privateDesc}</div>
                                    </div>
                                    {formData.is_private && <Check size={18} className="check-icon" />}
                                </button>

                                <button
                                    type="button"
                                    className={`dropdown-item ${formData.is_public && !formData.is_private ? 'active' : ''}`}
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, is_public: true, is_private: false }));
                                    }}
                                    disabled={isSaving}
                                >
                                    <div className="dropdown-item-icon"><Eye size={18} /></div>
                                    <div className="dropdown-item-content">
                                        <div className="dropdown-item-title">{t.makePublic}</div>
                                        <div className="dropdown-item-desc">{t.publicDesc}</div>
                                    </div>
                                    {formData.is_public && !formData.is_private && <Check size={18} className="check-icon" />}
                                </button>

                                {(isTeacher || isAdmin) && (
                                    <button
                                        type="button"
                                        className={`dropdown-item ${formData.for_everyone && !formData.is_private ? 'active' : ''}`}
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                for_everyone: true,
                                                is_private: false
                                            }));
                                        }}
                                        disabled={isSaving}
                                    >
                                        <div className="dropdown-item-icon"><Upload size={18} /></div>
                                        <div className="dropdown-item-content">
                                            <div className="dropdown-item-title">{t.forEveryone}</div>
                                            <div className="dropdown-item-desc">{t.forEveryoneDesc}</div>
                                        </div>
                                        {formData.for_everyone && <Check size={18} className="check-icon" />}
                                    </button>
                                )}
                            </div>
                        )}
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
