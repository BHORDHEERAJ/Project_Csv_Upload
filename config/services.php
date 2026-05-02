<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        'key_2' => env('GEMINI_API_KEY_2'),
        'key_3' => env('GEMINI_API_KEY_3'),
        'key_4' => env('GEMINI_API_KEY_4'),
        'key_5' => env('GEMINI_API_KEY_5'),
        'key_6' => env('GEMINI_API_KEY_6'),
        'key_7' => env('GEMINI_API_KEY_7'),
        'key_8' => env('GEMINI_API_KEY_8'),
        'key_9' => env('GEMINI_API_KEY_9'),
        'key_10' => env('GEMINI_API_KEY_10'),
        'model' => env('GEMINI_MODEL', 'gemini-1.5-flash'),
        'fallback_model' => env('GEMINI_FALLBACK_MODEL', 'gemini-2.0-flash'),
    ],

    'grok' => [
        'key' => env('GROK_API_KEY'),
        'model' => env('GROK_MODEL', 'grok-2-1212'),
    ],

    'groq' => [
        'key' => env('GROQ_API_KEY') ?: env('GROK_API_KEY'),
        'model' => env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
    ],

    'google' => [
        'vision_key' => env('GOOGLE_VISION_API_KEY'),
    ],

    'openai' => [
        'key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
    ],

    'node' => [
        'url' => env('NODE_SERVER_URL'),
    ],
];
