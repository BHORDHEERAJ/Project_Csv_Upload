<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\ProcessingJob;
use App\Models\User;

$user = User::first(); // Just get any user for testing

if (!$user) {
    echo "No users found in database.\n";
    exit;
}

try {
    $recentJobs = ProcessingJob::with(['customerFile' => function($query) {
            $query->select('id', 'original_name');
        }])
        ->select('id', 'session_id', 'customer_file_id', 'created_at', 'status')
        ->where('user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->limit(10)
        ->get();

    echo "Successfully fetched " . $recentJobs->count() . " jobs.\n";
    foreach ($recentJobs as $job) {
        echo "Job ID: " . $job->id . " | Status: " . $job->status . " | File: " . ($job->customerFile ? $job->customerFile->original_name : 'N/A') . "\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
