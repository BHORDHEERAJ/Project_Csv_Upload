const fs = require('fs');
const pdf = require('pdf-parse');

const parse = async (filePath) => {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    // Basic text extraction - for structured tables, this needs more logic
    // or a specialized library like pdf-table-extractor
    const lines = data.text.split('\n').filter(line => line.trim() !== '');
    
    return { text: data.text, lines };
};

module.exports = { parse };
