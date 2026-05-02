<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    protected $geminiKeys = [];
    protected static $blacklistedKeys = [];

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

        if (!empty($this->geminiKeys)) {
            $this->currentKeyIndex = rand(0, count($this->geminiKeys) - 1);
        }
    }

    protected function getNextGeminiKey()
    {
        if (empty($this->geminiKeys)) return null;
        
        $availableKeys = array_values(array_filter($this->geminiKeys, function($key) {
            $expiry = self::$blacklistedKeys[$key] ?? 0;
            return time() > $expiry;
        }));

        if (empty($availableKeys)) {
            Log::warning("All Gemini keys are currently rate-limited. Clearing blacklist to retry.");
            self::$blacklistedKeys = [];
            $availableKeys = $this->geminiKeys;
        }

        return $availableKeys[rand(0, count($availableKeys) - 1)];
    }

    protected $systemPrompt = "You are a professional Data Extraction Engine specialized in OCR and tabular data. 
    - Maintain 100% verbatim accuracy for both English and Marathi text.
    - Preserve Unicode characters exactly.
    - Detect headers and rows even in noisy or distorted images (e.g., photos of screens).
    - Return ONLY valid, minified JSON objects.";

    public function process(string $prompt, array $context, string $targetProvider = 'gemini')
    {
        $fullPrompt = "{$this->systemPrompt}\n\nTask: {$prompt}";
        
        // 1. Try Gemini (Primary)
        if ($targetProvider === 'gemini') {
            try {
                return $this->callGemini($fullPrompt, $context);
            } catch (\Exception $e) {
                Log::warning("Gemini failed, trying fallbacks: " . $e->getMessage());
            }
        }

        // 2. Try Groq (Super Fast Fallback - detected by gsk_ or GROQ_API_KEY)
        $groqKey = config('services.groq.key') ?: (str_starts_with(config('services.grok.key', ''), 'gsk_') ? config('services.grok.key') : null);
        if ($groqKey) {
            try {
                return $this->callGroq($fullPrompt, $context, $groqKey);
            } catch (\Exception $e) {
                Log::warning("Groq failed, trying Grok: " . $e->getMessage());
            }
        }

        // 3. Try Grok (xAI)
        if (config('services.grok.key') && !str_starts_with(config('services.grok.key'), 'gsk_')) {
            try {
                return $this->callGrok($fullPrompt, $context);
            } catch (\Exception $e) {
                Log::warning("Grok failed, trying OpenAI: " . $e->getMessage());
            }
        }

        // 4. Try OpenAI (Final Fallback)
        if (config('services.openai.key')) {
            try {
                return $this->callOpenAI($fullPrompt, $context);
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

        $response = Http::withToken($apiKey)->timeout(120)->post('https://api.groq.com/openai/v1/chat/completions', [
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
        $maxKeyAttempts = count($this->geminiKeys) ?: 3; 
        $model = config('services.gemini.fallback_model') ?: config('services.gemini.model');

        for ($attempt = 0; $attempt < $maxKeyAttempts; $attempt++) {
            $apiKey = $this->getNextGeminiKey();
            if (!$apiKey) throw new \Exception("No active Gemini API keys available.");

            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
            $fullPrompt = "{$prompt}\n\nContext Data:\n" . json_encode($context);

            try {
                $response = Http::timeout(120)->post($url, [
                    'contents' => [
                        ['parts' => [['text' => $fullPrompt]]]
                    ]
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
                    return $this->parseJson($text);
                }

                if ($response->status() === 429) {
                    Log::info("Gemini key rate-limited (429). Blacklisting and rotating key.");
                    self::$blacklistedKeys[$apiKey] = time() + 60; // 1 minute blacklist
                    continue; // Immediately try another key
                }

                if ($response->status() === 503 || $response->status() === 500) {
                    Log::warning("Gemini server error ({$response->status()}). Retrying with next key.");
                    continue;
                }

                throw new \Exception("Gemini API error (" . $response->status() . "): " . $response->body());

            } catch (\Exception $e) {
                if ($attempt === $maxKeyAttempts - 1) throw $e;
                Log::error("Gemini attempt failed: " . $e->getMessage());
                usleep(500000); // 0.5s safety wait
            }
        }

        throw new \Exception("Gemini failed after trying multiple healthy keys.");
    }

    protected function callOpenAI(string $prompt, array $context)
    {
        $apiKey = config('services.openai.key');
        $model = config('services.openai.model');

        $fullPrompt = "{$prompt}\n\nIMPORTANT: Return ONLY valid JSON.\n\nContext Data:\n" . json_encode($context);

        $response = Http::withToken($apiKey)->timeout(120)->post('https://api.openai.com/v1/chat/completions', [
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

        $response = Http::withToken($apiKey)->timeout(120)->post('https://api.x.ai/v1/chat/completions', [
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

    public function suggestMappingWithContext(array $sourceColumns, array $templateHeaders, array $sampleRows)
    {
        $prompt = "You are a data mapping expert.
        I have source columns and their sample data. I need to map them to target template headers.
        
        Source Columns: " . implode(', ', $sourceColumns) . "
        Sample Data (first 3 rows): " . json_encode(array_slice($sampleRows, 0, 3)) . "
        Target Headers: " . implode(', ', $templateHeaders) . "
        
        Return a JSON object where keys are the Target Headers and values are the matching Source Column names.
        If no good match exists for a target header, omit it or set to null.";
        
        return $this->process($prompt, []);
    }

    public function transformData(array $rows, string $userPrompt)
    {
        $prompt = "You are a data transformation engine. User instruction: \"{$userPrompt}\". Apply this to all rows. Ensure Marathi text is supported. Return a JSON object with a 'transformedRows' property containing the array of updated rows.";
        return $this->process($prompt, ['rows' => $rows]);
    }

    public function processWithFile(string $prompt, string $filePath, string $mimeType)
    {
        // 1. Try Gemini (Primary - Multimodal)
        $models = array_filter([
            config('services.gemini.fallback_model'), // gemini-2.0-flash
            config('services.gemini.model'),          // gemini-1.5-flash
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
        ]);
        
        $lastException = null;

        foreach ($models as $model) {
            // Force v1beta for extraction as it handles multimodal more consistently across key types
            $version = 'v1beta'; 
            $retries = 3;
            while ($retries > 0) {
                $apiKey = $this->getNextGeminiKey();
                if (!$apiKey) break;

                Log::info("Attempting multimodal OCR with Gemini {$model} using API Key Index: {$this->currentKeyIndex}");

                $url = "https://generativelanguage.googleapis.com/{$version}/models/{$model}:generateContent?key={$apiKey}";
                $fileData = base64_encode(file_get_contents($filePath));

                try {
                    $response = Http::timeout(120)->post($url, [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => "{$this->systemPrompt}\n\nTask: {$prompt}"],
                                    ['inline_data' => ['mime_type' => $mimeType, 'data' => $fileData]]
                                ]
                            ]
                        ]
                    ]);

                    if ($response->successful()) {
                        $text = $response->json()['candidates'][0]['content']['parts'][0]['text'] ?? '';
                        if (!empty($text)) return $this->parseJson($text);
                    }

                    if ($response->status() === 429 || $response->status() === 503) {
                        $retries--;
                        Log::warning("Gemini {$model} rate limited, retrying...");
                        usleep(1000000);
                        continue;
                    }
                    
                    Log::error("Gemini {$model} failed: " . $response->body());
                    break; 

                } catch (\Exception $e) {
                    $lastException = $e;
                    break;
                }
            }
        }

        // 2. Try Groq Vision Fallback
        $groqKey = config('services.groq.key');
        if ($groqKey) {
            try {
                Log::info("Falling back to Groq Vision (Llama 3.2)");
                $fileData = base64_encode(file_get_contents($filePath));
                $response = Http::withToken($groqKey)->timeout(120)->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => 'llama-3.2-11b-vision-preview',
                    'messages' => [
                        [
                            'role' => 'user',
                            'content' => [
                                ['type' => 'text', 'text' => "{$this->systemPrompt}\n\nTask: {$prompt}"],
                                [
                                    'type' => 'image_url',
                                    'image_url' => ['url' => "data:{$mimeType};base64,{$fileData}"]
                                ]
                            ]
                        ]
                    ],
                    'response_format' => ['type' => 'json_object']
                ]);

                if ($response->successful()) {
                    return $this->parseJson($response->json()['choices'][0]['message']['content']);
                }
                Log::error("Groq Vision failed: " . $response->body());
            } catch (\Exception $e) {
                Log::error("Groq Vision exception: " . $e->getMessage());
            }
        }

        // 3. Try OpenAI Vision Fallback
        $openAIKey = config('services.openai.key');
        if ($openAIKey) {
            try {
                Log::info("Falling back to OpenAI Vision (GPT-4o-mini)");
                $fileData = base64_encode(file_get_contents($filePath));
                $response = Http::withToken($openAIKey)->timeout(120)->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'user',
                            'content' => [
                                ['type' => 'text', 'text' => "{$this->systemPrompt}\n\nTask: {$prompt}"],
                                [
                                    'type' => 'image_url',
                                    'image_url' => ['url' => "data:{$mimeType};base64,{$fileData}"]
                                ]
                            ]
                        ]
                    ],
                    'response_format' => ['type' => 'json_object']
                ]);

                if ($response->successful()) {
                    return $this->parseJson($response->json()['choices'][0]['message']['content']);
                }
                Log::error("OpenAI Vision failed: " . $response->body());
            } catch (\Exception $e) {
                Log::error("OpenAI Vision exception: " . $e->getMessage());
            }
        }

        throw new \Exception("All Multimodal AI Models failed. Check API keys for Gemini, Groq, or OpenAI.");
    }
}

