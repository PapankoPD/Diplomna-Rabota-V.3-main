import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { materialsApi } from '../api/materialsApi';
import { recommendationsApi } from '../api/recommendationsApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import './DashboardPage.css';

// ── Cartoon SVG icons ──────────────────────────────────────────────────────
const CartoonUpload = () => (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="18" width="22" height="7" rx="3.5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
        <path d="M14 3 L14 17" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />
        <path d="M8 9 L14 3 L20 9" fill="#93c5fd" stroke="#1d4ed8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="21" cy="21.5" r="2" fill="white" />
    </svg>
);

const CartoonDownload = () => (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="18" width="22" height="7" rx="3.5" fill="#16a34a" stroke="#15803d" strokeWidth="2" />
        <path d="M14 3 L14 17" stroke="#15803d" strokeWidth="3" strokeLinecap="round" />
        <path d="M8 11 L14 17 L20 11" fill="#86efac" stroke="#15803d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="21" cy="21.5" r="2" fill="white" />
    </svg>
);

const CartoonStar = () => (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 3 L16.9 10.3 L24.7 10.8 L19 15.9 L20.9 23.5 L14 19.4 L7.1 23.5 L9 15.9 L3.3 10.8 L11.1 10.3 Z"
            fill="#fbbf24" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 7.5 L15.7 12 L20.5 12.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
);

