const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const config = require('../config/google');

// Simple Semaphore/Limiter for concurrency control
class ConcurrencyLimiter {
    constructor(max) {
        this.max = max;
        this.running = 0;
        this.queue = [];
    }

    async run(fn) {
        while (this.running >= this.max) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.running++;
        try {
            return await fn();
        } finally {
            this.running--;
        }
    }
}

const limiter = new ConcurrencyLimiter(2); // Max 2 concurrent requests
let lastRequestTime = 0;

// Key Rotation State (Uses ALL Gemini accounts defined in .env)
const apiKeys = config.google.geminiApiKeys;

let currentKeyIndex = 0;

class AIService {
    static getNextApiKey() {
        if (!apiKeys || apiKeys.length === 0) return null;
        const key = apiKeys[currentKeyIndex];
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        return key;
    }

    static async getModel(modelName = "gemini-1.5-flash", systemInstruction = null, forceKey = null) {
        const apiKey = forceKey || this.getNextApiKey();
        if (!apiKey) {
            throw new Error('No valid Gemini API keys found in .env (Must start with GEMINI_API_KEY)');
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const config = { model: modelName };
        if (systemInstruction) {
            config.systemInstruction = systemInstruction;
        }
        return genAI.getGenerativeModel(config);
    }

    static async extractTableFromImage(imagePath) {
        return limiter.run(async () => {
            // Respect throttling for Pro model (RPM is lower)
            const now = Date.now();
            const timeSinceLast = now - lastRequestTime;
            if (timeSinceLast < 1000) {
                await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLast));
            }
            lastRequestTime = Date.now();

            const systemInstruction = `Role: Universal Table & Ledger Extractor.
Objective: Convert ANY image containing a table into a strictly formatted JSON array. You must be schema-agnostic, meaning you adapt to whatever headers are present in the image.

Core Capabilities:
1. Header Detection: Locate the header row. Use the exact text found as JSON keys. If no header is found, use generic keys like "col_1", "col_2".
2. Spatial Anchoring: Use the physical lines (grid) of the paper to guide your eye. A value on the far right must belong to the same horizontal line as the value on the far left. Do not let rows "bleed" into each other.
3. Handwritten ICR: Resolve handwriting using the column type. 
   - If the column is "Price", "Amount", or "Qty", the value must be a Number.
   - If the column is "Date", format as "DD/MM/YYYY".
4. Integrity: Use 'null' for empty cells or dashes. Never guess data.

Output: Return ONLY raw JSON. No conversational text.`;

            const userPrompt = `Image Task:
1. Identify all columns and rows in this image.
2. Extract the data into a JSON list of objects.
3. Ensure the 'Selling Price' or right-most column values are correctly matched to their specific row numbers.

JSON Schema:
{
  "table_metadata": {
    "title": "Calculated title of the document",
    "columns_detected": ["List of headers"]
  },
  "rows": [
    { "header_1": "value", "header_2": "value", ... }
  ]
}`;

            let retries = 3;
            let currentModel = "gemini-2.5-flash"; // Switched to Flash for higher quota/speed
            
            while (retries >= 0) {
                const apiKey = this.getNextApiKey();
                try {
                    const model = await this.getModel(currentModel, systemInstruction, apiKey);
                    
                    const imageData = fs.readFileSync(imagePath);
                    const imagePart = {
                        inlineData: {
                            data: imageData.toString("base64"),
                            mimeType: "image/jpeg" // Default to jpeg, sharp will ensure compatibility
                        }
                    };

                    const generationConfig = {
                        responseMimeType: "application/json",
                        temperature: 0.1,
                    };

                    const result = await model.generateContent({
                        contents: [{ role: "user", parts: [imagePart, { text: userPrompt }] }],
                        generationConfig,
                    });

                    const response = await result.response;
                    const text = response.text();
                    
                    try {
                        return JSON.parse(text);
                    } catch (parseError) {
                        console.warn("[AIService] JSON parse failed, attempting cleanup:", text);
                        const jsonStart = text.search(/[{\[]/);
                        const jsonEnd = text.lastIndexOf(text.includes('[') && !text.includes('{') ? ']' : '}');
                        if (jsonStart !== -1 && jsonEnd !== -1) {
                            return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
                        }
                        throw parseError;
                    }

                } catch (error) {
                    const errorMsg = error.message || '';
                    const is429 = errorMsg.includes('429') || errorMsg.includes('Quota');
                    const isRetryable = is429 || errorMsg.includes('503') || errorMsg.includes('busy');

                    if (is429 && apiKeys.length > 1) {
                        console.warn(`[AIService] Key quota hit, rotating to next key immediately...`);
                        retries--;
                        continue; // Skip wait and try next key
                    }

                    if (isRetryable && retries > 0) {
                        console.warn(`[AIService] ${currentModel} busy, retrying in 5s...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        retries--;
                        continue;
                    }

                    console.error('[AIService] Extraction Error:', errorMsg);
                    throw error;
                }
            }
        });
    }

    static async processData(prompt, context) {
        return limiter.run(async () => {
            // Respect throttling (800ms gap between calls to avoid instant burst limit)
            const now = Date.now();
            const timeSinceLast = now - lastRequestTime;
            if (timeSinceLast < 800) {
                await new Promise(resolve => setTimeout(resolve, 800 - timeSinceLast));
            }
            lastRequestTime = Date.now();

            let retries = 5;
            let currentDelay = 5000;
            let currentModel = "gemini-2.0-flash"; // Default to 2.0 Flash for text processing
            let usedKeys = new Set();

            while (retries >= 0) {
                const apiKey = this.getNextApiKey();
                try {
                    const model = await this.getModel(currentModel, null, apiKey);
                    const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no extra text.\n\nContext Data:\n${JSON.stringify(context)}`;

                    const result = await model.generateContent(fullPrompt);
                    const response = await result.response;
                    const rawText = response.text();

                    const jsonStart = rawText.search(/[{\[]/);
                    const jsonEnd = rawText.lastIndexOf(rawText.includes('[') && !rawText.includes('{') ? ']' : '}');

                    if (jsonStart === -1 || jsonEnd === -1) {
                        return JSON.parse(rawText.trim());
                    }

                    const jsonText = rawText.substring(jsonStart, jsonEnd + 1);
                    return JSON.parse(jsonText);

                } catch (error) {
                    const errorMsg = error.message || '';
                    const is429 = errorMsg.includes('429') || errorMsg.includes('Quota');
                    const is404 = errorMsg.includes('404') || errorMsg.includes('not found');
                    const isRetryable = is429 || errorMsg.includes('503') || errorMsg.includes('busy') || errorMsg.includes('deadline');

                    // Handle 404 - Model Fallback
                    if (is404 && currentModel !== "gemini-2.0-flash") {
                        console.warn(`[AIService] Model ${currentModel} not found. Falling back to gemini-2.0-flash.`);
                        currentModel = "gemini-2.0-flash";
                        continue;
                    }

                    // Handle Retryable Errors (429, etc)
                    if (isRetryable && retries > 0) {
                        const type = is429 ? 'Rate Limit (429/Quota)' : 'Server Busy';

                        // Round Robin: immediately switch key if we have others left to try before sleeping
                        if (is429 && apiKeys.length > 1 && !usedKeys.has(apiKey)) {
                            usedKeys.add(apiKey);
                            console.log(`[AIService] Key ${apiKey.substring(0, 8)}... hit quota. Trying next available key in Round Robin.`);
                            continue; // Try next key immediately
                        }

                        console.warn(`[AIService] ${type}, retrying in ${currentDelay}ms... (${retries} attempts left)`);
                        await new Promise(resolve => setTimeout(resolve, currentDelay));
                        retries--;
                        currentDelay *= 2;
                        usedKeys.clear(); // Reset used keys after sleep
                        continue;
                    }

                    console.error('[AIService] Fatal Error:', errorMsg);
                    throw new Error(`AI failed: ${errorMsg}`);
                }
            }
        });
    }

    static async cleanRow(row, headers) {
        const prompt = `You are a data cleaning assistant. Clean the following row data. Return only JSON.`;
        return this.processData(prompt, { row, headers });
    }

    static async suggestMapping(sourceColumns, templateHeaders) {
        const prompt = `Suggest mapping between source columns and template headers. Return JSON.`;
        return this.processData(prompt, { sourceColumns, templateHeaders });
    }

    static async transformData(rows, userPrompt) {
        const prompt = `You are a data transformation engine. 
        User action: "${userPrompt}"
        Return ONLY a JSON object with a "transformedRows" property.`;
        return this.processData(prompt, { rows });
    }
}

module.exports = AIService;
