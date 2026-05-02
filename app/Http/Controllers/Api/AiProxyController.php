<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProcessingJob;
use App\Models\ProcessingHistory;
use App\Models\File;
use App\Services\AIService;
use App\Services\ExtractionService;
use App\Services\MappingEngine;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Csv;

class AiProxyController extends Controller
{
    protected $aiService;
    protected $extractionService;
    protected $mappingEngine;

    public function __construct(AIService $aiService, ExtractionService $extractionService, MappingEngine $mappingEngine)
    {
        $this->aiService = $aiService;
        $this->extractionService = $extractionService;
        $this->mappingEngine = $mappingEngine;
    }

    public function extract(Request $request)
    {
        set_time_limit(300); // 5 minutes for large batches
        try {
            if (!$request->hasFile('document')) {
                return response()->json(['error' => 'Source document is required'], 400);
            }

            $user = auth()->user();
            $sessionId = Str::random(32);
            $documents = is_array($request->file('document')) ? $request->file('document') : [$request->file('document')];
            $tpl = $request->file('template');
            $templateId = $request->input('template_id');

            // 1. Storage & Database Tracking
            $cFiles = [];
            foreach ($documents as $doc) {
                $cFiles[] = $this->storeFile($doc, $user->id, $sessionId, 'customer_input');
            }
            
            $templateHeaders = [];
            $tFile = null;

            // 2. Proxy to Node.js "Magic Engine" if URL is defined
            $nodeUrl = config('services.node.url');
            if ($nodeUrl) {
                try {
                    \Log::info("Attempting Node.js Proxy: {$nodeUrl}");
                    
                    $http = Http::timeout(60); // Reduced timeout for faster fallback
                    foreach ($documents as $doc) {
                        $http->attach('document', file_get_contents($doc->getRealPath()), $doc->getClientOriginalName());
                    }
                    
                    if ($tpl) {
                        $http->attach('template', file_get_contents($tpl->getRealPath()), $tpl->getClientOriginalName());
                    }

                    $response = $http->post("{$nodeUrl}/api/v1/extract", [
                        'template_id' => $templateId,
                        'sessionId' => $sessionId
                    ]);

                    if ($response->successful()) {
                        $extractionResult = $response->json();
                        
                        if ($templateId && config("templates.{$templateId}")) {
                            $templateHeaders = config("templates.{$templateId}.headers");
                        }

                        $job = ProcessingJob::create([
                            'user_id' => $user->id,
                            'session_id' => $sessionId,
                            'customer_file_id' => $cFiles[0]->id,
                            'template_file_id' => null,
                            'status' => 'extracting',
                            'extracted_data' => $extractionResult['rows'],
                            'template_headers' => $templateHeaders ?: ($extractionResult['templateHeaders'] ?? []),
                            'source_columns' => $extractionResult['headers'],
                            'current_stage' => 'Preview',
                        ]);

                        return response()->json([
                            'success' => true,
                            'job_id' => $job->id,
                            'sessionId' => $sessionId,
                            'headers' => $extractionResult['headers'],
                            'rows' => $extractionResult['rows'],
                            'templateHeaders' => $templateHeaders ?: ($extractionResult['templateHeaders'] ?? []),
                            'message' => 'Extraction successful (Node.js Magic Engine)'
                        ]);
                    } else {
                        \Log::warning("Node.js Proxy returned error, falling back: " . $response->body());
                    }
                } catch (\Exception $proxyEx) {
                    \Log::error("Node.js Proxy connection failed, falling back to internal logic", [
                        'error' => $proxyEx->getMessage()
                    ]);
                    // Continue to fallback logic below
                }
            }

            // --- Fallback Internal Logic ---
            // (Only used if NODE_SERVER_URL is not set or proxy fails)
            $doc = $documents[0];
            $extractionResult = $this->extractionService->extract($doc->getRealPath(), $doc->getClientOriginalName());
            
            if ($templateId && config("templates.{$templateId}")) {
                $templateHeaders = config("templates.{$templateId}.headers");
            } elseif ($tpl) {
                $tFile = $this->storeFile($tpl, $user->id, $sessionId, 'template_csv');
                $tplResult = $this->extractionService->extract($tpl->getRealPath(), $tpl->getClientOriginalName());
                $templateHeaders = $tplResult['headers'];
            }

            $job = ProcessingJob::create([
                'user_id' => $user->id,
                'session_id' => $sessionId,
                'customer_file_id' => $cFiles[0]->id,
                'template_file_id' => $tFile ? $tFile->id : null,
                'status' => 'extracting',
                'extracted_data' => $extractionResult['rows'],
                'template_headers' => $templateHeaders,
                'source_columns' => $extractionResult['headers'],
                'current_stage' => 'Preview',
            ]);

            return response()->json([
                'success' => true,
                'job_id' => $job->id,
                'sessionId' => $sessionId,
                'headers' => $extractionResult['headers'],
                'rows' => $extractionResult['rows'],
                'templateHeaders' => $templateHeaders,
                'message' => 'Extraction successful (Laravel Fallback)'
            ]);

        } catch (\Exception $e) {
            \Log::error('Unified Extraction failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Processing Failed',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    protected function storeFile($file, $userId, $sessionId, $type)
    {
        $disk = config('filesystems.default');
        $path = $file->store("uploads/{$userId}/{$sessionId}/{$type}", $disk);
        return File::create([
            'user_id' => $userId,
            'session_id' => $sessionId,
            'file_type' => $type,
            'processing_stage' => 'uploaded',
            'original_name' => $file->getClientOriginalName(),
            'stored_name' => basename($path),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'file_hash' => hash_file('sha256', $file->getRealPath()),
            'expires_at' => now()->addDays(30),
            'status' => 'uploaded',
        ]);
    }

    public function aiFix(Request $request)
    {
        try {
            $type = $request->input('type');
            $data = $request->input('data');
            $config = $request->input('config', []);

            $result = null;
            if ($type === 'row') {
                $result = $this->aiService->cleanRow($data, $config['headers'] ?? []);
            } elseif ($type === 'mapping') {
                $result = $this->aiService->suggestMapping($data['sourceColumns'], $data['templateHeaders']);
            } elseif ($type === 'transform') {
                $transformation = $this->aiService->transformData($data['rows'], $data['prompt']);
                $result = $transformation['transformedRows'] ?? $data['rows'];
            } else {
                return response()->json(['error' => 'Invalid AI fix type'], 400);
            }

            return response()->json(['success' => true, 'result' => $result]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            $rows = $request->input('rows');
            $headers = $request->input('headers');
            $format = $request->input('format', 'csv');
            
            \Log::info('Starting export', [
                'format' => $format,
                'rows_count' => count($rows),
                'headers_count' => count($headers)
            ]);

            if (empty($rows)) {
                throw new \Exception("No data rows provided for export.");
            }

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            // Set Headers (Dynamic from template)
            foreach ($headers as $colIdx => $header) {
                // Column index in PhpSpreadsheet is 1-based
                $sheet->getCell([$colIdx + 1, 1])->setValue($header);
            }

            // Set Rows
            foreach ($rows as $rowIdx => $rowData) {
                foreach ($headers as $colIdx => $header) {
                    $value = $rowData[$header] ?? '';
                    // Force string to avoid scientific notation or date conversion issues
                    // [column, row] where row starts at 2 (since row 1 is header)
                    $sheet->getCell([$colIdx + 1, $rowIdx + 2])->setValue((string)$value);
                }
            }

            $fileName = "TiPiC_Export_" . now()->format('Ymd_His');
            
            if ($format === 'xlsx') {
                $writer = new Xlsx($spreadsheet);
                $contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                $fileName .= '.xlsx';
            } else {
                $writer = new Csv($spreadsheet);
                $writer->setUseBOM(true); 
                $contentType = 'text/csv; charset=utf-8';
                $fileName .= '.csv';
            }

            return response()->streamDownload(function() use ($writer) {
                $writer->save('php://output');
            }, $fileName, [
                'Content-Type' => $contentType,
                'Cache-Control' => 'no-cache',
                'Pragma' => 'no-cache',
            ]);

        } catch (\Exception $e) {
            \Log::error('Export failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false, 
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getJob($id)
    {
        $job = \App\Models\ProcessingJob::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();
            
        return response()->json([
            'success' => true,
            'job' => $job,
            'customerFileUrl' => route('api.files.show', ['id' => $job->customer_file_id])
        ]);
    }

    public function saveJob(Request $request, $id)
    {
        $job = ProcessingJob::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $job->update([
            'mapped_data' => $request->rows,
            'template_headers' => $request->headers,
            'source_columns' => $request->source_columns,
            'mapping' => $request->mapping,
            'status' => 'completed',
            'completed_at' => now()
        ]);

        return response()->json(['success' => true, 'message' => 'Progress saved.']);
    }

    public function nodeHealth()
    {
        $nodeUrl = config('services.node.url');
        try {
            $response = Http::timeout(5)->get("{$nodeUrl}/api/v1/health");
            return response()->json([
                'proxy_reachable' => true,
                'node_status' => $response->successful() ? 'running' : 'error',
                'node_response' => $response->json(),
                'node_url' => $nodeUrl
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'proxy_reachable' => false,
                'node_status' => 'offline',
                'error' => $e->getMessage(),
                'node_url' => $nodeUrl
            ]);
        }
    }

    public function serveFile($id)
    {
        $file = \App\Models\File::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $disk = config('filesystems.default');
        if (!\Illuminate\Support\Facades\Storage::disk($disk)->exists($file->file_path)) {
            abort(404);
        }

        return \Illuminate\Support\Facades\Storage::disk($disk)->response($file->file_path, $file->original_name);
    }
}

