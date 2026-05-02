const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const ExcelJS = require('exceljs');
const universalParser = require('./parsers/universalParser');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Configure Winston Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Main Extraction Endpoint
app.post('/api/v1/extract', upload.fields([
    { name: 'document', maxCount: 10 }, // Increased to allow multiple images
    { name: 'template', maxCount: 1 }
]), async (req, res) => {
    const sessionId = uuidv4();
    logger.info(`Started extraction session: ${sessionId}`);

    try {
        if (!req.files || !req.files['document']) {
            return res.status(400).json({ error: 'Source document is required' });
        }

        const documentFiles = req.files['document'];
        const templateFile = req.files['template'] ? req.files['template'][0] : null;

        logger.info(`Processing ${documentFiles.length} documents...`);

        let combinedRows = [];
        let combinedHeaders = new Set();
        let firstMetadata = null;

        for (const documentFile of documentFiles) {
            logger.info(`Starting parser for: ${documentFile.originalname}`);
            const extractionResult = await universalParser.parse(documentFile.path, documentFile.originalname);
            logger.info(`Parser finished with ${extractionResult.rows.length} rows for ${documentFile.originalname}`);
            
            combinedRows = combinedRows.concat(extractionResult.rows);
            if (extractionResult.headers) {
                extractionResult.headers.forEach(h => combinedHeaders.add(h));
            }
            if (!firstMetadata && extractionResult.metadata) {
                firstMetadata = extractionResult.metadata;
            }
        }

        // 2. Extract Headers from Template (if provided)
        let templateHeaders = [];
        if (templateFile) {
            const templateResult = await universalParser.parse(templateFile.path, templateFile.originalname);
            templateHeaders = templateResult.headers;
        }

        logger.info(`Extraction complete for session: ${sessionId}. Total rows: ${combinedRows.length}`);

        res.json({
            success: true,
            sessionId,
            headers: Array.from(combinedHeaders),
            rows: combinedRows,
            templateHeaders: templateHeaders,
            metadata: firstMetadata,
            message: `Magic extraction successful for ${documentFiles.length} files`
        });

    } catch (error) {
        logger.error(`Extraction failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to process document', details: error.message });
    }
});

// Export Endpoint (Generates Real Excel/CSV)
app.post('/api/v1/export', async (req, res) => {
    const { rows, headers, format } = req.body;

    try {
        if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Mapped Data');

            // Ensure headers are valid
            const safeHeaders = Array.isArray(headers) ? headers : [];
            const safeRows = Array.isArray(rows) ? rows : [];

            // Define columns
            worksheet.columns = safeHeaders.map(h => ({ header: h, key: h, width: 25 }));

            // Add rows
            worksheet.addRows(safeRows);

            // Style the header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            const buffer = await workbook.xlsx.writeBuffer();
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=TiPiC_Export.xlsx');
            res.setHeader('Content-Length', buffer.length);
            
            return res.send(buffer);
        } else {
            // CSV Export with UTF-8 BOM
            const BOM = '\uFEFF';
            const safeHeaders = Array.isArray(headers) ? headers : [];
            const safeRows = Array.isArray(rows) ? rows : [];
            
            const csvHeaders = safeHeaders.join(',');
            const csvRows = safeRows.map(row =>
                safeHeaders.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')
            ).join('\n');

            const content = BOM + csvHeaders + '\n' + csvRows;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=TiPiC_Export.csv');
            return res.send(content);
        }
    } catch (error) {
        logger.error(`Export failed: ${error.message}\nStack: ${error.stack}`);
        res.status(500).json({ error: 'Failed to generate export', details: error.message });
    }
});

const aiService = require('./services/aiService');

// AI Fix Endpoint
app.post('/api/v1/ai-fix', async (req, res) => {
    const { type, data, config } = req.body;

    try {
        let result;
        if (type === 'row') {
            result = await aiService.cleanRow(data, config.headers);
        } else if (type === 'mapping') {
            result = await aiService.suggestMapping(data.sourceColumns, data.templateHeaders);
        } else if (type === 'transform') {
            const transformation = await aiService.transformData(data.rows, data.prompt);
            result = transformation.transformedRows || data.rows;
        } else {
            return res.status(400).json({ error: 'Invalid AI fix type' });
        }

        res.json({ success: true, result });
    } catch (error) {
        logger.error(`AI fix failed: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to process AI request' 
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    logger.info(`TiPiC Data Extraction Service running on port ${port}`);
});
