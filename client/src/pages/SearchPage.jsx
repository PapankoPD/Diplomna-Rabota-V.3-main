import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { searchApi } from '../api/searchApi';
import { taxonomyApi } from '../api/taxonomyApi';
import { StarRating } from '../components/ratings/StarRating';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, FileText, Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFileSize } from '../utils/formatters';
import './SearchPage.css';

const translations = {
    en: {
        pageTitle: "Search Materials",
        searchPlaceholder: "Search by title, description...",
        searchBtn: "Search",
        filters: "Filters",
        resultFound: "result found",
        resultsFound: "results found",
        sortBy: "Sort by:",
        sortRelevance: "Relevance",
        sortNewest: "Newest",
        sortMostDownloaded: "Most Downloaded",
        sortHighestRated: "Highest Rated",
        fileType: "File Type",
        allTypes: "All Types",
        typePdf: "PDF",
        typeDoc: "Documents",
        typeImg: "Images",
        typeVid: "Videos",
        typeApp: "Applications",
        subject: "Subject",
        allSubjects: "All Subjects",
        grade: "Grade",
        allGrades: "All Grades",
        applyBtn: "Apply",
        clearBtn: "Clear",
        noDesc: "No description",
        prev: "Previous",
        pageOf: (page, total) => `Page ${page} of ${total}`,
        next: "Next",
        noResultsTitle: "No results found",
        noResultsDesc: "Try adjusting your search terms or filters.",
        searchHeroTitle: "Search for materials",
        searchHeroDesc: "Enter a search term to find learning materials."
    },
    bg: {
        pageTitle: "Търсене на материали",
        searchPlaceholder: "Търсене по заглавие, описание...",
        searchBtn: "Търсене",
        filters: "Филтри",
        resultFound: "намерен резултат",
        resultsFound: "намерени резултата",
        sortBy: "Сортиране по:",
        sortRelevance: "Уместност",
        sortNewest: "Най-нови",
        sortMostDownloaded: "Най-теглени",
        sortHighestRated: "Най-високо оценени",
        fileType: "Тип файл",
        allTypes: "Всички типове",
        typePdf: "PDF",
        typeDoc: "Документи",
        typeImg: "Изображения",
        typeVid: "Видеоклипове",
        typeApp: "Приложения",
        subject: "Предмет",
        allSubjects: "Всички предмети",
        grade: "Клас",
        allGrades: "Всички класове",
        applyBtn: "Приложи",
        clearBtn: "Изчисти",
        noDesc: "Няма описание",
        prev: "Предишна",
        pageOf: (page, total) => `Страница ${page} от ${total}`,
        next: "Следваща",
        noResultsTitle: "Няма намерени резултати",
        noResultsDesc: "Опитайте да коригирате думите за търсене или филтрите.",
        searchHeroTitle: "Търсете материали",
        searchHeroDesc: "Въведете дума за търсене, за да намерите учебни материали."
    }
};

export const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = translations[language];

    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);
    const debouncedQuery = useDebounce(query, 400);

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

    // Live search when debouncedQuery changes
    useEffect(() => {
        if (debouncedQuery.trim() !== (searchParams.get('q') || '')) {
            if (debouncedQuery.trim()) {
                setSearchParams({ q: debouncedQuery.trim() });
            } else if (searchParams.has('q')) {
                setSearchParams({});
                setResults([]);
                setPagination({ page: 1, total: 0, totalPages: 0 });
            }
        }
    }, [debouncedQuery, searchParams, setSearchParams]);

    // Perform search when URL params change
    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            if (query !== q) setQuery(q); // Sync input if accessed directly via URL
            performSearch(q, 1);
        } else {
            setResults([]);
            setPagination({ page: 1, total: 0, totalPages: 0 });
            if (query) setQuery('');
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
                limit: 9,
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
        { value: '', label: t.allTypes },
        { value: 'pdf', label: t.typePdf },
        { value: 'document', label: t.typeDoc },
        { value: 'image', label: t.typeImg },
        { value: 'video', label: t.typeVid },
        { value: 'application', label: t.typeApp }
    ];

    return (
        <div className="search-page">
            <div className="search-page-header">
                <h1>{t.pageTitle}</h1>
                <form onSubmit={handleSearch} className="search-page-form">
                    <Search size={20} className="search-form-icon" />
                    <input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="btn-search">{t.searchBtn}</button>
                </form>
            </div>

            <div className="search-controls">
                <button
                    className={`btn-filter ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={16} />
                    {t.filters}
                </button>
                {pagination.total > 0 && (
                    <span className="results-count">
                        {pagination.total} {pagination.total !== 1 ? t.resultsFound : t.resultFound}
                    </span>
                )}
                <div className="sort-control">
                    <label>{t.sortBy}</label>
                    <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); }}>
                        <option value="relevance">{t.sortRelevance}</option>
                        <option value="created_at">{t.sortNewest}</option>
                        <option value="download_count">{t.sortMostDownloaded}</option>
                        <option value="average_rating">{t.sortHighestRated}</option>
                    </select>
                </div>
            </div>

            {showFilters && (
                <div className="filters-panel">
                    <div className="filter-group">
                        <label>{t.fileType}</label>
                        <select value={fileType} onChange={(e) => setFileType(e.target.value)}>
                            {fileTypes.map(ft => (
                                <option key={ft.value} value={ft.value}>{ft.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t.subject}</label>
                        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                            <option value="">{t.allSubjects}</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t.grade}</label>
                        <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                            <option value="">{t.allGrades}</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-actions">
                        <button className="btn-apply" onClick={handleFilterApply}>{t.applyBtn}</button>
                        <button className="btn-clear" onClick={handleClearFilters}>{t.clearBtn}</button>
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
                                            : t.noDesc}
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
                                <ChevronLeft size={16} /> {t.prev}
                            </button>
                            <span className="page-info">
                                {t.pageOf(pagination.page, pagination.totalPages)}
                            </span>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                            >
                                {t.next} <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            ) : initialQuery ? (
                <div className="no-results">
                    <Search size={48} />
                    <h3>{t.noResultsTitle}</h3>
                    <p>{t.noResultsDesc}</p>
                </div>
            ) : (
                <div className="no-results">
                    <Search size={48} />
                    <h3>{t.searchHeroTitle}</h3>
                    <p>{t.searchHeroDesc}</p>
                </div>
            )}
        </div>
    );
};
