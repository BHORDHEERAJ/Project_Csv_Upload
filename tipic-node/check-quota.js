const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function findActiveModel() {
    const key = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(key);

    // Most likely candidates from the earlier list
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-flash-latest",
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    let report = "";
    for (const m of models) {
        console.log(`Checking ${m}...`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("hi");
            report += `SUCCESS: ${m}\n`;
            console.log(`  SUCCESS!`);
        } catch (e) {
            report += `FAILED: ${m} - ${e.message}\n`;
            console.log(`  FAILED: ${e.message}`);
        }
    }
    require('fs').writeFileSync('model_quota_report.txt', report);
}

findActiveModel();
