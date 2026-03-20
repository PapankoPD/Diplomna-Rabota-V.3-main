import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { materialsApi } from '../api/materialsApi';
import { taxonomyApi } from '../api/taxonomyApi';
import { searchApi } from '../api/searchApi';
import { StarRating } from '../components/ratings/StarRating';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, Filter, Download, X, ChevronDown, GraduationCap, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatFileSize, formatRelativeTime, translateGradeName, translateSubjectName } from '../utils/formatters';
import './MaterialsPage.css';

const FILE_TYPES = {
    en: [
        { value: '', label: 'All Types' },
        { value: 'pdf', label: 'PDF' },
        { value: 'document', label: 'Documents' },
        { value: 'image', label: 'Images' },
        { value: 'video', label: 'Videos' },
        { value: 'application', label: 'Applications' },
    ],
    bg: [
        { value: '', label: 'Всички типове' },
        { value: 'pdf', label: 'PDF' },
        { value: 'document', label: 'Документи' },
        { value: 'image', label: 'Изображения' },
        { value: 'video', label: 'Видео' },
        { value: 'application', label: 'Приложения' },
    ]
};

const translations = {
    en: {
        title: "Learning Materials",
        subtitle: "Browse and download educational resources",
        filteredByClass: "Filtered by class:",
        clearClassFilter: "Clear class filter",
        searchPlaceholder: "Search materials...",
        filtersBtn: "Filters",
        sortNewest: "Newest First",
        sortOldest: "Oldest First",
        sortPopular: "Most Popular",
        sortHighest: "Highest Rated",
        sortAZ: "Title A–Z",
        lblFileType: "File Type",
        lblSubject: "Subject",
        allSubjects: "All Subjects",
        lblTopic: "Theme/Topic",
        allTopics: "All Themes",
        lblGrade: "Grade",
        allGrades: "All Grades",
        clearAll: "Clear All",
        noMaterials: "No materials found",
        clearAndTryAgain: "Clear filters and try again",
        by: "By",
        addSubject: "Add theme/topic",
        previous: "Previous",
        next: "Next"
    },
    bg: {
        title: "Учебни материали",
        subtitle: "Разглеждайте и изтегляйте образователни ресурси",
        filteredByClass: "Филтрирано по клас:",
        clearClassFilter: "Изчисти филтъра за клас",
        searchPlaceholder: "Търсене на материали...",
        filtersBtn: "Филтри",
        sortNewest: "Най-новите първо",
        sortOldest: "Най-старите първо",
        sortPopular: "Най-популярните",
        sortHighest: "С най-висока оценка",
        sortAZ: "Заглавие А-Я",
        lblFileType: "Тип файл",
        lblSubject: "Предмет",
        allSubjects: "Всички предмети",
        lblTopic: "Тема/Урок",
        allTopics: "Всички теми",
        lblGrade: "Клас",
        allGrades: "Всички класове",
        clearAll: "Изчисти всички",
        noMaterials: "Не са намерени материали",
        clearAndTryAgain: "Изчистете филтрите и опитайте отново",
        by: "От",
        addSubject: "Добави тема/урок",
        previous: "Предишна",
        next: "Следваща"
    }
};

