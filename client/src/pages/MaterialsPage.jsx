import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { materialsApi } from '../api/materialsApi';
import { taxonomyApi } from '../api/taxonomyApi';
import { searchApi } from '../api/searchApi';
import { StarRating } from '../components/ratings/StarRating';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Search, Filter, Download, X, ChevronDown, GraduationCap } from 'lucide-react';
import { formatFileSize, formatRelativeTime } from '../utils/formatters';
import './MaterialsPage.css';

const FILE_TYPES = [
    { value: '', label: 'All Types' },
    { value: 'pdf', label: 'PDF' },
    { value: 'document', label: 'Documents' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
    { value: 'application', label: 'Applications' },
];

export const MaterialsPage = () => {
    const [searchParams] = useSearchParams();
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState(() => searchParams.get('q') || '');
    const debouncedSearch = useDebounce(search, 400);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const navigate = useNavigate();

    // Class filter banner (from grade class navigation)
    const [activeClassName, setActiveClassName] = useState(() => searchParams.get('class') || '');

    // Filter state
    const [fileType, setFileType] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [gradeId, setGradeId] = useState(() => searchParams.get('gradeId') || '');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter options loaded from API
    const [subjects, setSubjects] = useState([]);
    const [grades, setGrades] = useState([]);

    // Load filter options on mount
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [subjectsData, gradesData] = await Promise.all([
                    taxonomyApi.getSubjects(),
                    taxonomyApi.getGrades()
                ]);
                if (subjectsData.data) setSubjects(subjectsData.data.subjects || subjectsData.data || []);
                if (gradesData.data) setGrades(gradesData.data.grades || gradesData.data || []);
            } catch (err) {
                console.error('Failed to load filter options:', err);
            }
        };
        loadFilterOptions();
    }, []);

    useEffect(() => {
        loadMaterials();
    }, [page, debouncedSearch, fileType, subjectId, gradeId, sortBy, sortOrder]);

    const loadMaterials = async () => {
        setIsLoading(true);
        try {
            const params = {
                page,
                limit: 12,
                sortBy,
                sortOrder,
            };

            if (debouncedSearch) params.q = debouncedSearch;
            if (fileType) params.fileType = fileType;
            if (subjectId) params.subjectId = subjectId;
            if (gradeId) params.gradeId = gradeId;

            // Use search endpoint if there's a text query or filters
            let response;
            if (debouncedSearch || fileType || subjectId || gradeId || sortBy !== 'created_at') {
                response = await searchApi.searchMaterials(params);
            } else {
                response = await materialsApi.getMaterials(params);
            }

            setMaterials(response.data?.materials || response.data || []);
            setTotalPages(response.data?.pagination?.totalPages || 1);
        } catch (error) {
            console.error('Failed to load materials:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleMaterialClick = (id) => {
        navigate(`/materials/${id}`);
    };

    const clearFilters = () => {
        setFileType('');
        setSubjectId('');
        setGradeId('');
        setSortBy('created_at');
        setSortOrder('desc');
        setSearch('');
        setPage(1);
        setActiveClassName('');
    };

    const hasActiveFilters = fileType || subjectId || gradeId || sortBy !== 'created_at' || search || activeClassName;

    if (isLoading && materials.length === 0) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <div className="materials-page">
            <div className="materials-header">
                <h1>Learning Materials</h1>
                <p>Browse and download educational resources</p>
            </div>

            {activeClassName && (
                <div className="class-filter-banner">
                    <GraduationCap size={16} />
                    <span>Filtered by class: <strong>{activeClassName}</strong></span>
                    <button className="class-filter-clear" onClick={clearFilters} title="Clear class filter">
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="materials-controls">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={search}
                        onChange={handleSearch}
                    />
                    {search && (
                        <button className="clear-search" onClick={() => { setSearch(''); setPage(1); }}>
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button
                    className={`filter-btn ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={20} />
                    Filters
                    {hasActiveFilters && <span className="filter-badge" />}
                </button>
                <div className="sort-control">
                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [sb, so] = e.target.value.split('-');
                            setSortBy(sb);
                            setSortOrder(so);
                            setPage(1);
                        }}
                    >
                        <option value="created_at-desc">Newest First</option>
                        <option value="created_at-asc">Oldest First</option>
                        <option value="download_count-desc">Most Popular</option>
                        <option value="average_rating-desc">Highest Rated</option>
                        <option value="title-asc">Title A–Z</option>
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>

            {showFilters && (
                <div className="filter-panel">
                    <div className="filter-group">
                        <label>File Type</label>
                        <select
                            value={fileType}
                            onChange={(e) => { setFileType(e.target.value); setPage(1); }}
                        >
                            {FILE_TYPES.map(ft => (
                                <option key={ft.value} value={ft.value}>{ft.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Subject</label>
                        <select
                            value={subjectId}
                            onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Grade</label>
                        <select
                            value={gradeId}
                            onChange={(e) => { setGradeId(e.target.value); setPage(1); }}
                        >
                            <option value="">All Grades</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                    {hasActiveFilters && (
                        <button className="clear-filters-btn" onClick={clearFilters}>
                            <X size={14} />
                            Clear All
                        </button>
                    )}
                </div>
            )}

            {isLoading ? (
                <LoadingSpinner />
            ) : materials.length === 0 ? (
                <div className="empty-state">
                    <p>No materials found</p>
                    {hasActiveFilters && (
                        <button className="clear-filters-link" onClick={clearFilters}>
                            Clear filters and try again
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="materials-grid">
                        {materials.map((material) => (
                            <div
                                key={material.id}
                                className="material-card"
                                onClick={() => handleMaterialClick(material.id)}
                            >
                                <div className="material-card-header">
                                    <h3>{material.title}</h3>
                                    <div className="material-rating">
                                        <StarRating rating={material.average_rating || 0} readonly size="small" />
                                        <span className="rating-count">({material.rating_count || 0})</span>
                                    </div>
                                </div>
                                <p className="material-description">{material.description}</p>
                                <div className="material-card-footer">
                                    <span className="material-type">{material.file_type}</span>
                                    <span className="material-size">{formatFileSize(material.file_size)}</span>
                                    <span className="material-downloads">
                                        <Download size={14} />
                                        {material.download_count}
                                    </span>
                                </div>
                                <div className="material-meta">
                                    <span>By {material.uploader_username}</span>
                                    <span>{formatRelativeTime(material.created_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </button>
                            <span>Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
