import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchApi } from '../api/searchApi';
import { taxonomyApi } from '../api/taxonomyApi';
import { StarRating } from '../components/ratings/StarRating';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Search, FileText, Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFileSize } from '../utils/formatters';
import './SearchPage.css';

export const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialQuery = searchParams.get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [fileType, setFileType] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [sortBy, setSortBy] = useState('relevance');

    // Filter options
    const [subjects, setSubjects] = useState([]);
    const [grades, setGrades] = useState([]);

    useEffect(() => {
        loadFilterOptions();
    }, []);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setQuery(q);
            performSearch(q, 1);
        }
    }, [searchParams.get('q')]);

    const loadFilterOptions = async () => {
        try {
            const [subjectsRes, gradesRes] = await Promise.all([
                taxonomyApi.getSubjects(),
                taxonomyApi.getGrades()
            ]);
            setSubjects(subjectsRes.data?.subjects || []);
            setGrades(gradesRes.data?.grades || []);
        } catch (err) {
            console.error('Failed to load filter options:', err);
        }
    };

    const performSearch = async (searchQuery, page = 1) => {
        if (!searchQuery.trim()) return;
        setIsLoading(true);
        try {
            const params = {
                q: searchQuery.trim(),
                page,
                limit: 12,
                sortBy,
                sortOrder: 'desc'
            };
            if (fileType) params.fileType = fileType;
            if (subjectId) params.subjectId = subjectId;
            if (gradeId) params.gradeId = gradeId;

            const response = await searchApi.searchMaterials(params);
            setResults(response.data?.materials || []);
            setPagination(response.data?.pagination || { page: 1, total: 0, totalPages: 0 });
        } catch (err) {
            console.error('Search failed:', err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            setSearchParams({ q: query.trim() });
        }
    };

    const handlePageChange = (newPage) => {
        performSearch(query, newPage);
        window.scrollTo(0, 0);
    };

    const handleFilterApply = () => {
        performSearch(query, 1);
    };

    const handleClearFilters = () => {
        setFileType('');
        setSubjectId('');
        setGradeId('');
        setSortBy('relevance');
        performSearch(query, 1);
    };

    const fileTypes = [
        { value: '', label: 'All Types' },
        { value: 'pdf', label: 'PDF' },
        { value: 'document', label: 'Documents' },
        { value: 'image', label: 'Images' },
        { value: 'video', label: 'Videos' },
        { value: 'application', label: 'Applications' }
    ];

    return (
        <div className="search-page">
            <div className="search-page-header">
                <h1>Search Materials</h1>
                <form onSubmit={handleSearch} className="search-page-form">
                    <Search size={20} className="search-form-icon" />
                    <input
                        type="text"
                        placeholder="Search by title, description..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="btn-search">Search</button>
                </form>
            </div>

            <div className="search-controls">
                <button
                    className={`btn-filter ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={16} />
                    Filters
                </button>
                {pagination.total > 0 && (
                    <span className="results-count">
                        {pagination.total} result{pagination.total !== 1 ? 's' : ''} found
                    </span>
                )}
                <div className="sort-control">
                    <label>Sort by:</label>
                    <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); }}>
                        <option value="relevance">Relevance</option>
                        <option value="created_at">Newest</option>
                        <option value="download_count">Most Downloaded</option>
                        <option value="average_rating">Highest Rated</option>
                    </select>
                </div>
            </div>

            {showFilters && (
                <div className="filters-panel">
                    <div className="filter-group">
                        <label>File Type</label>
                        <select value={fileType} onChange={(e) => setFileType(e.target.value)}>
                            {fileTypes.map(ft => (
                                <option key={ft.value} value={ft.value}>{ft.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Subject</label>
                        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                            <option value="">All Subjects</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Grade</label>
                        <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                            <option value="">All Grades</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-actions">
                        <button className="btn-apply" onClick={handleFilterApply}>Apply</button>
                        <button className="btn-clear" onClick={handleClearFilters}>Clear</button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <LoadingSpinner />
            ) : results.length > 0 ? (
                <>
                    <div className="search-results-grid">
                        {results.map(material => (
                            <div
                                key={material.id}
                                className="search-result-card"
                                onClick={() => navigate(`/materials/${material.id}`)}
                            >
                                <div className="result-icon">
                                    <FileText size={28} />
                                </div>
                                <div className="result-info">
                                    <h3>{material.title}</h3>
                                    <p className="result-description">
                                        {material.description
                                            ? material.description.substring(0, 120) + (material.description.length > 120 ? '...' : '')
                                            : 'No description'}
                                    </p>
                                    <div className="result-meta">
                                        <span className="result-type">{material.file_type?.split('/').pop()}</span>
                                        <span className="result-size">{formatFileSize(material.file_size)}</span>
                                        {material.average_rating > 0 && (
                                            <span className="result-rating">
                                                <StarRating rating={material.average_rating} readonly size="small" />
                                            </span>
                                        )}
                                        <span className="result-downloads">
                                            <Download size={12} /> {material.download_count || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="search-pagination">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => handlePageChange(pagination.page - 1)}
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <span className="page-info">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            ) : initialQuery ? (
                <div className="no-results">
                    <Search size={48} />
                    <h3>No results found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                </div>
            ) : (
                <div className="no-results">
                    <Search size={48} />
                    <h3>Search for materials</h3>
                    <p>Enter a search term to find learning materials.</p>
                </div>
            )}
        </div>
    );
};
