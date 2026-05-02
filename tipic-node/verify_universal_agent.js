const aiService = require('./services/aiService');
const imageParser = require('./parsers/imageParser');
const path = require('path');
const fs = require('fs');

async function verify() {
    console.log("--- Universal Agent Verification ---");

    // Check if we have an image to test with in arguments
    const testImage = process.argv[2];

    if (!testImage || !fs.existsSync(testImage)) {
        console.log("Usage: node verify_universal_agent.js <path_to_image>");
        console.log("Skipping live test. Verifying function availability...");
        
        if (typeof aiService.extractTableFromImage === 'function') {
            console.log("[OK] aiService.extractTableFromImage is defined");
        } else {
            console.error("[FAIL] aiService.extractTableFromImage is NOT defined");
        }

        if (typeof imageParser.parse === 'function') {
            console.log("[OK] imageParser.parse is defined");
        } else {
            console.error("[FAIL] imageParser.parse is NOT defined");
        }
        return;
    }

    try {
        console.log(`Starting extraction for: ${testImage}`);
        const result = await imageParser.parse(testImage);
        console.log("\n--- Extraction Result ---");
        console.log("Metadata:", JSON.stringify(result.metadata, null, 2));
        console.log("Headers:", result.headers);
        console.log(`Rows Found: ${result.rows.length}`);
        if (result.rows.length > 0) {
            console.log("First Row Sample:", JSON.stringify(result.rows[0], null, 2));
        }
    } catch (error) {
        console.error("\n--- Extraction Failed ---");
        console.error(error.message);
    }
}

verify();
