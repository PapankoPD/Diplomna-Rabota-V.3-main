const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    // Debug logging
    console.log('handleValidationErrors called');
    if (!req) {
        console.error('req is undefined in handleValidationErrors');
        return next(new Error('req is undefined'));
    }

    try {
        const errors = validationResult(req);
        console.log('validationResult returned:', errors);

        if (!errors.isEmpty()) {
            console.log('Validation errors found:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    } catch (err) {
        console.error('Error in handleValidationErrors:', err);
        next(err);
    }
};

/**
 * Registration validation rules
 */
const validateRegistration = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
        .withMessage('Password must contain at least one special character'),
    handleValidationErrors
];

/**
 * Login validation rules
 */
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

/**
 * Token refresh validation
 */
const validateRefreshToken = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required'),
    handleValidationErrors
];

/**
 * UUID parameter validation
 */
/**
 * ID parameter validation (formerly UUID)
 * Now validates positive integers for SQLite
 */
const validateUUID = (paramName = 'id') => [
    param(paramName)
        .isInt({ min: 1 })
        .withMessage(`${paramName} must be a valid positive integer`),
    handleValidationErrors
];

/**
 * Role assignment validation
 */
const validateRoleAssignment = [
    body('roleIds')
        .isArray({ min: 1 })
        .withMessage('roleIds must be a non-empty array'),
    body('roleIds.*')
        .isInt({ min: 1 })
        .withMessage('Each roleId must be a valid positive integer'),
    handleValidationErrors
];

/**
 * Permission assignment validation
 */
const validatePermissionAssignment = [
    body('permissionIds')
        .isArray({ min: 1 })
        .withMessage('permissionIds must be a non-empty array'),
    body('permissionIds.*')
        .isInt({ min: 1 })
        .withMessage('Each permissionId must be a valid positive integer'),
    handleValidationErrors
];

/**
 * Role creation validation
 */
const validateRoleCreation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Role name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Role name can only contain letters, numbers, underscores, and hyphens'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

/**
 * Material upload validation
 */
const validateMaterialUpload = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Title must be between 3 and 255 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description must not exceed 2000 characters'),
    body('categoryIds')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    JSON.parse(value);
                    return true;
                } catch (e) {
                    throw new Error('categoryIds must be valid JSON array');
                }
            }
            return Array.isArray(value);
        })
        .withMessage('categoryIds must be an array'),
    body('categoryIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Each categoryId must be a valid positive integer'),
    body('subjectIds')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    throw new Error('subjectIds must be valid JSON array');
                }
            }
            return Array.isArray(value);
        })
        .withMessage('subjectIds must be an array'),
    body('subjectIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Each subjectId must be a valid positive integer'),
    body('topicIds')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    throw new Error('topicIds must be valid JSON array');
                }
            }
            return Array.isArray(value);
        })
        .withMessage('topicIds must be an array'),
    body('topicIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Each topicId must be a valid positive integer'),
    body('gradeIds')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    throw new Error('gradeIds must be valid JSON array');
                }
            }
            return Array.isArray(value);
        })
        .withMessage('gradeIds must be an array'),
    body('gradeIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Each gradeId must be a valid positive integer'),
    body('primarySubjectId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('primarySubjectId must be a valid positive integer'),
    body('primaryGradeId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('primaryGradeId must be a valid positive integer'),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean'),
    handleValidationErrors
];

/**
 * Material update validation
 */
const validateMaterialUpdate = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Title must be between 3 and 255 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description must not exceed 2000 characters'),
    body('categoryIds')
        .optional()
        .isArray()
        .withMessage('categoryIds must be an array'),
    body('categoryIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Each categoryId must be a valid positive integer'),
    body('subjectIds')
        .optional()
        .isArray()
        .withMessage('subjectIds must be an array'),
    body('subjectIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Each subjectId must be a valid positive integer'),
    body('topicIds')
        .optional()
        .isArray()
        .withMessage('topicIds must be an array'),
    body('topicIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Each topicId must be a valid positive integer'),
    body('gradeIds')
        .optional()
        .isArray()
        .withMessage('gradeIds must be an array'),
    body('gradeIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Each gradeId must be a valid positive integer'),
    body('primarySubjectId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('primarySubjectId must be a valid positive integer'),
    body('primaryGradeId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('primaryGradeId must be a valid positive integer'),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean'),
    handleValidationErrors
];

const validateCategoryCreation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    handleValidationErrors
];

/**
 * Permission grant validation for materials
 */
const validateMaterialPermissionGrant = [
    body('userId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('userId must be a valid positive integer'),
    body('roleId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('roleId must be a valid positive integer'),
    body('groupId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('groupId must be a valid positive integer'),
    body('permissionType')
        .isIn(['view', 'edit', 'delete'])
        .withMessage('permissionType must be view, edit, or delete'),
    body()
        .custom((value) => {
            const inputs = [value.userId, value.roleId, value.groupId];
            const providedCount = inputs.filter(val => val !== undefined && val !== null).length;

            if (providedCount === 0) {
                throw new Error('Either userId, roleId, or groupId must be provided');
            }
            if (providedCount > 1) {
                throw new Error('Provide only one of userId, roleId, or groupId');
            }
            return true;
        }),
    handleValidationErrors
];

/**
 * Subject creation validation
 */
const validateSubjectCreation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Subject name must be between 2 and 100 characters'),
    body('code')
        .trim()
        .isLength({ min: 2, max: 20 })
        .withMessage('Subject code must be between 2 and 20 characters')
        .matches(/^[A-Z0-9_-]+$/)
        .withMessage('Subject code must contain only uppercase letters, numbers, hyphens and underscores'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters'),
    body('icon')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Icon must not exceed 50 characters'),
    body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a non-negative integer'),
    handleValidationErrors
];

/**
 * Topic creation validation
 */
const validateTopicCreation = [
    body('subjectId')
        .isInt({ min: 1 })
        .withMessage('subjectId must be a valid positive integer'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage('Topic name must be between 2 and 150 characters'),
    body('code')
        .trim()
        .isLength({ min: 2, max: 30 })
        .withMessage('Topic code must be between 2 and 30 characters')
        .matches(/^[A-Z0-9_-]+$/)
        .withMessage('Topic code must contain only uppercase letters, numbers, hyphens and underscores'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters'),
    body('parentTopicId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('parentTopicId must be a valid positive integer'),
    body('difficultyLevel')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Difficulty level must be between 1 and 5'),
    body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a non-negative integer'),
    handleValidationErrors
];

/**
 * Grade creation validation
 */
const validateGradeCreation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Grade name must be between 1 and 50 characters'),
    body('code')
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage('Grade code must be between 1 and 20 characters')
        .matches(/^[A-Z0-9_-]+$/)
        .withMessage('Grade code must contain only uppercase letters, numbers, hyphens and underscores'),
    body('levelOrder')
        .isInt({ min: 0 })
        .withMessage('Level order must be a non-negative integer'),
    body('category')
        .isIn(['K12', 'UNDERGRADUATE', 'GRADUATE', 'PROFESSIONAL'])
        .withMessage('Category must be K12, UNDERGRADUATE, GRADUATE, or PROFESSIONAL'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    body('ageRange')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Age range must not exceed 20 characters'),
    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateRefreshToken,
    validateUUID,
    validateRoleAssignment,
    validatePermissionAssignment,
    validateRoleCreation,
    validatePagination,
    validateMaterialUpload,
    validateMaterialUpdate,
    validateCategoryCreation,
    validateMaterialPermissionGrant,
    validateSubjectCreation,
    validateTopicCreation,
    validateGradeCreation,
    handleValidationErrors
};
