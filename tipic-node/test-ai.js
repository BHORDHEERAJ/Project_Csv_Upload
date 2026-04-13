const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API key");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    for (const m of modelsToTest) {
        console.log(`\nTesting model: ${m}`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hello");
            console.log("SUCCESS! Response: ", result.response.text());
        } catch (e) {
            console.error("FAILED! Error: ", e.message);
        }
    }
}

test();
