const aiService = require('./services/aiService');

async function stressTest() {
    console.log("Starting Stress Test (10 concurrent requests)...");

    const dummyRows = [{ item: "Test 1" }, { item: "Test 2" }];
    const dummyPrompt = "Do nothing";

    const tasks = Array.from({ length: 10 }).map((_, i) => {
        console.log(`Scheduling request ${i + 1}...`);
        return aiService.transformData(dummyRows, dummyPrompt)
            .then(() => console.log(`Request ${i + 1} completed.`))
            .catch(e => console.error(`Request ${i + 1} failed: ${e.message}`));
    });

    await Promise.all(tasks);
    console.log("Stress Test Finished.");
}

stressTest();
