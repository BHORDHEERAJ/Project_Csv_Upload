<?php
$ch = curl_init('http://127.0.0.1:3000/api/v1/ai-fix');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['type' => 'row', 'data' => [], 'config' => ['headers'=>[]]]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
if(curl_errno($ch)){
    echo 'Curl error: ' . curl_error($ch);
} else {
    echo 'Response: ' . $response;
}
curl_close($ch);
