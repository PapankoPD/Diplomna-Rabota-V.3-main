export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
        isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumber,
        hasSpecialChar,
    };
};

// Allowed file extensions - mirrors backend's EXTENSION_MIME_MAP in storage.js
const ALLOWED_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt',
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
    'mp4', 'webm', 'mov',
    'zip',
    'xls', 'xlsx',
    'apk'
];

// File input accept string for the file picker
export const ACCEPTED_FILE_TYPES = ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',');

export const validateFileType = (fileName) => {
    if (!fileName) return { isValid: false, message: 'No file provided' };
    const ext = fileName.split('.').pop().toLowerCase();
    const isValid = ALLOWED_EXTENSIONS.includes(ext);
    return {
        isValid,
        message: isValid ? null : `Warning: You are trying to upload an invalid file type (".${ext}"). Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
};

export const validateFileSize = (sizeInBytes, maxSizeInMB = 50) => {
    if (sizeInBytes == null) return { isValid: false, message: 'No file provided' };
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    const isValid = sizeInBytes <= maxSizeInBytes;
    return {
        isValid,
        message: isValid ? null : `File size exceeds ${maxSizeInMB}MB limit`
    };
};
