<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

use App\Models\File;
use App\Models\StorageCleanupLog;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

#[Signature('app:cleanup-expired-files')]
#[Description('Deletes files older than 30 days and logs the action')]
class CleanupExpiredFiles extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $expiredFiles = File::where('expires_at', '<', Carbon::now())
            ->where('status', '!=', 'deleted')
            ->get();

        if ($expiredFiles->isEmpty()) {
            $this->info('No expired files found.');
            return;
        }

        $this->info('Cleaning up ' . $expiredFiles->count() . ' expired files...');

        foreach ($expiredFiles as $file) {
            try {
                // Delete physical file
                if (Storage::exists($file->file_path)) {
                    Storage::delete($file->file_path);
                }

                // Log the cleanup
                StorageCleanupLog::create([
                    'file_id' => $file->id,
                    'user_id' => $file->user_id,
                    'session_id' => $file->session_id,
                    'file_path' => $file->file_path,
                    'file_name' => $file->original_name,
                    'file_size' => $file->file_size,
                    'file_type' => $file->file_type,
                    'cleanup_reason' => 'expired',
                    'triggered_by' => 'cron_job',
                    'trigger_type' => 'cron_job',
                    'cleaned_at' => Carbon::now(),
                ]);

                // Mark as deleted in DB or hard delete
                $file->update(['status' => 'deleted']);
                $file->delete(); // Soft delete if trait is used, otherwise hard

                $this->line("Deleted: {$file->original_name}");
            } catch (\Exception $e) {
                $this->error("Failed to delete {$file->original_name}: " . $e->getMessage());
            }
        }

        $this->info('Cleanup completed successfully.');
    }
}
