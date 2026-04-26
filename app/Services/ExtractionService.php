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

            if (strlen(trim($text)) > 100) {
                return $this->structureRawText($text);
            }
        } catch (Exception $e) {
            Log::warning("PdfParser failed: " . $e->getMessage());
        }

        // Multimodal Fallback: Use Gemini to process the PDF as a whole
        Log::info("Attempting Gemini Multimodal extraction for PDF.");
        $prompt = "Extract tabular data from this PDF document. Ensure Marathi and English text are accurately preserved. Return ONLY a JSON object with 'headers' and 'rows'.";
        
        $result = $this->aiService->processWithFile($prompt, $filePath, 'application/pdf');
        
        return [
            'headers' => $result['headers'] ?? [],
            'rows' => $result['rows'] ?? []
        ];
    }

    protected function extractImage($filePath)
    {
        $apiKey = config('services.google.vision_key');
        if (!$apiKey) {
            throw new Exception("Google Vision API Key not configured.");
        }

        $content = base64_encode(file_get_contents($filePath));
        
        $response = Http::timeout(60)->post("https://vision.googleapis.com/v1/images:annotate?key={$apiKey}", [
            'requests' => [
                [
                    'image' => ['content' => $content],
                    'features' => [
                        ['type' => 'TEXT_DETECTION'],
                        ['type' => 'DOCUMENT_TEXT_DETECTION']
                    ]
                ]
            ]
        ]);

        if (!$response->successful()) {
            throw new Exception("Vision API failed: " . $response->body());
        }

        $data = $response->json();
        $fullText = $data['responses'][0]['fullTextAnnotation']['text'] ?? '';

        if (empty($fullText)) {
             // Fallback attempt: maybe it's a PDF that Vision can't read as image? 
             // (Vision can handle PDFs if sent as file, but here we sent base64 image content)
             throw new Exception("OCR returned no text.");
        }

        return $this->structureRawText($fullText);
    }

    protected function structureRawText($rawText)
    {
        $prompt = "Convert the following raw OCR or PDF text into a structured JSON object. 
        Detect the main tabular data. Ensure Marathi and English text are accurately preserved.
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
