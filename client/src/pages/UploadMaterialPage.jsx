import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialsApi } from '../api/materialsApi';
import { taxonomyApi } from '../api/taxonomyApi';
import { authApi } from '../api/authApi';
import apiClient from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Upload, X, FileText, AlertCircle, BookOpen, Eye, ChevronDown, Check, Lock } from 'lucide-react';
import { validateFileSize, validateFileType, ACCEPTED_FILE_TYPES } from '../utils/validators';
import { formatFileSize, translateGradeName, translateSubjectName } from '../utils/formatters';
import './UploadMaterialPage.css';

const translations = {
    en: {
        pageTitle: "Upload Material",
        subtitle: "Share learning resources with your students",
        titleLabel: "Title",
        titleOptional: "(optional for batch)",
        titlePlaceholderBatch: "Leave blank to use file names as titles",
        titlePlaceholderSingle: "e.g., Introduction to React",
        descLabel: "Description",
        descPlaceholder: "Brief description of the material content...",
        subjectLabel: "Subject / Category",
        loadingSubjects: "Loading subjects...",
        noSubjects: "You have no subjects assigned. Please contact an administrator.",
        selectSubject: "Select a subject...",
        gradeLabel: "Grade",
        loadingGrades: "Loading grades...",
        noGrades: "No grades found.",
        selectGrade: "Select a grade...",
        classLabel: "Class",
        loadingClasses: "Loading classes...",
        noClassesForGrade: "No classes found for this grade.",
        selectClass: "Select a class...",
        filesLabel: "Files",
        dragDrop: "Drag & drop your files here",
        or: "or",
        browseBtn: "Browse Files",
        fileHint: "Max 10 files, 50MB each • PDF, Word, PowerPoint, images, videos, archives, APK",
        fileSelected: "file selected",
        filesSelected: "files selected",
        clearAll: "Clear all",
        uploading: "Uploading...",
        makePublic: "Make Public",
        publicDesc: "Allow all users to view and download this material",
        forEveryone: "For Everyone",
        forEveryoneDesc: "Upload without class restriction — visible to all students",
        cancel: "Cancel",
        uploadBtn: "Upload",
        material: "Material",
        materials: "Materials",
        errMaxFiles: "Maximum 10 files per upload. Extra files were ignored.",
        errNoFiles: "Please select at least one file to upload.",
        errNoTitle: "Please enter a title for the material.",
        errUploadFail: "Failed to upload material. Please try again.",
        visibilityOptions: "Visibility Options",
        privateDesc: "Visible only to assigned class students",
        topicLabel: "Topic",
        selectTopic: "Select a topic...",
        loadingTopics: "Loading topics...",
        noTopics: "No topics found for this subject."
    },
    bg: {
        pageTitle: "Качване на материал",
        subtitle: "Споделете учебни ресурси с вашите ученици",
        titleLabel: "Заглавие",
        titleOptional: "(по избор за групово качване)",
        titlePlaceholderBatch: "Оставете празно, за да използвате имената на файловете като заглавие",
        titlePlaceholderSingle: "напр. Въведение в React",
        descLabel: "Описание",
        descPlaceholder: "Кратко описание на съдържанието на материала...",
        subjectLabel: "Предмет",
        loadingSubjects: "Зареждане на предмети...",
        noSubjects: "Нямате разпределени предмети. Моля, свържете се с администратор.",
        selectSubject: "Изберете предмет...",
        gradeLabel: "Клас",
        loadingGrades: "Зареждане на класове...",
        noGrades: "Не са намерени класове.",
        selectGrade: "Изберете клас...",
        classLabel: "Паралелка",
        loadingClasses: "Зареждане на паралелки...",
        noClassesForGrade: "Не са намерени паралелки за този клас.",
        selectClass: "Изберете паралелка...",
        filesLabel: "Файлове",
        dragDrop: "Влачете и пуснете файловете си тук",
        or: "или",
        browseBtn: "Избор на файлове",
        fileHint: "Макс. 10 файла, 50MB всеки • PDF, Word, PowerPoint, изображения, видео, архиви, APK",
        fileSelected: "избран файл",
        filesSelected: "избрани файла",
        clearAll: "Изчисти всички",
        uploading: "Качване...",
        makePublic: "Публичен",
        publicDesc: "Позволете на всички потребители да преглеждат и изтеглят този материал",
        forEveryone: "За всички",
        forEveryoneDesc: "Качване без ограничение на клас — видимо за всички ученици",
        cancel: "Отказ",
        uploadBtn: "Качване",
        material: "Материал",
        materials: "Материала",
        errMaxFiles: "Максимум 10 файла на качване. Допълнителните файлове бяха игнорирани.",
        errNoFiles: "Моля, изберете поне един файл за качване.",
        errNoTitle: "Моля, въведете заглавие на материала.",
        errUploadFail: "Неуспешно качване на материала. Моля, опитайте отново.",
        visibilityOptions: "Опции за видимост",
        privateDesc: "Видим само за учениците от разпределения клас",
        topicLabel: "Тема/Урок",
        selectTopic: "Изберете тема...",
        loadingTopics: "Зареждане на теми...",
        noTopics: "Няма намерени теми за този предмет."
    }
};

