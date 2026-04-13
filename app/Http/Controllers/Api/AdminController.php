<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\PerformanceMetric;
use App\Models\StorageCleanupLog;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function storageStats()
    {
        $totalStorageUsed = User::sum('storage_used');
        return response()->json([
            'total_storage_used' => $totalStorageUsed,
            'user_count' => User::count(),
        ]);
    }

    public function cleanupLogs()
    {
        return response()->json(StorageCleanupLog::orderBy('cleaned_at', 'desc')->paginate(20));
    }

    public function metrics()
    {
        return response()->json(PerformanceMetric::orderBy('recorded_at', 'desc')->limit(100)->get());
    }

    public function listUsers()
    {
        return response()->json(User::paginate(15));
    }

    public function updateQuota(Request $request, $id)
    {
        $request->validate(['storage_limit' => 'required|integer']);
        $user = User::findOrFail($id);
        $user->update(['storage_limit' => $request->storage_limit]);
        return response()->json(['message' => 'Quota updated successfully']);
    }
}
