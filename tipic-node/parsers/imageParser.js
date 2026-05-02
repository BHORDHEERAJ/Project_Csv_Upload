const fs = require('fs');
const sharp = require('sharp');
const aiService = require('../services/aiService');

const parse = async (filePath) => {
    // 1. Preprocess image with sharp for better OCR accuracy (Focus on contrast)
    const processedImagePath = filePath.replace(/(\.[\w\d]+)$/i, '_processed$1');
    try {
        await sharp(filePath)
            .grayscale()
            .normalize() // Enhances contrast by stretching the luminance range
            .sharpen()   // Makes handwriting edges clearer
            .toFile(processedImagePath);
    } catch (sharpError) {
        console.warn('[ImageParser] Sharp preprocessing failed, using original image:', sharpError.message);
        // Fallback to original if sharp fails
        fs.copyFileSync(filePath, processedImagePath);
    }

    try {
        // 2. Use the Universal Agent (Gemini 1.5 Pro) to extract data directly from image
        console.log(`[ImageParser] Starting Universal Agent extraction for: ${filePath}`);
        const result = await aiService.extractTableFromImage(processedImagePath);
        
        // Cleanup processed file
        try { fs.unlinkSync(processedImagePath); } catch (e) {}

        return {
            headers: result.table_metadata?.columns_detected || Object.keys(result.rows[0] || {}),
            rows: result.rows || [],
            metadata: result.table_metadata || {}
        };
    } catch (e) {
        console.error('[ImageParser] Universal Agent extraction failed:', e.message);
        // Cleanup on failure
        try { fs.unlinkSync(processedImagePath); } catch (cleanupError) {}
        throw new Error(`Universal AI Agent Failed: ${e.message}`);
    }
};

module.exports = { parse };
