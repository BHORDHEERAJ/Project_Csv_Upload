<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function up(): void
    {
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@tipic.com',
            'password' => Hash::make('password123'),
            'account_tier' => 'enterprise',
            'storage_limit' => 10737418240, // 10GB for Admin
        ]);
    }

    /**
     * Legacy support for run method.
     */
    public function run(): void
    {
        $this->up();
    }
}
