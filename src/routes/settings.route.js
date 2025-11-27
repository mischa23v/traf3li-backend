const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { userMiddleware } = require('../middlewares');
const {
    getCompanySettings,
    updateCompanySettings,
    uploadCompanyLogo,
    deleteCompanyLogo,
    getFinanceSettings,
    updateFinanceSettings,
    getNextNumber
} = require('../controllers/settings.controller');

const app = express.Router();

// Configure multer for file upload
const uploadDir = 'uploads/company';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|svg|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Company Settings
app.get('/company', userMiddleware, getCompanySettings);
app.put('/company', userMiddleware, updateCompanySettings);
app.post('/company/logo', userMiddleware, upload.single('file'), uploadCompanyLogo);
app.delete('/company/logo', userMiddleware, deleteCompanyLogo);

// Finance Settings
app.get('/finance', userMiddleware, getFinanceSettings);
app.put('/finance', userMiddleware, updateFinanceSettings);
app.post('/finance/next-number', userMiddleware, getNextNumber);

module.exports = app;
