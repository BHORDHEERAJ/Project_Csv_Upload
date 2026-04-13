<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\ProcessingHistory;
use App\Models\Notification;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function getStorageQuota(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'storage_limit' => $user->storage_limit,
            'storage_used' => $user->storage_used,
            'available_space' => $user->storage_limit - $user->storage_used,
            'usage_percentage' => ($user->storage_used / $user->storage_limit) * 100,
        ]);
    }

    public function getHistory(Request $request)
    {
        $history = ProcessingHistory::where('user_id', $request->user()->id)
            ->with(['job.customer_file', 'file'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($history);
    }

    public function getNotifications(Request $request)
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->where('is_dismissed', false)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }
}