export const MaterialsPage = () => {
    const { language } = useLanguage();
    const t = translations[language];
    const fileTypes = FILE_TYPES[language];
    const { hasRole } = useAuth();
    const isAdmin = hasRole('admin');

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
    const [topicId, setTopicId] = useState('');
    const [gradeId, setGradeId] = useState(() => searchParams.get('gradeId') || '');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter options loaded from API
    const [subjects, setSubjects] = useState([]);
    const [grades, setGrades] = useState([]);
    const [topics, setTopics] = useState([]);

    // Load filter options on mount
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [subjectsData, gradesData] = await Promise.all([
                    taxonomyApi.getSubjects(),
                    taxonomyApi.getGrades()
                ]);
                if (subjectsData.data) setSubjects(subjectsData.data.subjects || subjectsData.data || []);
                if (gradesData.data) {
                    const allGrades = gradesData.data.grades || gradesData.data || [];
                    const allowedCodes = ['8', '9', '10', '11', '12'];
                    const filteredGrades = allGrades.filter(g => allowedCodes.includes(g.code));
                    setGrades(filteredGrades);
                }
            } catch (err) {
                console.error('Failed to load filter options:', err);
            }
        };
        loadFilterOptions();
    }, []);

    useEffect(() => {
        loadMaterials();
    }, [page, debouncedSearch, fileType, subjectId, topicId, gradeId, sortBy, sortOrder]);

    // Load topics when subject changes
    useEffect(() => {
        const loadTopics = async () => {
            if (!subjectId) {
                setTopics([]);
                setTopicId('');
                return;
            }
            try {
                // Determine subject code from ID
                const subject = subjects.find(s => s.id === parseInt(subjectId));
                if (subject) {
                    const res = await taxonomyApi.getTopics(subject.code);
                    setTopics(res.data?.topics || []);
                }
            } catch (err) {
                console.error('Failed to load topics:', err);
            }
        };
        loadTopics();
    }, [subjectId, subjects]);

    const loadMaterials = async () => {
        setIsLoading(true);
        try {
            const params = {
                page,
                limit: 9,
                sortBy,
                sortOrder,
            };

            if (debouncedSearch) params.q = debouncedSearch;
            if (fileType) params.fileType = fileType;
            if (subjectId) params.subjectId = subjectId;
            if (topicId) params.topicId = topicId;
            if (gradeId) params.gradeId = gradeId;

            // Use search endpoint ONLY if there's a text query or taxonomy filters
            let response;
            if (debouncedSearch || fileType || subjectId || topicId || gradeId) {
                response = await searchApi.searchMaterials(params);
            } else {
                response = await materialsApi.getMaterials(params);
            }
            
            const materialsArray = response.data?.materials || response.data || [];
            const paginationData = response.data?.pagination || response.pagination || {};

            setMaterials(materialsArray);
            setTotalPages(paginationData.totalPages || 1);
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
        setTopicId('');
        setGradeId('');
        setSortBy('created_at');
        setSortOrder('desc');
        setSearch('');
        setPage(1);
        setActiveClassName('');
    };

    const renderPagination = () => {
        const pages = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            pages.push(
                <button key={1} onClick={() => setPage(1)} className={page === 1 ? 'active' : ''}>1</button>
            );
            if (startPage > 2) {
                pages.push(<span key="ellipsis-start" className="pagination-ellipsis">...</span>);
            }
        }

        for (let p = startPage; p <= endPage; p++) {
            pages.push(
                <button key={p} onClick={() => setPage(p)} className={page === p ? 'active' : ''}>
                    {p}
                </button>
            );
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<span key="ellipsis-end" className="pagination-ellipsis">...</span>);
            }
            pages.push(
                <button key={totalPages} onClick={() => setPage(totalPages)} className={page === totalPages ? 'active' : ''}>
                    {totalPages}
                </button>
            );
        }

        return pages;
    };

    const hasActiveFilters = fileType || subjectId || topicId || gradeId || sortBy !== 'created_at' || search || activeClassName;

    if (isLoading && materials.length === 0) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <div className="materials-page">
            <div className="materials-header">
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
            </div>

            {activeClassName && (
                <div className="class-filter-banner">
                    <GraduationCap size={16} />
                    <span>{t.filteredByClass} <strong>{activeClassName}</strong></span>
                    <button className="class-filter-clear" onClick={clearFilters} title={t.clearClassFilter}>
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="materials-controls">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder={t.searchPlaceholder}
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
                    {t.filtersBtn}
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
                        <option value="created_at-desc">{t.sortNewest}</option>
                        <option value="created_at-asc">{t.sortOldest}</option>
                        <option value="download_count-desc">{t.sortPopular}</option>
                        <option value="average_rating-desc">{t.sortHighest}</option>
                        <option value="title-asc">{t.sortAZ}</option>
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>

            {showFilters && (
                <div className="filter-panel">
                    <div className="filter-group">
                        <label>{t.lblFileType}</label>
                        <select
                            value={fileType}
                            onChange={(e) => { setFileType(e.target.value); setPage(1); }}
                        >
                            {fileTypes.map(ft => (
                                <option key={ft.value} value={ft.value}>{ft.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t.lblSubject}</label>
                        <select
                            value={subjectId}
                            onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}
                        >
                            <option value="">{t.allSubjects}</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{translateSubjectName(s.name, language)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t.lblTopic}</label>
                        <select
                            value={topicId}
                            onChange={(e) => { setTopicId(e.target.value); setPage(1); }}
                            disabled={!subjectId}
                        >
                            <option value="">{t.allTopics}</option>
                            {topics.map(topic => (
                                <option key={topic.id} value={topic.id}>{topic.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t.lblGrade}</label>
                        <select
                            value={gradeId}
                            onChange={(e) => { setGradeId(e.target.value); setPage(1); }}
                        >
                            <option value="">{t.allGrades}</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>{translateGradeName(g.name, language)}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', alignSelf: 'flex-end', height: '38px' }}>
                        {hasActiveFilters && (
                            <button className="clear-filters-btn" style={{ height: '34px', alignSelf: 'center' }} onClick={clearFilters}>
                                <X size={14} />
                                {t.clearAll}
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                type="button"
                                className="add-subject-btn"
                                title={t.addSubject}
                                onClick={() => navigate('/admin/topics')}
                                style={{ height: '34px' }}
                            >
                                <Plus size={15} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isLoading ? (
                <LoadingSpinner />
            ) : materials.length === 0 ? (
                <div className="empty-state">
                    <p>{t.noMaterials}</p>
                    {hasActiveFilters && (
                        <button className="clear-filters-link" onClick={clearFilters}>
                            {t.clearAndTryAgain}
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
                                    <span>{t.by} {material.uploader_username}</span>
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
                                className="pagination-nav-btn"
                            >
                                <ChevronLeft size={16} />
                                {t.previous}
                            </button>

                            <div className="pagination-numbers">
                                {renderPagination()}
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="pagination-nav-btn"
                            >
                                {t.next}
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
