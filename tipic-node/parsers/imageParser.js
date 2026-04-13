const vision = require('@google-cloud/vision');
const fs = require('fs');
const sharp = require('sharp');
const config = require('../config/google');

const parse = async (filePath) => {
    // 1. Preprocess image with sharp for better OCR accuracy
    const processedImagePath = filePath.replace(/(\.[\w\d]+)$/i, '_processed$1');
    await sharp(filePath)
        .grayscale()
        .normalize()
        .sharpen()
        .toFile(processedImagePath);

    // 2. Initialize Vision Client
    let clientOptions = {};
    if (config.google.serviceAccountPath) {
        clientOptions.keyFilename = config.google.serviceAccountPath;
    } else if (config.google.visionApiKey) {
        // Fallback to API Key if no service account
        // Note: The official client ideally prefers ADC or Keyfile, 
        // but for some setups we use the Vision Key specifically.
        clientOptions.apiKey = config.google.visionApiKey;
    }

    const client = new vision.ImageAnnotatorClient(clientOptions);

    try {
        // 3. Perform OCR using Cloud Vision
        const [result] = await client.textDetection(processedImagePath);
        const detections = result.textAnnotations;
        const fullText = detections.length > 0 ? detections[0].description : '';

        // 4. Use Gemini to structure the raw OCR text into JSON
        // This is the "Best Practice" hybrid approach: Vision for OCR, Gemini for Structuring
        const aiService = require('../services/aiService');
        const prompt = `Convert the following raw OCR text from a document into a structured JSON object. 
        Ensure Marathi text is correctly handled.
        Return ONLY a JSON object with:
        - "headers": array of column names
        - "rows": array of objects mapping headers to values.`;

        const structuredData = await aiService.processData(prompt, { rawText: fullText });
        
        // Cleanup processed file
        try { fs.unlinkSync(processedImagePath); } catch (e) {}

        return {
            headers: structuredData.headers || [],
            rows: structuredData.rows || []
        };
    } catch (e) {
        console.error('Vision OCR or Structuring failed:', e.message);
        throw new Error(`AI OCR Engine Failed: ${e.message}`);
    }
};

module.exports = { parse };
