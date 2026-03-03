import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialsApi } from '../api/materialsApi';
import { taxonomyApi } from '../api/taxonomyApi';
import { authApi } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Upload, X, FileText, AlertCircle, BookOpen } from 'lucide-react';
import { validateFileSize, validateFileType, ACCEPTED_FILE_TYPES } from '../utils/validators';
import { formatFileSize } from '../utils/formatters';
import './UploadMaterialPage.css';

export const UploadMaterialPage = () => {
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const isTeacher = hasRole('teacher');
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        is_public: true,
        category_id: ''
    });

    const [categories, setCategories] = useState([]);
    const [teacherSubjects, setTeacherSubjects] = useState(null); // null = not loaded yet

    React.useEffect(() => {
        const fetchCategories = async () => {
            try {
                if (isTeacher) {
                    // Load only this teacher's subjects
                    const res = await authApi.getMySubjects();
                    setTeacherSubjects(res.data?.subjects || []);
                } else {
                    const response = await taxonomyApi.getSubjects();
                    if (response.success) setCategories(response.data.subjects);
                }
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        };
        fetchCategories();
    }, [isTeacher]);

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
                    setError(prev => (prev ? prev + '\n' : '') + 'Maximum 10 files per upload. Extra files were ignored.');
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
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (files.length === 0) {
            setError('Please select at least one file to upload.');
            return;
        }

        if (!formData.title.trim() && files.length === 1) {
            setError('Please enter a title for the material.');
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
            setError(err.response?.data?.message || 'Failed to upload material. Please try again.');
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
                <h1>Upload Material</h1>
                <p className="subtitle">Share learning resources with your students</p>

                {error && (
                    <div className="error-alert">
                        <AlertCircle size={20} />
                        <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="upload-form">
                    <div className="form-group">
                        <label htmlFor="title">Title {files.length <= 1 ? '*' : '(optional for batch)'}</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder={files.length > 1 ? 'Leave blank to use file names as titles' : 'e.g., Introduction to React'}
                            disabled={isUploading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Brief description of the material content..."
                            rows={4}
                            disabled={isUploading}
                        />
                    </div>

                    {/* Subject / Category */}
                    <div className="form-group">
                        <label htmlFor="category_id">Subject / Category</label>

                        {isTeacher && teacherSubjects === null ? (
                            <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Loading subjects...</p>
                        ) : isTeacher && teacherSubjects?.length === 0 ? (
                            <div className="error-alert" style={{ marginTop: 0 }}>
                                <BookOpen size={18} />
                                <span>You have no subjects assigned. Please contact an administrator.</span>
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
                                <option value="">Select a subject...</option>
                                {(isTeacher ? teacherSubjects : categories).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Files * <span className="file-count-badge">{files.length}/10</span></label>
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
                            <p className="drop-text">Drag & drop your files here</p>
                            <p className="drop-text-or">or</p>
                            <button type="button" className="btn-browse" onClick={onButtonClick}>
                                Browse Files
                            </button>
                            <p className="file-hint">Max 10 files, 50MB each • PDF, Word, PowerPoint, images, videos, archives, APK</p>
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
                                    <span className="file-list-title">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
                                    <button
                                        type="button"
                                        onClick={removeAllFiles}
                                        className="btn-clear-all"
                                        disabled={isUploading}
                                    >
                                        Clear all
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
                                <span>Uploading...</span>
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

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="is_public"
                                checked={formData.is_public}
                                onChange={handleInputChange}
                                disabled={isUploading}
                            />
                            <span className="checkbox-text">
                                <span className="checkbox-title">Make Public</span>
                                <span className="checkbox-desc">Allow all users to view and download this material</span>
                            </span>
                        </label>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => navigate('/materials')}
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isUploading || files.length === 0}
                        >
                            {isUploading ? (
                                <>
                                    <LoadingSpinner size="small" color="white" />
                                    <span>Uploading... {uploadProgress}%</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    <span>Upload {files.length > 1 ? `${files.length} Materials` : 'Material'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
