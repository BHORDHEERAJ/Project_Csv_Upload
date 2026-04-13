<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\ProcessingJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'customer_file' => 'required|file|max:51200', // 50MB
            'template_file' => 'required|file|max:51200',
            'mapping_config' => 'required|string',
        ]);

        $user = $request->user();
        $sessionId = Str::random(32);

        // Handle customer file
        $customerFile = $request->file('customer_file');
        $customerPath = $customerFile->store("uploads/{$user->id}/{$sessionId}/customer_original");
        
        $cFile = File::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'session_id' => $sessionId,
            'file_type' => 'customer_input',
            'processing_stage' => 'uploaded',
            'original_name' => $customerFile->getClientOriginalName(),
            'stored_name' => basename($customerPath),
            'file_path' => $customerPath,
            'file_size' => $customerFile->getSize(),
            'mime_type' => $customerFile->getMimeType(),
            'file_hash' => hash_file('sha256', $customerFile->getRealPath()),
            'expires_at' => now()->addDays(30),
            'status' => 'uploaded',
        ]);

        // Handle template file
        $templateFile = $request->file('template_file');
        $templatePath = $templateFile->store("uploads/{$user->id}/{$sessionId}/template_files");

        $tFile = File::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'session_id' => $sessionId,
            'file_type' => 'template_csv',
            'processing_stage' => 'uploaded',
            'original_name' => $templateFile->getClientOriginalName(),
            'stored_name' => basename($templatePath),
            'file_path' => $templatePath,
            'file_size' => $templateFile->getSize(),
            'mime_type' => $templateFile->getMimeType(),
            'file_hash' => hash_file('sha256', $templateFile->getRealPath()),
            'expires_at' => now()->addDays(30),
            'status' => 'uploaded',
        ]);

        // Create Processing Job
        $job = ProcessingJob::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'session_id' => $sessionId,
            'customer_file_id' => $cFile->id,
            'template_file_id' => $tFile->id,
            'mapping_config_name' => $request->mapping_config,
            'mapping_config_version' => 1, // Default version
            'status' => 'pending',
            'progress' => 0,
        ]);

        return response()->json([
            'message' => 'Files uploaded successfully. Processing started.',
            'session_id' => $sessionId,
            'job_id' => $job->uuid,
        ], 202);
    }

    public function status($sessionId)
    {
        $job = ProcessingJob::where('session_id', $sessionId)->firstOrFail();

        return response()->json([
            'status' => $job->status,
            'progress' => $job->progress,
            'current_stage' => $job->current_stage,
            'error' => $job->error_message,
        ]);
    }

    public function deleteSession($sessionId)
    {
        $user = auth()->user();
        $files = File::where('session_id', $sessionId)->where('user_id', $user->id)->get();

        foreach ($files as $file) {
            Storage::delete($file->file_path);
            $file->delete(); // Soft delete as per schema
        }

        ProcessingJob::where('session_id', $sessionId)->delete();

        return response()->json(['message' => 'Session deleted successfully']);
    }
}
