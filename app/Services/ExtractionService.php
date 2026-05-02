<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Smalot\PdfParser\Parser as PdfParser;

class ExtractionService
{
    protected $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    public function extract($filePath, $originalName)
    {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        try {
            if (in_array($extension, ['xlsx', 'xls', 'csv'])) {
                return $this->extractSpreadsheet($filePath);
            } elseif ($extension === 'pdf') {
                return $this->extractPdf($filePath);
            } elseif (in_array($extension, ['png', 'jpg', 'jpeg'])) {
                return $this->extractImage($filePath);
            } else {
                throw new Exception("Unsupported file format: {$extension}");
            }
        } catch (Exception $e) {
            Log::error("Extraction failed for {$originalName}: " . $e->getMessage());
            throw $e;
        }
    }

    protected function extractSpreadsheet($filePath)
    {
        $spreadsheet = IOFactory::load($filePath);
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray(null, true, true, true);

        if (empty($rows)) {
            return ['headers' => [], 'rows' => []];
        }

        // Basic header detection (first non-empty row)
        $headerRow = [];
        $dataRows = [];
        $foundHeader = false;

        foreach ($rows as $row) {
            $cleanedRow = array_map(fn($v) => trim($v ?? ''), $row);
            if (!$foundHeader && count(array_filter($cleanedRow)) > 0) {
                $headerRow = array_values($cleanedRow);
                $foundHeader = true;
            } elseif ($foundHeader) {
                $dataData = [];
                foreach ($headerRow as $idx => $h) {
                    $val = array_values($cleanedRow)[$idx] ?? '';
                    $dataData[$h ?: "Col_{$idx}"] = $val;
                }
                $dataRows[] = $dataData;
            }
        }

        return [
            'headers' => array_filter($headerRow) ?: ['Data'],
            'rows' => $dataRows
        ];
    }

    protected function extractPdf($filePath)
    {
        $parser = new PdfParser();
        try {
            $pdf = $parser->parseFile($filePath);
            $text = $pdf->getText();

            // If it's a digital PDF with searchable text, parsing is faster
            if (strlen(trim($text)) > 500) {
                return $this->structureRawText($text);
            }
        } catch (Exception $e) {
            Log::warning("PdfParser failed: " . $e->getMessage());
        }

        // Multimodal Primary for Scanned/Complex PDFs
        Log::info("Using Gemini Multimodal extraction for PDF.");
        $prompt = "Extract tabular data from this PDF document. 
        Detect columns accurately (e.g., Sr No, Item Name, Quantity, Prices).
        IMPORTANT: Preserve Marathi characters exactly as shown in the document.
        Return ONLY a JSON object with 'headers' (array) and 'rows' (array of objects).";
        
        $result = $this->aiService->processWithFile($prompt, $filePath, 'application/pdf');
        
        return [
            'headers' => $result['headers'] ?? [],
            'rows' => $result['rows'] ?? []
        ];
    }

    protected function extractImage($filePath)
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimeType = ($extension === 'png') ? 'image/png' : 'image/jpeg';
        
        Log::info("Using Professional Hybrid OCR: Stage 1 - Image Enhancement");
        
