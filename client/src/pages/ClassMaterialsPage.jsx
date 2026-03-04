import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ArrowLeft, FileText, Download, BookOpen } from 'lucide-react';
import { formatFileSize, formatRelativeTime } from '../utils/formatters';
import './ClassMaterialsPage.css';

export const ClassMaterialsPage = () => {
    const { classId } = useParams();
    const navigate = useNavigate();

    const [classInfo, setClassInfo] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => { loadMaterials(); }, [classId, page]);

    const loadMaterials = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/classes/${classId}/materials`, { params: { page, limit: 20 } });
            const data = res.data.data;
            setClassInfo(data.classInfo);
            setMaterials(data.materials);
            setTotalPages(data.pagination.totalPages);
            setTotal(data.pagination.total);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load materials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (materialId, filename) => {
        try {
            const res = await apiClient.get(`/materials/${materialId}/download`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Download failed.');
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="cmp-page">
            {/* Back navigation */}
            <button className="cmp-back" onClick={() => navigate('/classes')}>
                <ArrowLeft size={16} /> Back to Classes
            </button>

            {/* Header */}
            <div className="cmp-header">
                <div className="cmp-header-icon"><BookOpen size={28} /></div>
                <div>
                    <h1>{classInfo ? classInfo.name : 'Class Materials'}</h1>
                    <p>{total} material{total !== 1 ? 's' : ''} uploaded for this class</p>
                </div>
            </div>

            {error && <div className="cmp-error">{error}</div>}

            {materials.length === 0 && !error ? (
                <div className="cmp-empty">
                    <FileText size={48} />
                    <h3>No materials yet</h3>
                    <p>No materials have been uploaded for this class.</p>
                </div>
            ) : (
                <>
                    <div className="cmp-grid">
                        {materials.map(m => (
                            <div key={m.id} className="cmp-card" onClick={() => navigate(`/materials/${m.id}`)} title="View material">
                                <div className="cmp-card-icon">
                                    <FileText size={22} />
                                </div>
                                <div className="cmp-card-body">
                                    <h3 className="cmp-card-title">{m.title}</h3>
                                    {m.description && <p className="cmp-card-desc">{m.description}</p>}
                                    <div className="cmp-card-meta">
                                        <span>{m.uploader_username}</span>
                                        <span>·</span>
                                        <span>{formatRelativeTime(m.created_at)}</span>
                                        {m.file_size && <><span>·</span><span>{formatFileSize(m.file_size)}</span></>}
                                    </div>
                                </div>
                                <button
                                    className="cmp-download"
                                    title="Download"
                                    onClick={e => { e.stopPropagation(); handleDownload(m.id, m.original_filename); }}
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="cmp-pagination">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="cmp-page-btn">← Prev</button>
                            <span className="cmp-page-info">Page {page} of {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="cmp-page-btn">Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
