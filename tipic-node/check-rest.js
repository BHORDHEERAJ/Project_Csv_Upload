const axios = require('axios');
require('dotenv').config();

async function findActiveModelREST() {
    const key = process.env.GEMINI_API_KEY;
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash",
        "gemini-pro"
    ];

    for (const m of models) {
        console.log(`Checking ${m} via REST...`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
            const res = await axios.post(url, {
                contents: [{ parts: [{ text: "hi" }] }]
            });
            console.log(`  SUCCESS! (${m})`);
        } catch (e) {
            console.log(`  FAILED: (${m}) - ${e.response ? e.response.status : e.message}`);
            if (e.response && e.response.data) {
                console.log(`    Detail: ${JSON.stringify(e.response.data.error)}`);
            }
        }
    }
}

findActiveModelREST();
