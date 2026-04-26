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
        try {
            if (!$request->hasFile('document')) {
                return response()->json(['error' => 'Source document is required'], 400);
            }

            $user = auth()->user();
            $sessionId = Str::random(32);
            $doc = $request->file('document');
            $tpl = $request->file('template');
            $templateId = $request->input('template_id');

            // 1. Storage & Database Tracking
            $cFile = $this->storeFile($doc, $user->id, $sessionId, 'customer_input');
            
            $templateHeaders = [];
            $tFile = null;

            // 2. Extraction Logic
            $extractionResult = $this->extractionService->extract($doc->getRealPath(), $doc->getClientOriginalName());
            
            if ($templateId && config("templates.{$templateId}")) {
                $templateHeaders = config("templates.{$templateId}.headers");
            } elseif ($tpl) {
                $tFile = $this->storeFile($tpl, $user->id, $sessionId, 'template_csv');
                $tplResult = $this->extractionService->extract($tpl->getRealPath(), $tpl->getClientOriginalName());
                $templateHeaders = $tplResult['headers'];
            }

            // 3. Create Processing Job
            $job = ProcessingJob::create([
                'user_id' => $user->id,
                'session_id' => $sessionId,
                'customer_file_id' => $cFile->id,
                'template_file_id' => $tFile ? $tFile->id : null,
                'status' => 'extracting',
                'extracted_data' => $extractionResult['rows'],
                'template_headers' => $templateHeaders,
                'source_columns' => $extractionResult['headers'],
                'current_stage' => 'Preview',
            ]);

            // 4. History Logging
            ProcessingHistory::create([
                'user_id' => $user->id,
                'job_id' => $job->id,
                'file_id' => $cFile->id,
                'action_type' => 'extraction',
                'action_status' => 'success',
                'details' => ['job_id' => $job->id, 'rows_count' => count($extractionResult['rows'])],
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent()
            ]);

            return response()->json([
                'success' => true,
                'job_id' => $job->id,
                'sessionId' => $sessionId,
                'headers' => $extractionResult['headers'],
                'rows' => $extractionResult['rows'],
                'templateHeaders' => $templateHeaders,
                'message' => 'Extraction successful (Unified Engine)'
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
        $path = $file->store("uploads/{$userId}/{$sessionId}/{$type}");
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
        $job = ProcessingJob::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();
            
        return response()->json([
            'success' => true,
            'job' => $job
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
        return response()->json([
            'proxy_reachable' => true,
            'node_status' => ['status' => 'unified', 'message' => 'Node sidecar removed']
        ]);
    }
}
