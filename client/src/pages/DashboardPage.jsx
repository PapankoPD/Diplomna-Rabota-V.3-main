import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { materialsApi } from '../api/materialsApi';
import { recommendationsApi } from '../api/recommendationsApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Upload, Download, Star, FileText, Film, Image, Archive, FileSpreadsheet, TrendingUp, FolderOpen, BarChart3 } from 'lucide-react';
import './DashboardPage.css';

// Modern file-type icon helper
const FileIcon = ({ type }) => {
    if (!type) return <FileText size={22} />;
    const t = type.toLowerCase();
    if (t.includes('pdf')) return <FileText size={22} />;
    if (t.includes('video') || t.includes('mp4')) return <Film size={22} />;
    if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return <Image size={22} />;
    if (t.includes('zip') || t.includes('rar')) return <Archive size={22} />;
    if (t.includes('word') || t.includes('doc')) return <FileText size={22} />;
    if (t.includes('excel') || t.includes('xls')) return <FileSpreadsheet size={22} />;
    return <FileText size={22} />;
};

// Bar colors for the rating chart
const BAR_COLORS = ['#6366f1', '#818cf8', '#a78bfa', '#c4b5fd', '#ddd6fe'];

const translations = {
    en: {
        greeting: "Hey",
        subGreeting: "Here's what's happening with your learning materials 🚀",
        uploaded: "Materials Uploaded",
        downloads: "Downloads",
        ratings: "Ratings Given",
        total: "Total Materials",
        trending: "Trending in your class",
        trendingTeacher: "Most downloaded of your uploads",
        trendingAdmin: "Trending Now",
        noTrending: "No trending materials yet",
        checkSoon: "Check back soon!",
        recent: "Recent Materials",
        noMaterials: "No materials yet",
        uploadFirst: "Upload your first one!",
        topRated: "Top Rated",
        noRatings: "No ratings yet",
        rateFirst: "Rate materials to see the chart!"
    },
    bg: {
        greeting: "Здравей",
        subGreeting: "Ето какво се случва с твоите учебни материали 🚀",
        uploaded: "Качени материали",
        downloads: "Изтегляния",
        ratings: "Дадени оценки",
        total: "Общо материали",
        trending: "Популярни в твоя клас",
        trendingTeacher: "Най-изтегляни от твоите файлове",
        trendingAdmin: "Популярни сега",
        noTrending: "Все още няма популярни материали",
        checkSoon: "Проверете отново скоро!",
        recent: "Последни материали",
        noMaterials: "Няма материали",
        uploadFirst: "Качете първия си материал!",
        topRated: "Препоръчани материали по оценка",
        noRatings: "Все още няма оценки",
        rateFirst: "Оценете материали, за да видите диаграмата!"
    }
};