export const UploadMaterialPage = () => {
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const { language } = useLanguage();
    const t = translations[language];

    const isTeacher = hasRole('teacher');
    const isAdmin = hasRole('admin');
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        is_public: true,
        category_id: '',
        topic_id: '',
        grade_id: '',
        class_id: '',
        is_private: false
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [categories, setCategories] = useState([]);
    const [teacherSubjects, setTeacherSubjects] = useState(null);
    const [teacherGrades, setTeacherGrades] = useState(null);
    const [teacherClasses, setTeacherClasses] = useState(null); // null = loading
    const [subjectTopics, setSubjectTopics] = useState(null);

    React.useEffect(() => {
        const fetchCategories = async () => {
            try {
                if (isTeacher || isAdmin) {
                    const [subjRes, classRes, gradesRes] = await Promise.all([
                        authApi.getMySubjects(),
                        taxonomyApi.getAllClasses(),
                        taxonomyApi.getGrades()
                    ]);
                    setTeacherSubjects(subjRes.data?.subjects || []);
                    
                    const allGrades = gradesRes.data?.grades || [];
                    const allowedGrades = ['8', '9', '10', '11', '12'];
                    const filteredGrades = allGrades.filter(g => allowedGrades.includes(g.code));
                    setTeacherGrades(filteredGrades);
                    
                    const classes = classRes.data?.classes || [];
                    const mappedClasses = classes.map(c => ({ id: c.id, label: c.name, grade_id: c.grade_id }));
                    setTeacherClasses(mappedClasses);
                } else {
                    const response = await taxonomyApi.getSubjects();
                    if (response.success) setCategories(response.data.subjects);
                }
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        };
        fetchCategories();
    }, [isTeacher, isAdmin]);

    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [dragCounter, setDragCounter] = useState(0);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragIn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(prev => prev + 1);
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setDragActive(true);
        }
    };

    const handleDragOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(prev => prev - 1);
        if (dragCounter <= 1) {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        setDragCounter(0);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            validateAndAddFiles(droppedFiles);
        }
    };

    const onButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            validateAndAddFiles(selectedFiles);
        }
        // Reset the input so the same files can be re-selected
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const validateAndAddFiles = (newFiles) => {
        setError(null);

        const validFiles = [];
        const errors = [];

        for (const file of newFiles) {
            // Validate file type
            const typeValidation = validateFileType(file.name);
            if (!typeValidation.isValid) {
                errors.push(`${file.name}: ${typeValidation.message}`);
                continue;
            }

            // Validate file size
            const sizeValidation = validateFileSize(file.size);
            if (!sizeValidation.isValid) {
                errors.push(`${file.name}: ${sizeValidation.message}`);
                continue;
            }

            validFiles.push(file);
        }

        if (errors.length > 0) {
            setError(errors.join('\n'));
        }

        if (validFiles.length > 0) {
            setFiles(prev => {
                const combined = [...prev, ...validFiles];
                // Limit to 10 files max
                if (combined.length > 10) {
                    setError(prev => (prev ? prev + '\n' : '') + t.errMaxFiles);
                    return combined.slice(0, 10);
                }
                return combined;
            });

            // Auto-fill title if empty and only one file total
            if (!formData.title && files.length === 0 && validFiles.length === 1) {
                const fileNameWithoutExt = validFiles[0].name.split('.').slice(0, -1).join('.');
                setFormData(prev => ({ ...prev, title: fileNameWithoutExt }));
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'category_id') {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
                topic_id: ''
            }));
            const selectedSubject = ((isTeacher || isAdmin) ? teacherSubjects : categories)?.find(s => String(s.id) === value);
            if (selectedSubject) {
                setSubjectTopics(null);
                taxonomyApi.getTopics(selectedSubject.code, false, false)
                    .then(res => setSubjectTopics(res.data?.topics || []))
                    .catch(() => setSubjectTopics([]));
            } else {
                setSubjectTopics(null);
            }
        } else {
            setFormData(prev => {
                const newData = {
                    ...prev,
                    [name]: type === 'checkbox' ? checked : value
                };
                if (name === 'grade_id') {
                    newData.class_id = ''; // reset class when grade changes
                }
                return newData;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (files.length === 0) {
            setError(t.errNoFiles);
            return;
        }

        if (!formData.title.trim() && files.length === 1) {
            setError(t.errNoTitle);
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const data = new FormData();
            const isBatch = files.length > 1;

            if (isBatch) {
                // Multi-file: use 'files' field for batch endpoint
                files.forEach(file => {
                    data.append('files', file);
                });
            } else {
                // Single file: use 'file' field for single endpoint
                data.append('file', files[0]);
            }

            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('isPublic', formData.is_public);

            if (formData.category_id) {
                data.append('subjectIds', JSON.stringify([formData.category_id]));
            }

            if (formData.topic_id) {
                data.append('topicIds', JSON.stringify([parseInt(formData.topic_id)]));
            }

            if (formData.class_id && !formData.is_private && !formData.for_everyone) {
                data.append('classId', formData.class_id);
            }

            // Real progress tracking via axios onUploadProgress
            const onUploadProgress = (progressEvent) => {
                if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                }
            };

            if (isBatch) {
                await materialsApi.uploadMultipleMaterials(data, onUploadProgress);
            } else {
                await materialsApi.uploadMaterial(data, onUploadProgress);
            }

            setUploadProgress(100);

            // Short delay to show 100%
            setTimeout(() => {
                navigate('/materials');
            }, 500);

        } catch (err) {
            console.error('Upload failed:', err);
            setError(err.response?.data?.message || t.errUploadFail);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeAllFiles = () => {
        setFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="upload-page">
            <div className="upload-container">
                <h1>{t.pageTitle}</h1>
                <p className="subtitle">{t.subtitle}</p>

                {error && (
                    <div className="error-alert">
                        <AlertCircle size={20} />
                        <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="upload-form">
                    <div className="form-group">
                        <label htmlFor="title">{t.titleLabel} {files.length <= 1 ? '*' : t.titleOptional}</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder={files.length > 1 ? t.titlePlaceholderBatch : t.titlePlaceholderSingle}
                            disabled={isUploading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">{t.descLabel}</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder={t.descPlaceholder}
                            rows={4}
                            disabled={isUploading}
                        />
                    </div>

                    {/* Subject / Category */}
                    <div className="form-group">
                        <label htmlFor="category_id">{t.subjectLabel}</label>

                        {(isTeacher || isAdmin) && teacherSubjects === null ? (
                            <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>{t.loadingSubjects}</p>
                        ) : (isTeacher || isAdmin) && teacherSubjects?.length === 0 ? (
                            <div className="error-alert" style={{ marginTop: 0 }}>
                                <BookOpen size={18} />
                                <span>{t.noSubjects}</span>
                            </div>
                        ) : (
                            <select
                                id="category_id"
                                name="category_id"
                                value={formData.category_id}
                                onChange={handleInputChange}
                                disabled={isUploading}
                                className="form-select"
                            >
                                <option value="">{t.selectSubject}</option>
                                {((isTeacher || isAdmin) ? teacherSubjects : categories).map(cat => (
                                    <option key={cat.id} value={cat.id}>{translateSubjectName(cat.name, language)}</option>
                                ))}
                            </select>
                        )}
                    </div>


                    {/* Topic Dropdown */}
                    {formData.category_id && (
                        <div className="form-group">
                            <label htmlFor="topic_id">{t.topicLabel}</label>
                            {subjectTopics === null ? (
                                <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>{t.loadingTopics}</p>
                            ) : subjectTopics.length === 0 ? (
                                <div className="error-alert" style={{ marginTop: 0 }}>
                                    <BookOpen size={18} />
                                    <span>{t.noTopics}</span>
                                </div>
                            ) : (
                                <select
                                    id="topic_id"
                                    name="topic_id"
                                    value={formData.topic_id}
                                    onChange={handleInputChange}
                                    disabled={isUploading}
                                    className="form-select"
                                >
                                    <option value="">{t.selectTopic}</option>
                                    {subjectTopics.map(topic => (
                                        <option key={topic.id} value={topic.id}>{topic.topic_name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Grade dropdown — teachers and admins only (hidden when 'for everyone' or 'private') */}
                    {(isTeacher || isAdmin) && !formData.for_everyone && !formData.is_private && (
                        <div className="form-group">
                            <label htmlFor="grade_id">{t.gradeLabel}</label>
                            {teacherGrades === null ? (
                                <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>{t.loadingGrades}</p>
                            ) : teacherGrades.length === 0 ? (
                                <p style={{ color: 'var(--gray-400)', fontSize: 14, fontWeight: 600 }}>
                                    {t.noGrades}
                                </p>
                            ) : (
                                <select
                                    id="grade_id"
                                    name="grade_id"
                                    value={formData.grade_id}
                                    onChange={handleInputChange}
                                    disabled={isUploading}
                                    className="form-select"
                                >
                                    <option value="">{t.selectGrade}</option>
                                    {teacherGrades.map(grade => (
                                        <option key={grade.id} value={grade.id}>{translateGradeName(grade.name, language)}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Class dropdown — teachers and admins only (hidden when 'for everyone' or 'private') */}
                    {(isTeacher || isAdmin) && !formData.for_everyone && !formData.is_private && formData.grade_id && (
                        <div className="form-group">
                            <label htmlFor="class_id">{t.classLabel}</label>
                            {teacherClasses === null ? (
                                <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>{t.loadingClasses}</p>
                            ) : teacherClasses.filter(c => c.grade_id === parseInt(formData.grade_id)).length === 0 ? (
                                <p style={{ color: 'var(--gray-400)', fontSize: 14, fontWeight: 600 }}>
                                    {t.noClassesForGrade}
                                </p>
                            ) : (
                                <select
                                    id="class_id"
                                    name="class_id"
                                    value={formData.class_id}
                                    onChange={handleInputChange}
                                    disabled={isUploading}
                                    className="form-select"
                                >
                                    <option value="">{t.selectClass}</option>
                                    {teacherClasses
                                        .filter(cls => cls.grade_id === parseInt(formData.grade_id))
                                        .map(cls => (
                                            <option key={cls.id} value={cls.id}>{cls.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label>{t.filesLabel} * <span className="file-count-badge">{files.length}/10</span></label>
                        <div
                            className={`drop-zone ${dragActive ? 'active' : ''}`}
                            onDragEnter={handleDragIn}
                            onDragLeave={handleDragOut}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={onButtonClick}
                            style={{ cursor: 'pointer' }}
                        >
                            <Upload size={48} className="upload-icon" />
                            <p className="drop-text">{t.dragDrop}</p>
                            <p className="drop-text-or">{t.or}</p>
                            <button 
                                type="button" 
                                className="btn-browse" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onButtonClick();
                                }}
                            >
                                {t.browseBtn}
                            </button>
                            <p className="file-hint">{t.fileHint}</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleChange}
                                accept={ACCEPTED_FILE_TYPES}
                                multiple
                                style={{ display: 'none' }}
                            />
                        </div>

                        {files.length > 0 && (
                            <div className="file-list">
                                <div className="file-list-header">
                                    <span className="file-list-title">{files.length} {files.length === 1 ? t.fileSelected : t.filesSelected}</span>
                                    <button
                                        type="button"
                                        onClick={removeAllFiles}
                                        className="btn-clear-all"
                                        disabled={isUploading}
                                    >
                                        {t.clearAll}
                                    </button>
                                </div>
                                {files.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="file-list-item">
                                        <div className="file-info">
                                            <FileText size={20} className="file-icon" />
                                            <div>
                                                <p className="file-name">{file.name}</p>
                                                <p className="file-size">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="remove-file-btn"
                                            disabled={isUploading}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Progress bar */}
                    {isUploading && (
                        <div className="progress-bar-container">
                            <div className="progress-bar-header">
                                <span>{t.uploading}</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="progress-bar-track">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="visibility-dropdown-container" ref={dropdownRef}>
                        <button
                            type="button"
                            className="btn-visibility-toggle"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isUploading}
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
                                    disabled={isUploading}
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
                                    disabled={isUploading}
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
                                        disabled={isUploading}
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
                            onClick={() => navigate('/materials')}
                            disabled={isUploading}
                        >
                            {t.cancel}
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isUploading || files.length === 0}
                        >
                            {isUploading ? (
                                <>
                                    <LoadingSpinner size="small" color="white" />
                                    <span>{t.uploading} {uploadProgress}%</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    <span>{t.uploadBtn} {files.length > 1 ? `${files.length} ${t.materials}` : t.material}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