const CartoonFile = () => (
    <svg width="30" height="30" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 3 H17 L23 9 V25 C23 26.1 22.1 27 21 27 H7 C5.9 27 5 26.1 5 25 V5 C5 3.9 5.9 3 7 3 Z"
            fill="#a5b4fc" stroke="#4338ca" strokeWidth="2" strokeLinejoin="round" />
        <path d="M17 3 V9 H23" stroke="#4338ca" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="9" y1="14" x2="19" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="9" y1="18" x2="16" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const CartoonTrending = () => (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="52" height="52" rx="16" fill="#fef3c7" />
        <path d="M10 36 L20 24 L28 30 L40 16" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 16 H40 V22" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="24" r="3.5" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
        <circle cx="28" cy="30" r="3.5" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
    </svg>
);

const CartoonEmpty = () => (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="52" height="52" rx="16" fill="#ede9fe" />
        <path d="M14 10 H30 L38 18 V44 C38 45.1 37.1 46 36 46 H14 C12.9 46 12 45.1 12 44 V12 C12 10.9 12.9 10 14 10 Z"
            fill="#c4b5fd" stroke="#6d28d9" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M30 10 V18 H38" stroke="#6d28d9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="18" y1="26" x2="32" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="32" x2="27" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);
// ──────────────────────────────────────────────────────────────────────────

// File-type emoji helper
const fileEmoji = (type) => {
    if (!type) return '📄';
    const t = type.toLowerCase();
    if (t.includes('pdf')) return '📕';
    if (t.includes('video') || t.includes('mp4')) return '🎬';
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '🖼️';
    if (t.includes('zip') || t.includes('rar')) return '📦';
    if (t.includes('word') || t.includes('doc')) return '📝';
    if (t.includes('excel') || t.includes('xls')) return '📊';
    return '📄';
};

export const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState(null);
    const [recentMaterials, setRecentMaterials] = useState([]);
    const [trendingMaterials, setTrendingMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [recentResponse, trendingResponse, statsResponse] = await Promise.all([
                    materialsApi.getMaterials({ page: 1, limit: 5, sortBy: 'created_at', sortOrder: 'desc' }),
                    recommendationsApi.getTrending(5),
                    materialsApi.getStats()
                ]);
                setRecentMaterials(recentResponse.data || []);
                if (trendingResponse.success) {
                    setTrendingMaterials(trendingResponse.data.trending || trendingResponse.data.recommendations || []);
                }
                if (statsResponse.success) {
                    setStats(statsResponse.data);
                } else {
                    setStats({ uploadsCount: 0, downloadsCount: 0, ratingsGiven: 0, totalMaterials: 0 });
                }
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                setStats({ uploadsCount: 0, downloadsCount: 0, ratingsGiven: 0, totalMaterials: 0 });
            } finally {
                setIsLoading(false);
            }
        };
        loadDashboardData();
    }, [location.key]);

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="dashboard-page">

            {/* ── Header ── */}
            <div className="dashboard-header">
                <div className="header-wave">👋</div>
                <div className="header-text">
                    <h1>Hey, <span className="username-highlight">{user?.username}</span>!</h1>
                    <p>Here's what's happening with your learning materials 🚀</p>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="stats-grid">
                <div className="stat-card stat-card-blue">
                    <div className="stat-icon cartoon-icon-blue"><CartoonUpload /></div>
                    <div className="stat-content">
                        <p className="stat-label">Materials Uploaded</p>
                        <p className="stat-value">{stats?.uploadsCount ?? 0}</p>
                    </div>
                    <div className="card-blob blob-blue" />
                </div>

                <div className="stat-card stat-card-green">
                    <div className="stat-icon cartoon-icon-green"><CartoonDownload /></div>
                    <div className="stat-content">
                        <p className="stat-label">Downloads</p>
                        <p className="stat-value">{stats?.downloadsCount ?? 0}</p>
                    </div>
                    <div className="card-blob blob-green" />
                </div>

                <div className="stat-card stat-card-yellow">
                    <div className="stat-icon cartoon-icon-yellow"><CartoonStar /></div>
                    <div className="stat-content">
                        <p className="stat-label">Ratings Given</p>
                        <p className="stat-value">{stats?.ratingsGiven ?? 0}</p>
                    </div>
                    <div className="card-blob blob-yellow" />
                </div>

                <div className="stat-card stat-card-purple">
                    <div className="stat-icon cartoon-icon-purple"><CartoonFile /></div>
                    <div className="stat-content">
                        <p className="stat-label">Total Materials</p>
                        <p className="stat-value">{stats?.totalMaterials ?? 0}</p>
                    </div>
                    <div className="card-blob blob-purple" />
                </div>
            </div>

            {/* ── Trending ── */}
            <div className="section-card">
                <div className="section-header">
                    <span className="section-emoji">🔥</span>
                    <h2>Trending Now</h2>
                    <span className="section-badge">{trendingMaterials.length}</span>
                </div>

                {trendingMaterials.length === 0 ? (
                    <div className="empty-state">
                        <CartoonTrending />
                        <p>No trending materials yet</p>
                        <span className="empty-sub">Check back soon!</span>
                    </div>
                ) : (
                    <div className="materials-list">
                        {trendingMaterials.map((material, i) => (
                            <div
                                key={material.materialId}
                                className="material-item"
                                onClick={() => navigate(`/materials/${material.materialId}`)}
                            >
                                <div className="material-rank">#{i + 1}</div>
                                <div className="material-file-icon">{fileEmoji(material.fileType || material.file_type)}</div>
                                <div className="material-info">
                                    <h3>{material.title}</h3>
                                    <p>{material.description}</p>
                                </div>
                                <div className="material-meta">
                                    {(material.fileType || material.file_type) && (
                                        <span className="meta-chip chip-type">{(material.fileType || material.file_type).toUpperCase()}</span>
                                    )}
                                    <span className="meta-chip chip-downloads">⬇️ {material.downloadCount ?? material.download_count ?? 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Recent ── */}
            <div className="section-card">
                <div className="section-header">
                    <span className="section-emoji">🕐</span>
                    <h2>Recent Materials</h2>
                    <span className="section-badge">{recentMaterials.length}</span>
                </div>

                {recentMaterials.length === 0 ? (
                    <div className="empty-state">
                        <CartoonEmpty />
                        <p>No materials yet</p>
                        <span className="empty-sub">Upload your first one!</span>
                    </div>
                ) : (
                    <div className="materials-list">
                        {recentMaterials.map((material) => (
                            <div
                                key={material.id}
                                className="material-item"
                                onClick={() => navigate(`/materials/${material.id}`)}
                            >
                                <div className="material-file-icon">{fileEmoji(material.file_type)}</div>
                                <div className="material-info">
                                    <h3>{material.title}</h3>
                                    <p>{material.description}</p>
                                </div>
                                <div className="material-meta">
                                    {material.file_type && (
                                        <span className="meta-chip chip-type">{material.file_type.toUpperCase()}</span>
                                    )}
                                    <span className="meta-chip chip-downloads">⬇️ {material.download_count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};
