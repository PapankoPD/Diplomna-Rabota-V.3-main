import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materialsApi } from '../api/materialsApi';
import { ratingsApi } from '../api/ratingsApi';
import { recommendationsApi } from '../api/recommendationsApi';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { StarRating } from '../components/ratings/StarRating';
import { CommentsSection } from '../components/materials/CommentsSection';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Download, Calendar, User, FileText, ArrowLeft, Trash2, Edit, Clock, RotateCcw, Archive } from 'lucide-react';
import { formatFileSize, formatDateTime } from '../utils/formatters';
import { canEditMaterial, canDeleteMaterial } from '../utils/permissions';
import './MaterialDetailPage.css';

const translations = {
    en: {
        back: "Back to Materials",
        errorTitle: "Error",
        loadError: "Failed to load material details. It may have been removed.",
        unknownUser: "Unknown User",
        edit: "Edit",
        unarchive: "Unarchive",
        archiveBtn: "Archive",
        delete: "Delete",
        description: "Description",
        noDescription: "No description provided.",
        filePreview: "File Preview",
        downloadFile: "Download File",
        rating: "Rating",
        reviews: "reviews",
        yourRating: "Your Rating:",
        statistics: "Statistics",
        downloads: "Downloads",
        version: "Version",
        visibility: "Visibility",
        public: "Public",
        private: "Private",
        status: "Status",
        archivedStat: "Archived",
        versionHistory: "Version History",
        loading: "Loading...",
        hide: "Hide",
        show: "Show",
        noVersions: "No previous versions available.",
        by: "by",
        restore: "Restore",
        similarMaterials: "Similar Materials",
        confirmRestore: "Are you sure you want to restore this version? The current version will be saved to history.",
        confirmDeleteVersion: "Are you sure you want to delete this version? This cannot be undone.",
        confirmDeleteMaterial: "Are you sure you want to permanently delete this material? This action cannot be undone.",
        confirmArchive: "Archive this material? It will be hidden from the main library but can be restored later.",
        errLoadVersions: "Failed to load version history. Please try again.",
        errRestore: "Failed to restore version. Please try again.",
        errDeleteVer: "Failed to delete version. Please try again.",
        errDownloadNoFile: "Download failed. The file may not exist on the server.",
        errDownloadEmpty: "Download failed: received empty file. The file may not exist on the server.",
        errDownload: "Failed to download file.",
        errDownloadAgain: "Failed to download file. Please try again.",
        errRate: "Failed to submit rating. Please try again.",
        errDeleteMat: "Failed to delete material.",
        errArchive: "Failed to archive material.",
        errUnarchive: "Failed to unarchive material."
    },
    bg: {
        back: "Назад към материалите",
        errorTitle: "Грешка",
        loadError: "Неуспешно зареждане на детайлите за материала. Може да е бил премахнат.",
        unknownUser: "Неизвестен потребител",
        edit: "Редактиране",
        unarchive: "Разархивиране",
        archiveBtn: "Архивиране",
        delete: "Изтриване",
        description: "Описание",
        noDescription: "Няма предоставено описание.",
        filePreview: "Преглед на файл",
        downloadFile: "Изтегляне",
        rating: "Оценка",
        reviews: "отзиви",
        yourRating: "Вашата оценка:",
        statistics: "Статистика",
        downloads: "Изтегляния",
        version: "Версия",
        visibility: "Видимост",
        public: "Публичен",
        private: "Частен",
        status: "Статус",
        archivedStat: "Архивиран",
        versionHistory: "История на версиите",
        loading: "Зареждане...",
        hide: "Скриване",
        show: "Показване",
        noVersions: "Няма налични предишни версии.",
        by: "от",
        restore: "Възстановяване",
        similarMaterials: "Подобни материали",
        confirmRestore: "Сигурни ли сте, че искате да възстановите тази версия? Текущата версия ще бъде запазена в историята.",
        confirmDeleteVersion: "Сигурни ли сте, че искате да изтриете тази версия? Това не може да бъде отменено.",
        confirmDeleteMaterial: "Сигурни ли сте, че искате да изтриете този материал завинаги? Това действие не може да бъде отменено.",
        confirmArchive: "Архивиране на този материал? Той ще бъде скрит от основната библиотека, но може да бъде възстановен по-късно.",
        errLoadVersions: "Неуспешно зареждане на историята на версиите. Моля, опитайте отново.",
        errRestore: "Неуспешно възстановяване на версията. Моля, опитайте отново.",
        errDeleteVer: "Неуспешно изтриване на версията. Моля, опитайте отново.",
        errDownloadNoFile: "Изтеглянето е неуспешно. Файлът може да не съществува на сървъра.",
        errDownloadEmpty: "Изтеглянето е неуспешно: получен е празен файл. Файлът може да не съществува на сървъра.",
        errDownload: "Неуспешно изтегляне на файла.",
        errDownloadAgain: "Неуспешно изтегляне на файла. Моля, опитайте отново.",
        errRate: "Неуспешно изпращане на оценката. Моля, опитайте отново.",
        errDeleteMat: "Неуспешно изтриване на материала.",
        errArchive: "Неуспешно архивиране на материала.",
        errUnarchive: "Неуспешно разархивиране на материала."
    }
};

