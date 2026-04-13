<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\ProcessingJob;
use App\Models\ProcessingHistory;
use App\Models\File;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class AiProxyController extends Controller
{
    public function __construct()
    {
        $this->nodeServer = env('AI_NODE_URL', 'http://127.0.0.1:3000/api/v1');
    }

    private $nodeServer;

    public function extract(Request $request)
    {
        $httpRequest = Http::timeout(120)->connectTimeout(30); // increased to 30s for Node startup latency
        
        if ($request->hasFile('document')) {
            $httpRequest = $httpRequest->attach(
                'document', 
                fopen($request->file('document')->getRealPath(), 'r'), 
                $request->file('document')->getClientOriginalName()
            );
        }

        if ($request->hasFile('template')) {
            $httpRequest = $httpRequest->attach(
                'template', 
                fopen($request->file('template')->getRealPath(), 'r'), 
                $request->file('template')->getClientOriginalName()
            );
        }

        try {
            $res = $httpRequest->post("{$this->nodeServer}/extract");
            
            if ($res->successful() && auth()->check()) {
                $data = $res->json();
                $user = auth()->user();
                $sessionId = Str::random(32);

                // Handle customer file storage
                $cFile = null;
                if ($request->hasFile('document')) {
                    $doc = $request->file('document');
                    $path = $doc->store("uploads/{$user->id}/{$sessionId}/customer_original");
                    $cFile = File::create([
                        'user_id' => $user->id,
                        'session_id' => $sessionId,
                        'file_type' => 'customer_input',
                        'processing_stage' => 'uploaded',
                        'original_name' => $doc->getClientOriginalName(),
                        'stored_name' => basename($path),
                        'file_path' => $path,
                        'file_size' => $doc->getSize(),
                        'mime_type' => $doc->getMimeType(),
                        'file_hash' => hash_file('sha256', $doc->getRealPath()),
                        'expires_at' => now()->addDays(30),
                        'status' => 'uploaded',
                    ]);
                }

                // Handle template file storage
                $tFile = null;
                if ($request->hasFile('template')) {
                    $tpl = $request->file('template');
                    $path = $tpl->store("uploads/{$user->id}/{$sessionId}/template_files");
                    $tFile = File::create([
                        'user_id' => $user->id,
                        'session_id' => $sessionId,
                        'file_type' => 'template_csv',
                        'processing_stage' => 'uploaded',
                        'original_name' => $tpl->getClientOriginalName(),
                        'stored_name' => basename($path),
                        'file_path' => $path,
                        'file_size' => $tpl->getSize(),
                        'mime_type' => $tpl->getMimeType(),
                        'file_hash' => hash_file('sha256', $tpl->getRealPath()),
                        'expires_at' => now()->addDays(30),
                        'status' => 'uploaded',
                    ]);
                }

                $job = ProcessingJob::create([
                    'user_id' => $user->id,
                    'session_id' => $sessionId,
                    'customer_file_id' => $cFile ? $cFile->id : null,
                    'template_file_id' => $tFile ? $tFile->id : null,
                    'status' => 'extracting',
                    'extracted_data' => $data['rows'] ?? [],
                    'template_headers' => $data['templateHeaders'] ?? [],
                    'source_columns' => $data['headers'] ?? [],
                    'current_stage' => 'Preview',
                ]);
                
                $data['job_id'] = $job->id;

                // Log to ProcessingHistory
                ProcessingHistory::create([
                    'user_id' => $user->id,
                    'job_id' => $job->id,
                    'file_id' => $cFile ? $cFile->id : null,
                    'action_type' => 'extraction',
                    'action_status' => 'success',
                    'details' => ['job_id' => $job->id, 'rows_count' => count($data['rows'] ?? [])],
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent()
                ]);

                return response()->json($data, $res->status());
            }

            return response($res->body(), $res->status())
                ->withHeaders($res->headers());
        } catch (\Exception $e) {
            \Log::error('AI Extraction failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Processing Failed',
                'details' => $e->getMessage(),
                'type' => get_class($e)
            ], 500);
        }
    }

    public function aiFix(Request $request)
    {
        try {
            $res = Http::timeout(120)->post("{$this->nodeServer}/ai-fix", $request->all());
            return response($res->body(), $res->status())
                ->withHeaders($res->headers());
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 504);
        \Log::error('AI Node request failed (aiFix)', [
            'url' => "{$this->nodeServer}/ai-fix",
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        }
    }

    public function export(Request $request)
    {
        try {
            // Update Job if job_id is provided
            if ($request->has('job_id')) {
                $job = ProcessingJob::where('id', $request->job_id)->first();
                if ($job) {
                    $job->update([
                        'mapped_data' => $request->rows,
                        'template_headers' => $request->headers,
                        'source_columns' => $request->source_columns,
                        'mapping' => $request->mapping,
                        'status' => 'completed',
                        'completed_at' => now()
                    ]);

                    // Log to ProcessingHistory
                    ProcessingHistory::create([
                        'user_id' => auth()->id(),
                        'job_id' => $job->id,
                        'action_type' => 'export',
                        'action_status' => 'success',
                        'details' => ['format' => $request->format, 'job_id' => $job->id],
                        'ip_address' => request()->ip(),
                        'user_agent' => request()->userAgent()
                    ]);
                }
            }

            $res = Http::timeout(120)->post("{$this->nodeServer}/export", $request->all());
            $response = response($res->body(), $res->status());
            foreach ($res->headers() as $name => $values) {
                $response->header($name, $values[0]);
            }
            return $response;
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 504);
        \Log::error('AI Node request failed (export)', [
            'url' => "{$this->nodeServer}/export",
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        }
    }

    public function nodeHealth()
    {
        try {
            $res = Http::get("{$this->nodeServer}/health");
            return response()->json([
                'proxy_reachable' => true,
                'node_status' => $res->json()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'proxy_reachable' => false,
                'error' => $e->getMessage()
            ], 500);
        \Log::error('AI Node health check failed', [
            'url' => "{$this->nodeServer}/health",
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
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
            'status' => 'completed', // Or mapping? 
            'completed_at' => now()
        ]);

        // Log to ProcessingHistory
        ProcessingHistory::create([
            'user_id' => auth()->id(),
            'job_id' => $job->id,
            'action_type' => 'config_update',
            'action_status' => 'success',
            'details' => ['message' => 'Manual save triggered', 'job_id' => $job->id],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Progress saved successfully.'
        ]);
    }
}
