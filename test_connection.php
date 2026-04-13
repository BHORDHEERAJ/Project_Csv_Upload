<?php
$ch = curl_init('http://127.0.0.1:3000/api/v1/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
if(curl_errno($ch)){
    echo 'Curl error: ' . curl_error($ch);
} else {
    echo 'Response: ' . $response;
}
curl_close($ch);
