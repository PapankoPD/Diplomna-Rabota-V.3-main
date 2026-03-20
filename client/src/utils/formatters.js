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

/**
 * Translates grade names like "Grade 8" to the target language (e.g. "8 клас").
 */
export const translateGradeName = (gradeName, language) => {
    if (!gradeName) return '';
    if (language === 'bg' && gradeName.toLowerCase().startsWith('grade ')) {
        const num = gradeName.replace(/Grade /i, '').trim();
        return `${num} клас`;
    }
    return gradeName;
};

export const translateSubjectName = (subjectName, language) => {
    if (language !== 'bg' || !subjectName) return subjectName;
    const subjectMap = {
        'Mathematics': 'Математика',
        'Physics': 'Физика',
        'Science': 'Природни науки',
        'Chemistry': 'Химия',
        'Language Arts': 'Български език и литература',
        'Biology': 'Биология',
        'Social Studies': 'Обществени науки',
        'Arts': 'Изкуства',
        'Technology': 'Технологии',
        'Physical Education': 'Физическо възпитание',
        'Computer Science': 'Информатика',
        'History': 'История',
        'Geography': 'География',
        'English': 'Английски език',
        'Music': 'Музика',
        'Literature': 'Литература'
    };
    return subjectMap[subjectName] || subjectName;
};

export const translateSubjectDescription = (desc, language) => {
    if (language !== 'bg' || !desc) return desc;
    const descMap = {
        'Mathematical concepts, problem-solving, and computational thinking': 'Математически концепции, решаване на проблеми и изчислително мислене',
        'Natural sciences including physics, chemistry, and biology': 'Природни науки, включително физика, химия и биология',
        'Reading, writing, literature, and communication skills': 'Четене, писане, литература и комуникационни умения',
        'History, geography, civics, and cultural studies': 'История, география, гражданско образование и културология',
        'Visual and performing arts, music, and creative expression': 'Визуални и сценични изкуства, музика и творческо изразяване',
        'Computer science, programming, and digital literacy': 'Компютърни науки, програмиране и дигитална грамотност',
        'Physical fitness, sports, and health education': 'Физическа активност, спорт и здравно образование',
        'Physical sciences and natural phenomena': 'Физични науки и природни явления',
        'Chemical sciences and reactions': 'Химични науки и реакции',
        'Life sciences and living organisms': 'Науки за живота и живите организми',
        'Study of living organisms': 'Наука за живите организми',
        'Study of matter and chemical reactions': 'Наука за материята и химичните реакции',
        'Study of matter, energy, and forces': 'Наука за материята, енергията и силите',
        'Study of Earth and its systems': 'Наука за земята и нейните системи'
    };
    return descMap[desc] || desc;
};

export const translateSubjectCode = (code, language) => {
    if (language !== 'bg' || !code) return code;
    const codeMap = {
        'MATH': 'МАТ',
        'SCI': 'ПРИР',
        'LANG': 'БЕЛ',
        'SOC': 'ОБЩ',
        'ART': 'ИЗК',
        'TECH': 'ИТ',
        'PE': 'ФВС',
        'PHYS': 'ФИЗ',
        'CHEM': 'ХИМ',
        'BIO': 'БИО',
        'ENG': 'АЕ',
        'HIST': 'ИСТ',
        'GEO': 'ГЕО',
        'MUS': 'МУЗ',
        'LIT': 'ЛИТ',
        'CS': 'ИНФ'
    };
    return codeMap[code.toUpperCase()] || code;
};
