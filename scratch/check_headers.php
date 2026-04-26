<?php
require 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$files = [
    'E:\Dheeraj\Project_Csv\storage\app\public\uploads\1776248867306-953999957-bulk_products_template.csv',
    'E:\Dheeraj\Project_Csv\storage\app\public\uploads\1776248297337-158641989-employee_template_fulltime (1).xlsx'
];

foreach ($files as $file) {
    echo "Headers for $file:\n";
    try {
        $spreadsheet = IOFactory::load($file);
        $sheet = $spreadsheet->getActiveSheet();
        $highestColumn = $sheet->getHighestColumn();
        $headers = $sheet->rangeToArray('A1:' . $highestColumn . '1', NULL, TRUE, FALSE);
        print_r($headers[0]);
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    echo "-------------------\n";
}
