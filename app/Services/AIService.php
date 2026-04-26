<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    protected $geminiKeys = [];
    protected $currentKeyIndex = 0;

    public function __construct()
    {
        $this->geminiKeys = array_values(array_filter([
            config('services.gemini.key'),
            config('services.gemini.key_2'),
            config('services.gemini.key_3'),
            config('services.gemini.key_4'),
            config('services.gemini.key_5'),
            config('services.gemini.key_6'),
            config('services.gemini.key_7'),
            config('services.gemini.key_8'),
            config('services.gemini.key_9'),
            config('services.gemini.key_10'),
        ]));
    }

    protected function getNextGeminiKey()
    {
        if (empty($this->geminiKeys)) return null;
        $key = $this->geminiKeys[$this->currentKeyIndex];
        $this->currentKeyIndex = ($this->currentKeyIndex + 1) % count($this->geminiKeys);
        return $key;
    }

    public function process(string $prompt, array $context, string $targetProvider = 'gemini')
    {
        // 1. Try Gemini (Primary)
        if ($targetProvider === 'gemini') {
            try {
                return $this->callGemini($prompt, $context);
            } catch (\Exception $e) {
                Log::warning("Gemini failed, trying fallbacks: " . $e->getMessage());
            }
        }

        // 2. Try Groq (Super Fast Fallback - detected by gsk_ or GROQ_API_KEY)
        $groqKey = config('services.groq.key') ?: (str_starts_with(config('services.grok.key', ''), 'gsk_') ? config('services.grok.key') : null);
        if ($groqKey) {
            try {
                return $this->callGroq($prompt, $context, $groqKey);
            } catch (\Exception $e) {
                Log::warning("Groq failed, trying Grok: " . $e->getMessage());
            }
        }

        // 3. Try Grok (xAI)
        if (config('services.grok.key') && !str_starts_with(config('services.grok.key'), 'gsk_')) {
            try {
                return $this->callGrok($prompt, $context);
            } catch (\Exception $e) {
                Log::warning("Grok failed, trying OpenAI: " . $e->getMessage());
            }
        }

        // 4. Try OpenAI (Final Fallback)
        if (config('services.openai.key')) {
            try {
                return $this->callOpenAI($prompt, $context);
            } catch (\Exception $e) {
                Log::error("All AI providers failed: " . $e->getMessage());
            }
        }

        throw new \Exception("All AI providers failed or are not configured.");
    }

    protected function callGroq(string $prompt, array $context, string $apiKey)
    {
        $model = config('services.groq.model') ?: 'llama-3.3-70b-versatile';
        $fullPrompt = "{$prompt}\n\nReturn JSON only.\n\nContext:\n" . json_encode($context);

        $response = Http::withToken($apiKey)->timeout(30)->post('https://api.groq.com/openai/v1/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'user', 'content' => $fullPrompt]
            ],
            'response_format' => ['type' => 'json_object']
        ]);

        if ($response->successful()) {
            return json_decode($response->json()['choices'][0]['message']['content'], true);
        }

        throw new \Exception("Groq API error: " . $response->body());
    }

    protected function callGemini(string $prompt, array $context)
    {
        $retries = 3;
        $model = config('services.gemini.model');

        while ($retries > 0) {
            $apiKey = $this->getNextGeminiKey();
            if (!$apiKey) throw new \Exception("No Gemini API keys found.");

            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

            $fullPrompt = "{$prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no extra text.\n\nContext Data:\n" . json_encode($context);

            $response = Http::timeout(60)->post($url, [
                'contents' => [
                    ['parts' => [['text' => $fullPrompt]]]
                ]
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
                return $this->parseJson($text);
            }

            // Handle rate limits or other issues
            if ($response->status() === 429 || $response->status() === 503) {
                $retries--;
                usleep(500000); // 0.5s wait
                continue;
            }

            throw new \Exception("Gemini API error: " . $response->body());
        }

        throw new \Exception("Gemini failed after retries.");
    }

    protected function callOpenAI(string $prompt, array $context)
    {
        $apiKey = config('services.openai.key');
        $model = config('services.openai.model');

        $fullPrompt = "{$prompt}\n\nIMPORTANT: Return ONLY valid JSON.\n\nContext Data:\n" . json_encode($context);

        $response = Http::withToken($apiKey)->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => 'You are a data assistant. Output only JSON.'],
                ['role' => 'user', 'content' => $fullPrompt]
            ],
            'response_format' => ['type' => 'json_object']
        ]);

        if ($response->successful()) {
            return json_decode($response->json()['choices'][0]['message']['content'], true);
        }

        throw new \Exception("OpenAI API error: " . $response->body());
    }

    protected function callGrok(string $prompt, array $context)
    {
        $apiKey = config('services.grok.key');
        $model = config('services.grok.model');

        $fullPrompt = "{$prompt}\n\nIMPORTANT: Return ONLY valid JSON block.\n\nContext Data:\n" . json_encode($context);

        $response = Http::withToken($apiKey)->timeout(60)->post('https://api.x.ai/v1/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => 'You are a data assistant. Output only JSON.'],
                ['role' => 'user', 'content' => $fullPrompt]
            ]
        ]);

        if ($response->successful()) {
            $text = $response->json()['choices'][0]['message']['content'];
            return $this->parseJson($text);
        }

        throw new \Exception("Grok API error: " . $response->body());
    }

    protected function parseJson($text)
    {
        $text = trim($text);
        
        // Remove markdown backticks if present
        if (strpos($text, '```') === 0) {
            $text = preg_replace('/^```(?:json)?\n?/', '', $text);
            $text = preg_replace('/(?:\n?| )```$/', '', $text);
        }

        $json = json_decode($text, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // Try to find JSON block manually if decoding failed
            preg_match('/\{.*\}/s', $text, $matches);
            if (!empty($matches)) {
                $json = json_decode($matches[0], true);
            }
        }

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Failed to parse AI response as JSON: " . substr($text, 0, 100));
        }

        return $json;
    }

    // Specific tasks
    public function cleanRow(array $row, array $headers)
    {
        $prompt = "You are a data cleaning assistant. Standardize the following row data. Ensure Marathi text is correctly handled. Return ONLY the cleaned fields as a JSON object.";
        return $this->process($prompt, ['row' => $row, 'headers' => $headers]);
    }

    public function suggestMapping(array $sourceColumns, array $templateHeaders)
    {
        $prompt = "Suggest the best mapping between the source columns and the template headers. Return a JSON object where keys are template headers and values are source column names.";
        return $this->process($prompt, ['sourceColumns' => $sourceColumns, 'templateHeaders' => $templateHeaders]);
    }

    public function transformData(array $rows, string $userPrompt)
    {
        $prompt = "You are a data transformation engine. User instruction: \"{$userPrompt}\". Apply this to all rows. Ensure Marathi text is supported. Return a JSON object with a 'transformedRows' property containing the array of updated rows.";
        return $this->process($prompt, ['rows' => $rows]);
    }

    public function processWithFile(string $prompt, string $filePath, string $mimeType)
    {
        $apiKey = $this->getNextGeminiKey();
        $model = config('services.gemini.model');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $fileData = base64_encode(file_get_contents($filePath));

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => "{$prompt}\n\nIMPORTANT: Return ONLY valid JSON."],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => $fileData
                            ]
                        ]
                    ]
                ]
            ]
        ];

        $response = Http::timeout(120)->post($url, $payload);

        if ($response->successful()) {
            $data = $response->json();
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
            return $this->parseJson($text);
        }

        throw new \Exception("Gemini multimodal failed: " . $response->body());
    }
}