        $tempPath = null;
        try {
            // Stage 0: Pre-process image for better OCR (Sharpening & Grayscale)
            // This mimics the 'sharp' library behavior from your Node.js server
            if (class_exists(\Intervention\Image\ImageManager::class)) {
                try {
                    $manager = new \Intervention\Image\ImageManager(new \Intervention\Image\Drivers\Gd\Driver());
                    $image = $manager->decode($filePath);
                    $image->grayscale();
                    // Moderate sharpening to define edges
                    $image->sharpen(15); 
                    
                    $tempPath = storage_path('app/temp_ocr_' . uniqid() . '.jpg');
                    $image->save($tempPath);
                    $processPath = $tempPath;
                    Log::info("Image enhanced and saved to temporary path.");
                } catch (\Exception $imgEx) {
                    Log::warning("Image enhancement failed, using original: " . $imgEx->getMessage());
                    $processPath = $filePath;
                }
            } else {
                $processPath = $filePath;
            }

            // Stage 1: Use Google Vision SDK with Service Account (Stable & High Limit)
            Log::info("Stage 1: Google Vision SDK (Service Account)");
            $visionRawData = $this->extractImageWithVision($processPath);
            $rawText = $visionRawData['text'] ?? '';
            
            if (empty($rawText)) {
                throw new Exception("Google Vision returned no text.");
            }

            // Stage 2: AI Data Modeling
            Log::info("Hybrid OCR: Stage 2 - AI Data Modeling (Intelligence)");
            $prompt = "I have raw OCR text from a document. Organize it into a professional table.
            Columns: Sr No, Item Name (preserve Marathi context), Quantity, Rate, Amount.
            Ensure Marathi characters in brackets are perfectly preserved.
            
            Raw Text:
            " . $rawText;

            $result = $this->aiService->process($prompt, []);
            
            // Cleanup
            if ($tempPath && file_exists($tempPath)) unlink($tempPath);

            return [
                'headers' => $result['headers'] ?? ['Sr No', 'Item Name', 'Quantity', 'Rate', 'Amount'],
                'rows' => $result['rows'] ?? []
            ];

        } catch (Exception $e) {
            if ($tempPath && file_exists($tempPath)) unlink($tempPath);
            
            Log::warning("Professional Hybrid OCR failed, falling back to Gemini Multimodal: " . $e->getMessage());
            
            $prompt = "Extract tabular data from this image verbatim. 
            Identify Sr. No, Item Name, Quantity, Rate, Amount.
            MANDATORY: Keep Marathi characters exactly as written.
            Return ONLY a JSON object with 'headers' and 'rows'.";

            $result = $this->aiService->processWithFile($prompt, $filePath, $mimeType);
            
            return [
                'headers' => $result['headers'] ?? [],
                'rows' => $result['rows'] ?? []
            ];
        }
    }

    protected function extractImageWithVision($filePath)
    {
        // Using Service Account for stability (mimics old Node server)
        $serviceAccount = base_path('service-account.json');
        
        if (file_exists($serviceAccount) && class_exists(\Google\Cloud\Vision\V1\ImageAnnotatorClient::class)) {
            try {
                $client = new \Google\Cloud\Vision\V1\ImageAnnotatorClient([
                    'credentials' => $serviceAccount
                ]);
                
                $imageContent = file_get_contents($filePath);
                $response = $client->documentTextDetection($imageContent);
                $annotation = $response->getFullTextAnnotation();
                $text = $annotation ? $annotation->getText() : '';
                $client->close();
                
                return ['text' => $text];
            } catch (Exception $sdkEx) {
                Log::error("Vision SDK failed, trying fallback: " . $sdkEx->getMessage());
            }
        }

        // Final Legacy Fallback to API Key if SDK fails or not available
        $apiKey = config('services.google.vision_key');
        if (!$apiKey) {
            throw new Exception("Neither Service Account nor API Key found for Vision.");
        }

        $content = base64_encode(file_get_contents($filePath));
        $response = Http::timeout(120)->post("https://vision.googleapis.com/v1/images:annotate?key={$apiKey}", [
            'requests' => [
                [
                    'image' => ['content' => $content],
                    'features' => [['type' => 'DOCUMENT_TEXT_DETECTION']]
                ]
            ]
        ]);

        if (!$response->successful()) {
            throw new Exception("Vision API Key call failed: " . $response->body());
        }

        $data = $response->json();
        $fullText = $data['responses'][0]['fullTextAnnotation']['text'] ?? '';
        return ['text' => $fullText];
    }

    protected function structureRawText($rawText)
    {
        $prompt = "Convert the following raw OCR or PDF text into a structured JSON object. 
        Detect the main tabular data rows. 
        Ensure Marathi text (often in parentheses next to English names) is accurately preserved.
        Remove unnecessary noise or page footers.
        Return ONLY a JSON object with:
        - 'headers': array of column names
        - 'rows': array of objects mapping headers to values.";

        $structured = $this->aiService->process($prompt, ['rawText' => $rawText]);

        return [
            'headers' => $structured['headers'] ?? [],
            'rows' => $structured['rows'] ?? []
        ];
    }
}
