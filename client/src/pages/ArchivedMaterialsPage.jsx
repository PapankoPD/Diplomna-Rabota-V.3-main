import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialsApi } from '../api/materialsApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Archive, RotateCcw, Trash2, FileText, Calendar, User } from 'lucide-react';
import { formatFileSize, formatDateTime } from '../utils/formatters';
import './ArchivedMaterialsPage.css';

export const ArchivedMaterialsPage = () => {
    const navigate = useNavigate();
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
            setMessage({ type: 'error', text: 'Failed to load archived materials.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnarchive = async (id) => {
        setActionLoadingId(id);
        try {
            await materialsApi.unarchiveMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
            setMessage({ type: 'success', text: 'Material restored to the main library.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to unarchive material.' });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Permanently delete this material? This cannot be undone.')) return;
        setActionLoadingId(id);
        try {
            await materialsApi.deleteMaterial(id);
            setMaterials(prev => prev.filter(m => m.id !== id));
            setMessage({ type: 'success', text: 'Material permanently deleted.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete material.' });
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
                    <h1>Archived Materials</h1>
                    <p>Materials stored here are hidden from the main library. Restore or permanently delete them.</p>
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
                    <h3>No archived materials</h3>
                    <p>When you archive a material it will appear here.</p>
                </div>
            ) : (
                <div className="archived-list">
                    {materials.map(material => (
                        <div key={material.id} className="archived-card">
                            <div
                                className="archived-card-icon"
                                onClick={() => navigate(`/materials/${material.id}`)}
                                title="View material"
                            >
                                <FileText size={24} />
                            </div>
                            <div className="archived-card-info" onClick={() => navigate(`/materials/${material.id}`)}>
                                <h3>{material.title}</h3>
                                <p className="archived-card-desc">
                                    {material.description
                                        ? material.description.substring(0, 100) + (material.description.length > 100 ? '…' : '')
                                        : 'No description'}
                                </p>
                                <div className="archived-card-meta">
                                    <span><FileText size={13} /> {material.file_type?.split('/').pop()}</span>
                                    <span>{formatFileSize(material.file_size)}</span>
                                    <span><User size={13} /> {material.uploader_username || 'Unknown'}</span>
                                    <span><Calendar size={13} /> {formatDateTime(material.updated_at)}</span>
                                </div>
                            </div>
                            <div className="archived-card-actions">
                                <button
                                    className="btn-unarchive"
                                    onClick={() => handleUnarchive(material.id)}
                                    disabled={actionLoadingId === material.id}
                                    title="Restore to library"
                                >
                                    <RotateCcw size={15} />
                                    {actionLoadingId === material.id ? 'Restoring…' : 'Restore'}
                                </button>
                                <button
                                    className="btn-delete-archived"
                                    onClick={() => handleDelete(material.id)}
                                    disabled={actionLoadingId === material.id}
                                    title="Permanently delete"
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
