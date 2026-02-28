
const express = require('express');
const { query, validationResult } = require('express-validator');
const app = express();

const handleValidationErrors = (req, res, next) => {
    console.log('Inside handleValidationErrors');
    try {
        const errors = validationResult(req);
        console.log('Errors object:', errors);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    } catch (err) {
        console.error('Error in handleValidationErrors:', err);
        res.status(500).send('Internal Server Error');
    }
};

const validatePagination = [
    query('page').optional().isInt(),
    handleValidationErrors
];

app.get('/test', validatePagination, (req, res) => {
    res.send('OK');
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
