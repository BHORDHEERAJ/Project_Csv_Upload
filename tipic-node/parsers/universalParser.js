const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { parse: csvParse } = require('csv-parse/sync');
const pdfParse = require('pdf-parse');
const imageParser = require('./imageParser');

class UniversalParser {
    async parse(filePath, originalName) {
        let ext = path.extname(originalName).toLowerCase();
        
        try {
            if (['.xlsx', '.xls'].includes(ext)) {
                try {
                    return await this.parseExcel(filePath);
                } catch (e) {
                    console.warn(`Excel parse failed, trying CSV fallback for ${originalName}`);
                    return await this.parseCSV(filePath);
                }
            } else if (ext === '.csv') {
                return await this.parseCSV(filePath);
            } else if (ext === '.pdf') {
                return await this.parsePDF(filePath);
            } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                return await imageParser.parse(filePath);
            } else {
                // Last ditch effort - try CSV
                return await this.parseCSV(filePath);
            }
        } catch (error) {
            console.error(`Parser failed for ${originalName}: ${error.message}`);
            throw error;
        }
    }

    async parseExcel(filePath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        let bestResult = { headers: [], rows: [] };
        let maxDataPoints = 0;

        // Scan all worksheets to find the best data candidate
        workbook.eachSheet((worksheet) => {
            const allRows = [];
            worksheet.eachRow({ includeEmpty: true }, (row) => {
                const rowValues = [];
                // Use a standard array to ensure indices match
                for (let i = 1; i <= worksheet.columnCount; i++) {
                    let cell = row.getCell(i);
                    let val = cell.value;
                    if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
                    if (val && val.richText) val = val.richText.map(t => t.text).join('');
                        rowValues.push(val ? val.toString().trim() : '');
                }
                allRows.push(rowValues);
            });

            if (allRows.length === 0) return;

            // Header Detection Logic
            const keywords = ['item', 'name', 'code', 'sku', 'price', 'qty', 'stock', 'rate', 'sr', 'no', 'hsn', 'gst', 'brand', 'category', 'description'];
            let headerRowIndex = 0;
            let maxScore = -1;

            for (let i = 0; i < Math.min(20, allRows.length); i++) {
                let score = 0;
                const rowValues = allRows[i];
                const rowStr = rowValues.join(' ').toLowerCase();
                
                keywords.forEach(key => {
                    if (rowStr.includes(key)) score++;
                });

                const nonEmpCount = rowValues.filter(v => v !== '').length;
                score += (nonEmpCount * 0.5);

                if (score > maxScore) {
                    maxScore = score;
                    headerRowIndex = i;
                }
            }

            const rawHeaders = allRows[headerRowIndex];
            const headers = rawHeaders.map((v, i) => v || `Column_${i}`);
            
            const rows = allRows.slice(headerRowIndex + 1).map(rowValues => {
                const rowData = {};
                headers.forEach((h, idx) => {
                    rowData[h] = rowValues[idx] || '';
                });
                return rowData;
            });

            const currentDataPoints = headers.length * rows.length;
            if (currentDataPoints >= maxDataPoints) {
                maxDataPoints = currentDataPoints;
                bestResult = { headers, rows };
            }
        });

        console.log(`[Parser] Found ${bestResult.headers.length} headers and ${bestResult.rows.length} rows`);
        return bestResult;
    }

    async parseCSV(filePath) {
        const content = fs.readFileSync(filePath);
        const sample = content.slice(0, 5000).toString(); // Sample first 5KB
        
        // Auto-detect delimiter
        const delimiters = [',', ';', '\t', '|'];
        let bestDelimiter = ',';
        let maxCount = 0;
        delimiters.forEach(d => {
            const count = sample.split(d).length;
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = d;
            }
        });

        const records = csvParse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
            delimiter: bestDelimiter
        });

        if (records.length === 0) return { headers: [], rows: [] };

        const headers = Object.keys(records[0]).map(h => h.trim() || 'EmptyColumn');
        return { headers, rows: records };
    }

    async parsePDF(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        
        // Simple line-based extraction for PDF
        const lines = data.text.split('\n').filter(line => line.trim());
        const rows = lines.map(line => ({ content: line }));
        
        return { headers: ['Content'], rows };
    }
}

module.exports = new UniversalParser();
