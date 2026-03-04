import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materialsApi } from '../api/materialsApi';
import { ratingsApi } from '../api/ratingsApi';
import { recommendationsApi } from '../api/recommendationsApi';
import { useAuth } from '../hooks/useAuth';
import { StarRating } from '../components/ratings/StarRating';
import { CommentsSection } from '../components/materials/CommentsSection';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Download, Calendar, User, FileText, ArrowLeft, Trash2, Edit, Clock, RotateCcw } from 'lucide-react';
import { formatFileSize, formatDateTime } from '../utils/formatters';
import { canEditMaterial, canDeleteMaterial } from '../utils/permissions';
import './MaterialDetailPage.css';

export const MaterialDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
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
            setError('Failed to load material details. It may have been removed.');
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
            alert(err.response?.data?.message || 'Failed to load version history. Please try again.');
        } finally {
            setIsLoadingVersions(false);
        }
    };

    const handleRestoreVersion = async (versionId) => {
        if (!window.confirm('Are you sure you want to restore this version? The current version will be saved to history.')) {
            return;
        }
        setRestoringVersionId(versionId);
        try {
            await materialsApi.restoreVersion(id, versionId);
            // Reload everything
            await loadMaterialData();
            const response = await materialsApi.getVersions(id);
            setVersions(response.data?.versions || response.data || []);
        } catch (err) {
            console.error('Failed to restore version:', err);
            alert('Failed to restore version. Please try again.');
        } finally {
            setRestoringVersionId(null);
        }
    };

    const handleDeleteVersion = async (versionId) => {
        if (!window.confirm('Are you sure you want to delete this version? This cannot be undone.')) {
            return;
        }
        try {
            await materialsApi.deleteVersion(id, versionId);
            setVersions(prev => prev.filter(v => v.id !== versionId));
        } catch (err) {
            console.error('Failed to delete version:', err);
            alert('Failed to delete version. Please try again.');
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
                alert(errorData.message || 'Download failed. The file may not exist on the server.');
                return;
            }

            // Check for empty blob
            if (!blob || blob.size === 0) {
                alert('Download failed: received empty file. The file may not exist on the server.');
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
                    alert(errorData.message || 'Failed to download file.');
                } catch {
                    alert('Failed to download file. Please try again.');
                }
            } else {
                alert(err.response?.data?.message || 'Failed to download file. Please try again.');
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
            alert('Failed to submit rating. Please try again.');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
            return;
        }

        try {
            await materialsApi.deleteMaterial(id);
            navigate('/materials');
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete material.');
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    if (error) {
        return (
            <div className="error-container">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/materials')} className="back-btn">
                    <ArrowLeft size={16} /> Back to Materials
                </button>
            </div>
        );
    }

    if (!material) return null;

    const isOwner = user && material.uploaded_by === user.id;
    const showEditControls = canEditMaterial(user, material);
    const showDeleteControls = canDeleteMaterial(user, material);

    return (
        <div className="material-detail-page">
            <button onClick={() => navigate('/materials')} className="back-link">
                <ArrowLeft size={16} /> Back to Materials
            </button>

            <div className="material-detail-header">
                <div>
                    <h1 className="material-title">{material.title}</h1>
                    <div className="material-meta-row">
                        <span className="meta-item">
                            <User size={16} />
                            {material.uploader_username || 'Unknown User'}
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
                            <Edit size={16} /> Edit
                        </button>
                    )}
                    {showDeleteControls && (
                        <button
                            className="btn btn-danger"
                            onClick={handleDelete}
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    )}
                </div>
            </div>

            <div className="material-content-grid">
                <div className="main-content">
                    <div className="content-card description-section">
                        <h2>Description</h2>
                        <p>{material.description || 'No description provided.'}</p>
                    </div>

                    <div className="content-card preview-section">
                        <h2>File Preview</h2>
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
                                        Download File
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
                        <h2>Rating</h2>
                        <div className="average-rating">
                            <span className="rating-number">{Number(material.average_rating || 0).toFixed(1)}</span>
                            <StarRating rating={material.average_rating || 0} readonly />
                            <span className="rating-count">({material.rating_count || 0} reviews)</span>
                        </div>

                        <div className="user-rating-section">
                            <p>Your Rating:</p>
                            <StarRating
                                rating={userRating}
                                onRate={handleRatingChange}
                                size="medium"
                            />
                        </div>
                    </div>

                    <div className="content-card stats-card">
                        <h2>Statistics</h2>
                        <div className="stat-row">
                            <span>Downloads</span>
                            <strong>{material.download_count || 0}</strong>
                        </div>
                        <div className="stat-row">
                            <span>Version</span>
                            <strong>v{material.version || 1}</strong>
                        </div>
                        <div className="stat-row">
                            <span>Visibility</span>
                            <span className={`badge ${material.is_public ? 'public' : 'private'}`}>
                                {material.is_public ? 'Public' : 'Private'}
                            </span>
                        </div>
                    </div>

                    {/* Version History Card */}
                    <div className="content-card version-card">
                        <div className="version-header">
                            <h2><Clock size={18} /> Version History</h2>
                            <button
                                className="toggle-versions-btn"
                                onClick={loadVersions}
                                disabled={isLoadingVersions}
                            >
                                {isLoadingVersions ? 'Loading...' : showVersions ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        {showVersions && (
                            <div className="version-list">
                                {versions.length === 0 ? (
                                    <p className="no-versions">No previous versions available.</p>
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
                                                        by {version.changed_by_username}
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
                                                            <><RotateCcw size={14} /> Restore</>
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
                            <h2>Similar Materials</h2>
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