/* ── Tiny bar-chart component (pure CSS, no library) ── */
const RatingBarChart = ({ materials, onBarClick }) => {
    if (!materials || materials.length === 0) return null;

    const maxRating = 5; // ratings are 1-5

    return (
        <div className="bar-chart">
            <div className="bar-chart-bars">
                {materials.map((m, i) => {
                    const pct = (m.averageRating / maxRating) * 100;
                    return (
                        <div
                            key={m.id}
                            className="bar-column"
                            onClick={() => onBarClick && onBarClick(m.id)}
                            title={`${m.title} — ★ ${m.averageRating.toFixed(1)}`}
                        >
                            <span className="bar-value">★ {m.averageRating.toFixed(1)}</span>
                            <div className="bar-track">
                                <div
                                    className="bar-fill"
                                    style={{
                                        height: `${pct}%`,
                                        background: BAR_COLORS[i % BAR_COLORS.length],
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            </div>
                            <span className="bar-label" title={m.title}>{m.title}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const DashboardPage = () => {
    const { user, hasRole } = useAuth();
    const { language } = useLanguage();
    const t = translations[language];
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState(null);
    const [recentMaterials, setRecentMaterials] = useState([]);
    const [trendingMaterials, setTrendingMaterials] = useState([]);
    const [topRated, setTopRated] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [recentResponse, trendingResponse, statsResponse, topRatedResponse] = await Promise.all([
                    materialsApi.getMaterials({ page: 1, limit: 5, sortBy: 'created_at', sortOrder: 'desc' }),
                    recommendationsApi.getTrendingForMe(3),
                    materialsApi.getStats(),
                    recommendationsApi.getTopRated(5)
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
                if (topRatedResponse.success) {
                    setTopRated(topRatedResponse.data.materials || []);
                }
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                setStats({ uploadsCount: 0, downloadsCount: 0, ratingsGiven: 0, totalMaterials: 0 });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadDashboardData();
        
        // Auto-refresh every 5 minutes
        const intervalId = setInterval(loadDashboardData, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [location.key]);

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="dashboard-page">

            {/* ── Header ── */}
            <div className="dashboard-header">
                <div className="header-wave">👋</div>
                <div className="header-text">
                    <h1>{t.greeting}, <span className="username-highlight">{user?.username}</span>!</h1>
                    <p>{t.subGreeting}</p>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="stats-grid">
                {!hasRole('admin') && (
                    <div className="stat-card stat-card-blue">
                        <div className="stat-icon stat-icon-blue"><Upload size={24} /></div>
                        <div className="stat-content">
                            <p className="stat-label">{t.uploaded}</p>
                            <p className="stat-value">{stats?.uploadsCount ?? 0}</p>
                        </div>
                        <div className="card-blob blob-blue" />
                    </div>
                )}

                <div className="stat-card stat-card-green">
                    <div className="stat-icon stat-icon-green"><Download size={24} /></div>
                    <div className="stat-content">
                        <p className="stat-label">{t.downloads}</p>
                        <p className="stat-value">{stats?.downloadsCount ?? 0}</p>
                    </div>
                    <div className="card-blob blob-green" />
                </div>

                <div className="stat-card stat-card-yellow">
                    <div className="stat-icon stat-icon-yellow"><Star size={24} /></div>
                    <div className="stat-content">
                        <p className="stat-label">{t.ratings}</p>
                        <p className="stat-value">{stats?.ratingsGiven ?? 0}</p>
                    </div>
                    <div className="card-blob blob-yellow" />
                </div>

                <div className="stat-card stat-card-purple">
                    <div className="stat-icon stat-icon-purple"><FileText size={24} /></div>
                    <div className="stat-content">
                        <p className="stat-label">{t.total}</p>
                        <p className="stat-value">{stats?.totalMaterials ?? 0}</p>
                    </div>
                    <div className="card-blob blob-purple" />
                </div>
            </div>

            {/* ── Content Row: Trending + Top Rated Chart ── */}
            <div className="dashboard-content-row">

                {/* Left: Trending */}
                <div className="section-card dashboard-main-col">
                    <div className="section-header">
                        <span className="section-emoji">🔥</span>
                        <h2>
                            {user?.roles?.some(r => r.name === 'teacher') ? t.trendingTeacher
                             : user?.roles?.some(r => r.name === 'admin') ? t.trendingAdmin
                             : t.trending}
                        </h2>
                        <span className="section-badge">{trendingMaterials.length}</span>
                    </div>

                    {trendingMaterials.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon-wrapper"><TrendingUp size={32} /></div>
                            <p>{t.noTrending}</p>
                            <span className="empty-sub">{t.checkSoon}</span>
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
                                    <div className="material-file-icon"><FileIcon type={material.fileType || material.file_type} /></div>
                                    <div className="material-info">
                                        <h3>{material.title}</h3>
                                        <p>{material.description}</p>
                                    </div>
                                    <div className="material-meta">
                                        {(material.fileType || material.file_type) && (
                                            <span className="meta-chip chip-type">{(material.fileType || material.file_type).toUpperCase()}</span>
                                        )}
                                        <span className="meta-chip chip-downloads">↓ {material.downloadCount ?? material.download_count ?? 0}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Top Rated Bar Chart */}
                <div className="section-card dashboard-chart-col">
                    <div className="section-header">
                        <span className="section-emoji"><BarChart3 size={22} /></span>
                        <h2>{t.topRated}</h2>
                    </div>

                    {topRated.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon-wrapper"><Star size={32} /></div>
                            <p>{t.noRatings}</p>
                            <span className="empty-sub">{t.rateFirst}</span>
                        </div>
                    ) : (
                        <RatingBarChart
                            materials={topRated}
                            onBarClick={(id) => navigate(`/materials/${id}`)}
                        />
                    )}
                </div>
            </div>

            {/* ── Recent ── */}
            <div className="section-card">
                <div className="section-header">
                    <span className="section-emoji">🕐</span>
                    <h2>{t.recent}</h2>
                    <span className="section-badge">{recentMaterials.length}</span>
                </div>

                {recentMaterials.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon-wrapper"><FolderOpen size={32} /></div>
                        <p>{t.noMaterials}</p>
                        <span className="empty-sub">{t.uploadFirst}</span>
                    </div>
                ) : (
                    <div className="materials-list">
                        {recentMaterials.map((material) => (
                            <div
                                key={material.id}
                                className="material-item"
                                onClick={() => navigate(`/materials/${material.id}`)}
                            >
                                <div className="material-file-icon"><FileIcon type={material.file_type} /></div>
                                <div className="material-info">
                                    <h3>{material.title}</h3>
                                    <p>{material.description}</p>
                                </div>
                                <div className="material-meta">
                                    {material.file_type && (
                                        <span className="meta-chip chip-type">{material.file_type.toUpperCase()}</span>
                                    )}
                                    <span className="meta-chip chip-downloads">↓ {material.download_count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};