export const MaterialDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { language } = useLanguage();
    const confirm = useConfirm();
    const t = translations[language];

    const [material, setMaterial] = useState(null);
    const [similarMaterials, setSimilarMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userRating, setUserRating] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);

    // Version history state
    const [versions, setVersions] = useState([]);
    const [showVersions, setShowVersions] = useState(false);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [restoringVersionId, setRestoringVersionId] = useState(null);

    useEffect(() => {
        loadMaterialData();
    }, [id]);

    const loadMaterialData = async () => {
        setIsLoading(true);
        try {
            const [materialResult, ratingResult, similarResult] = await Promise.allSettled([
                materialsApi.getMaterialById(id),
                ratingsApi.getUserRating(id),
                recommendationsApi.getSimilar(id)
            ]);

            // Material is required — if it failed, show error
            if (materialResult.status === 'rejected') {
                throw materialResult.reason;
            }
            const materialData = materialResult.value;
            setMaterial(materialData.data?.material || materialData.data);

            // Ratings are optional
            if (ratingResult.status === 'fulfilled' && ratingResult.value?.data) {
                setUserRating(ratingResult.value.data.rating);
            }

            // Similar materials are optional
            if (similarResult.status === 'fulfilled' && similarResult.value?.success) {
                setSimilarMaterials(similarResult.value.data.similar);
            }
        } catch (err) {
            console.error('Failed to load material:', err);
            setError(t.loadError);
        } finally {
            setIsLoading(false);
        }
    };

    const loadVersions = async () => {
        if (showVersions) {
            setShowVersions(false);
            return;
        }
        setIsLoadingVersions(true);
        try {
            const response = await materialsApi.getVersions(id);
            setVersions(response.data?.versions || response.data || []);
            setShowVersions(true);
        } catch (err) {
            console.error('Failed to load versions:', err);
            alert(err.response?.data?.message || t.errLoadVersions);
        } finally {
            setIsLoadingVersions(false);
        }
    };

    const handleRestoreVersion = async (versionId) => {
        const confirmed = await confirm({
            message: t.confirmRestore,
            isDanger: false
        });
        if (!confirmed) return;
        setRestoringVersionId(versionId);
        try {
            await materialsApi.restoreVersion(id, versionId);
            // Reload everything
            await loadMaterialData();
            const response = await materialsApi.getVersions(id);
            setVersions(response.data?.versions || response.data || []);
        } catch (err) {
            console.error('Failed to restore version:', err);
            alert(t.errRestore);
        } finally {
            setRestoringVersionId(null);
        }
    };

    const handleDeleteVersion = async (versionId) => {
        const confirmed = await confirm({
            message: t.confirmDeleteVersion,
            isDanger: true
        });
        if (!confirmed) return;
        try {
            await materialsApi.deleteVersion(id, versionId);
            setVersions(prev => prev.filter(v => v.id !== versionId));
        } catch (err) {
            console.error('Failed to delete version:', err);
            alert(t.errDeleteVer);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await materialsApi.downloadMaterial(id);

            // response.data is already a Blob when responseType is 'blob'
            const blob = response.data;

            // Check if the server returned a JSON error inside a blob
            if (blob.type && blob.type.includes('application/json')) {
                const text = await blob.text();
                const errorData = JSON.parse(text);
                alert(errorData.message || t.errDownloadNoFile);
                return;
            }

            // Check for empty blob
            if (!blob || blob.size === 0) {
                alert(t.errDownloadEmpty);
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Use the material title as the download name, keeping the original file extension
            const fileName = material.file_name || material.material?.file_name || '';
            const title = material.title || material.material?.title || '';
            const dotIndex = fileName.lastIndexOf('.');
            const ext = dotIndex !== -1 ? fileName.substring(dotIndex) : '';
            const downloadName = (title || fileName || 'download') + (title ? ext : '');
            link.setAttribute('download', downloadName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            // Update download count locally
            setMaterial(prev => ({
                ...prev,
                download_count: (prev.download_count || 0) + 1
            }));
        } catch (err) {
            console.error('Download failed:', err);
            // Try to read the error blob if it's a response error
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const errorData = JSON.parse(text);
                    alert(errorData.message || t.errDownload);
                } catch {
                    alert(t.errDownloadAgain);
                }
            } else {
                alert(err.response?.data?.message || t.errDownloadAgain);
            }

        } finally {
            setIsDownloading(false);
        }
    };

    const handleRatingChange = async (newRating) => {
        try {
            await ratingsApi.rateMaterial(id, newRating);
            setUserRating(newRating);
            // Refresh material to get updated average
            const updatedMaterial = await materialsApi.getMaterialById(id);
            setMaterial(updatedMaterial.data?.material || updatedMaterial.data);
        } catch (err) {
            console.error('Failed to update rating:', err);
            alert(t.errRate);
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            message: t.confirmDeleteMaterial,
            isDanger: true
        });
        if (!confirmed) return;

        try {
            await materialsApi.deleteMaterial(id);
            navigate('/materials');
        } catch (err) {
            console.error('Delete failed:', err);
            alert(t.errDeleteMat);
        }
    };

    const handleArchive = async () => {
        const confirmed = await confirm({
            message: t.confirmArchive,
            isDanger: true
        });
        if (!confirmed) return;
        try {
            await materialsApi.archiveMaterial(id);
            navigate('/materials');
        } catch (err) {
            console.error('Archive failed:', err);
            alert(err.response?.data?.message || t.errArchive);
        }
    };

    const handleUnarchive = async () => {
        try {
            await materialsApi.unarchiveMaterial(id);
            // Refresh material data to reflect new state
            await loadMaterialData();
        } catch (err) {
            console.error('Unarchive failed:', err);
            alert(err.response?.data?.message || t.errUnarchive);
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    if (error) {
        return (
            <div className="error-container">
                <h2>{t.errorTitle}</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/materials')} className="back-btn">
                    <ArrowLeft size={16} /> {t.back}
                </button>
            </div>
        );
    }

    if (!material) return null;

    const showEditControls = canEditMaterial(user, material);
    const showDeleteControls = canDeleteMaterial(user, material);

    return (
        <div className="material-detail-page">
            <button onClick={() => navigate('/materials')} className="back-link">
                <ArrowLeft size={16} /> {t.back}
            </button>

            <div className="material-detail-header">
                <div>
                    <h1 className="material-title">{material.title}</h1>
                    <div className="material-meta-row">
                        <span className="meta-item">
                            <User size={16} />
                            {material.uploader_username || t.unknownUser}
                        </span>
                        <span className="meta-item">
                            <Calendar size={16} />
                            {formatDateTime(material.created_at)}
                        </span>
                        <span className="meta-item">
                            <FileText size={16} />
                            {material.file_type} • {formatFileSize(material.file_size)}
                        </span>
                    </div>
                </div>

                <div className="action-buttons">
                    {showEditControls && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate(`/materials/${id}/edit`)}
                        >
                            <Edit size={16} /> {t.edit}
                        </button>
                    )}
                    {showEditControls && (
                        material.is_archived ? (
                            <button
                                className="btn btn-archive"
                                onClick={handleUnarchive}
                            >
                                <RotateCcw size={16} /> {t.unarchive}
                            </button>
                        ) : (
                            <button
                                className="btn btn-archive"
                                onClick={handleArchive}
                            >
                                <Archive size={16} /> {t.archiveBtn}
                            </button>
                        )
                    )}
                    {showDeleteControls && (
                        <button
                            className="btn btn-danger"
                            onClick={handleDelete}
                        >
                            <Trash2 size={16} /> {t.delete}
                        </button>
                    )}
                </div>
            </div>

            <div className="material-content-grid">
                <div className="main-content">
                    <div className="content-card description-section">
                        <h2>{t.description}</h2>
                        <p>{material.description || t.noDescription}</p>
                    </div>

                    <div className="content-card preview-section">
                        <h2>{t.filePreview}</h2>
                        <div className="file-preview-placeholder">
                            <FileText size={48} />
                            <p>{material.file_name}</p>
                            <button
                                className="download-btn-large"
                                onClick={handleDownload}
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <LoadingSpinner size="small" />
                                ) : (
                                    <>
                                        <Download size={20} />
                                        {t.downloadFile}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="content-card">
                        <CommentsSection materialId={id} />
                    </div>
                </div>

                <div className="sidebar-content">
                    <div className="content-card rating-card">
                        <h2>{t.rating}</h2>
                        <div className="average-rating">
                            <span className="rating-number">{Number(material.average_rating || 0).toFixed(1)}</span>
                            <StarRating rating={material.average_rating || 0} readonly />
                            <span className="rating-count">({material.rating_count || 0} {t.reviews})</span>
                        </div>

                        <div className="user-rating-section">
                            <p>{t.yourRating}</p>
                            <StarRating
                                rating={userRating}
                                onRate={handleRatingChange}
                                size="medium"
                            />
                        </div>
                    </div>

                    <div className="content-card stats-card">
                        <h2>{t.statistics}</h2>
                        <div className="stat-row">
                            <span>{t.downloads}</span>
                            <strong>{material.download_count || 0}</strong>
                        </div>
                        <div className="stat-row">
                            <span>{t.version}</span>
                            <strong>v{material.version || 1}</strong>
                        </div>
                        <div className="stat-row">
                            <span>{t.visibility}</span>
                            <span className={`badge ${material.is_public ? 'public' : 'private'}`}>
                                {material.is_public ? t.public : t.private}
                            </span>
                        </div>
                        {material.is_archived && (
                            <div className="stat-row">
                                <span>{t.status}</span>
                                <span className="badge archived">
                                    <Archive size={11} /> {t.archivedStat}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Version History Card */}
                    <div className="content-card version-card">
                        <div className="version-header">
                            <h2><Clock size={18} /> {t.versionHistory}</h2>
                            <button
                                className="toggle-versions-btn"
                                onClick={loadVersions}
                                disabled={isLoadingVersions}
                            >
                                {isLoadingVersions ? t.loading : showVersions ? t.hide : t.show}
                            </button>
                        </div>

                        {showVersions && (
                            <div className="version-list">
                                {versions.length === 0 ? (
                                    <p className="no-versions">{t.noVersions}</p>
                                ) : (
                                    versions.map((version) => (
                                        <div key={version.id} className="version-item">
                                            <div className="version-info">
                                                <span className="version-number">v{version.version_number}</span>
                                                <span className="version-title">{version.title}</span>
                                                <span className="version-date">
                                                    {formatDateTime(version.created_at)}
                                                </span>
                                                {version.changed_by_username && (
                                                    <span className="version-author">
                                                        {t.by} {version.changed_by_username}
                                                    </span>
                                                )}
                                            </div>
                                            {showEditControls && (
                                                <div className="version-actions">
                                                    <button
                                                        className="restore-btn"
                                                        onClick={() => handleRestoreVersion(version.id)}
                                                        disabled={restoringVersionId === version.id}
                                                        title="Restore this version"
                                                    >
                                                        {restoringVersionId === version.id ? (
                                                            <LoadingSpinner size="small" />
                                                        ) : (
                                                            <><RotateCcw size={14} /> {t.restore}</>
                                                        )}
                                                    </button>
                                                    <button
                                                        className="delete-version-btn"
                                                        onClick={() => handleDeleteVersion(version.id)}
                                                        title="Delete this version"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {similarMaterials.length > 0 && (
                        <div className="content-card similar-card">
                            <h2>{t.similarMaterials}</h2>
                            <div className="similar-list">
                                {similarMaterials.map(item => (
                                    <div key={item.id} className="similar-item" onClick={() => navigate(`/materials/${item.id}`)}>
                                        <div className="similar-icon">
                                            <FileText size={16} />
                                        </div>
                                        <div className="similar-info">
                                            <h4>{item.title}</h4>
                                            <span>{item.file_type}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
