<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\ProcessingJob;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Total uploads (customer documents)
        $totalUploads = File::where('user_id', $user->id)
            ->where('file_type', 'customer_input')
            ->count();

        // Processing states
        $processingStatuses = ['pending', 'queued', 'parsing', 'extracting', 'mapping', 'generating'];
        
        $processing = ProcessingJob::where('user_id', $user->id)
            ->whereIn('status', $processingStatuses)
            ->count();
            
        $successful = ProcessingJob::where('user_id', $user->id)
            ->where('status', 'completed')
            ->count();
            
        $failed = ProcessingJob::where('user_id', $user->id)
            ->where('status', 'failed')
            ->count();

        // Recent Jobs (last 10)
        $recentJobs = ProcessingJob::with(['customerFile' => function($query) {
                $query->select('id', 'original_name');
            }])
            ->select('id', 'session_id', 'customer_file_id', 'created_at', 'status')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($job) {
                // Determine mock accuracy based on status.
                // In the future this can be replaced by real accuracy calculation.
                $accuracy = '---';
                if ($job->status === 'completed') {
                    $accuracy = '100%';
                } elseif ($job->status === 'failed' || $job->status === 'cancelled') {
                    $accuracy = '0%';
                }

                return [
                    'id' => $job->id,
                    'session_id' => $job->session_id,
                    'name' => $job->customerFile ? $job->customerFile->original_name : 'Unknown File',
                    'date' => $job->created_at->timezone('Asia/Kolkata')->format('d-m-Y h:i A'),
                    'status' => $job->status,
                    'accuracy' => $accuracy,
                ];
            });

        $successRate = ($successful + $processing + $failed) > 0 
            ? round(($successful / ($successful + $processing + $failed + 0.001)) * 100, 1) 
            : 0;

        return response()->json([
            'stats' => [
                'total_uploads' => $totalUploads,
                'processing' => $processing,
                'successful' => $successful,
                'failed' => $failed,
                'success_rate' => $successRate . '%',
            ],
            'recent_jobs' => $recentJobs
        ]);
    }
}
