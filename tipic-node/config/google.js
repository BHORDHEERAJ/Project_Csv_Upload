require('dotenv').config();

// Collect all Gemini API keys from .env (GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.)
const geminiKeys = Object.keys(process.env)
    .filter(key => key.startsWith('GEMINI_API_KEY'))
    .map(key => process.env[key])
    .filter(val => val && val.length > 10 && !val.includes('YOUR_'));

module.exports = {
    google: {
        projectId: process.env.GOOGLE_PROJECT_ID || '817575157884',
        visionApiKey: process.env.GOOGLE_VISION_API_KEY || '',
        geminiApiKeys: geminiKeys,
        serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
    }
};
