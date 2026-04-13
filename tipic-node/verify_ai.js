const axios = require('axios');

async function testAiFix() {
    console.log("Testing AI Fix on 127.0.0.1:3000/api/v1/ai-fix...");
    try {
        const res = await axios.post('http://127.0.0.1:3000/api/v1/ai-fix', {
            type: 'row',
            data: { "name": "Dheeraj Kumar", "password": "" },
            config: { 
                prompt: "set password to demo123",
                headers: ["name", "password"]
            }
        });
        console.log("SUCCESS! AI Response:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("STILL FAILING! Error:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}

testAiFix();
