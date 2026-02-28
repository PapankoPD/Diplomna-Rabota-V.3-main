export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Normalize a date string from SQLite (which has no timezone) 
 * by treating it as UTC so toLocaleString converts it to local time correctly.
 */
const normalizeDate = (date) => {
    if (!date) return new Date();
    const str = String(date);
    // If the string has no timezone indicator (Z, +, or T...+/-), treat as UTC
    if (!str.includes('Z') && !str.includes('+') && !/T.*[+-]\d{2}/.test(str)) {
        return new Date(str.replace(' ', 'T') + 'Z');
    }
    return new Date(str);
};

export const formatDate = (date) => {
    const d = normalizeDate(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export const formatRelativeTime = (date) => {
    const now = new Date();
    const then = normalizeDate(date);
    const diffInSeconds = Math.floor((now - then) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return formatDate(date);
};

export const formatDateTime = (date) => {
    const d = normalizeDate(date);
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
