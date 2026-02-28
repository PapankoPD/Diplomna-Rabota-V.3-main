import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { materialsApi } from '../api/materialsApi';
import { recommendationsApi } from '../api/recommendationsApi';
import { Upload, Download, Star, FileText, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import './DashboardPage.css';

export const DashboardPage = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentMaterials, setRecentMaterials] = useState([]);
    const [trendingMaterials, setTrendingMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                // Load recent materials
                const [recentResponse, trendingResponse] = await Promise.all([
                    materialsApi.getMaterials({
                        page: 1,
                        limit: 5,
                        sortBy: 'created_at',
                        sortOrder: 'desc'
                    }),
                    recommendationsApi.getTrending(5)
                ]);

                setRecentMaterials(recentResponse.data || []);
                if (trendingResponse.success) {
                    setTrendingMaterials(trendingResponse.data.trending || trendingResponse.data.recommendations || []);
                }

                // Mock stats - in production, you'd have a dedicated endpoint
                setStats({
                    uploadsCount: 0,
                    downloadsCount: 0,
                    ratingsGiven: 0,
                });
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h1>Welcome back, {user?.username}!</h1>
                <p>Here's what's happening with your learning materials</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dbeafe' }}>
                        <Upload size={24} color="#3b82f6" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Materials Uploaded</p>
                        <p className="stat-value">{stats?.uploadsCount || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dcfce7' }}>
                        <Download size={24} color="#16a34a" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Downloads</p>
                        <p className="stat-value">{stats?.downloadsCount || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7' }}>
                        <Star size={24} color="#f59e0b" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Ratings Given</p>
                        <p className="stat-value">{stats?.ratingsGiven || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#e0e7ff' }}>
                        <FileText size={24} color="#6366f1" />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Materials</p>
                        <p className="stat-value">{recentMaterials.length}</p>
                    </div>
                </div>
            </div>

            <div className="recent-section">
                <h2>Trending Now</h2>
                {trendingMaterials.length === 0 ? (
                    <div className="empty-state">
                        <TrendingUp size={48} color="#9ca3af" />
                        <p>No trending materials yet</p>
                    </div>
                ) : (
                    <div className="materials-list">
                        {trendingMaterials.map((material) => (
                            <div key={material.id} className="material-item">
                                <div className="material-info">
                                    <h3>{material.title}</h3>
                                    <p>{material.description}</p>
                                </div>
                                <div className="material-meta">
                                    <span>{material.file_type}</span>
                                    <span>{material.download_count} downloads</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="recent-section">
                <h2>Recent Materials</h2>
                {recentMaterials.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={48} color="#9ca3af" />
                        <p>No materials yet</p>
                    </div>
                ) : (
                    <div className="materials-list">
                        {recentMaterials.map((material) => (
                            <div key={material.id} className="material-item">
                                <div className="material-info">
                                    <h3>{material.title}</h3>
                                    <p>{material.description}</p>
                                </div>
                                <div className="material-meta">
                                    <span>{material.file_type}</span>
                                    <span>{material.download_count} downloads</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
