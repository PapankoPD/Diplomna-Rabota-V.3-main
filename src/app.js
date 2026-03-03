const express = require('express'); // triggering restart
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { helmetConfig, corsConfig, globalLimiter, sanitizeInput } = require('./middleware/security');

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(corsConfig);

// Request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use(globalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/taxonomy', require('./routes/taxonomy'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/search', require('./routes/search'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/ratings', require('./routes/ratings'));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Auth & RBAC API with Material Management',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            users: '/api/users',
            roles: '/api/roles',
            materials: '/api/materials',
            taxonomy: '/api/taxonomy',
            search: '/api/search',
            groups: '/api/groups',
            recommendations: '/api/recommendations',
            comments: '/api/comments',
            ratings: '/api/ratings'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation'
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

module.exports = app;
