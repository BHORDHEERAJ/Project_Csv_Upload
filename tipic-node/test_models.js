const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY_2;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function check() {
    console.log("Checking API Key: " + (API_KEY ? (API_KEY.substring(0, 5) + "...") : "MISSING"));
    try {
        const res = await axios.get(url);
        console.log("--- Available Models ---");
        if (res.data.models) {
            res.data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("No models returned.");
        }
    } catch (e) {
        console.error("Failed to list models:", e.response ? e.response.data : e.message);
    }
}

check();
