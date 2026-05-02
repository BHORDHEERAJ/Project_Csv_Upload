<?php

namespace App\Services;

class MappingEngine
{
    protected $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    public function autoMap(array $sourceHeaders, array $templateHeaders, array $sampleRows = [])
    {
        $mapping = [];
        $unmappedTemplate = [];

        foreach ($templateHeaders as $th) {
            $bestMatch = $this->findFuzzyMatch($th, $sourceHeaders);
            
            if ($bestMatch) {
                $mapping[$th] = $bestMatch;
            } else {
                $unmappedTemplate[] = $th;
                $mapping[$th] = null;
            }
        }

        // Use AI for any unmapped fields, using content as context
        if (count($unmappedTemplate) > 0) {
             try {
                 $aiSuggestions = $this->aiService->suggestMappingWithContext($sourceHeaders, $templateHeaders, $sampleRows);
                 // Only fill in nulls with AI suggestions
                 foreach ($aiSuggestions as $th => $sh) {
                     if (isset($mapping[$th]) && $mapping[$th] === null && in_array($sh, $sourceHeaders)) {
                         $mapping[$th] = $sh;
                     }
                 }
             } catch (\Exception $e) {
                 \Log::warning("AI Mapping failed: " . $e->getMessage());
             }
        }

        return $mapping;
    }

    protected function findFuzzyMatch($target, $options)
    {
        $target = strtolower(trim($target));
        $bestMatch = null;
        $maxScore = 0;

        foreach ($options as $option) {
            $optClean = strtolower(trim($option));
            
            // 1. Exact or partial match
            if ($target === $optClean || str_contains($optClean, $target) || str_contains($target, $optClean)) {
                return $option;
            }

            // 2. Keyword match (Marathi + English common terms)
            $keywords = [
                'name' => ['नाव', 'full name', 'employee', 'customer', 'item', 'product'],
                'mobile' => ['मोबाईल', 'phone', 'contact', 'cell', 'number'],
                'address' => ['पत्ता', 'location', 'city', 'village', 'गाव'],
                'date' => ['तारीख', 'dob', 'joining', 'दिनांक'],
                'id' => ['कोड', 'code', 'no', 'number', 'sr', 'अनुक्रमांक'],
                'price' => ['रक्कम', 'price', 'total', 'salary', 'mrp', 'selling', 'buying', 'किंमत', 'दर'],
                'quantity' => ['quant', 'qty', 'count', 'नग', 'प्रमाण', 'संख्या'],
                'discount' => ['सवलत', 'off', 'disc']
            ];

            foreach ($keywords as $key => $syns) {
                if (str_contains($target, $key)) {
                    foreach ($syns as $syn) {
                        if (str_contains($optClean, $syn)) return $option;
                    }
                }
            }

            // 3. Levenshtein Similarity
            $lev = levenshtein($target, $optClean);
            $sim = 1 - ($lev / max(strlen($target), strlen($optClean), 1));
            if ($sim > 0.8 && $sim > $maxScore) {
                $maxScore = $sim;
                $bestMatch = $option;
            }
        }

        return $bestMatch;
    }


    public function normalizeValue($value, $type = 'text')
    {
        $value = trim($value);
        
        switch ($type) {
            case 'mobile':
                 // Remove non-numeric characters but keep + if lead
                 $cleaned = preg_replace('/[^0-9]/', '', $value);
                 // If 12 digits starting with 91, keep or trim to 10
                 if (strlen($cleaned) === 12 && str_starts_with($cleaned, '91')) return substr($cleaned, 2);
                 return $cleaned;
            case 'number':
                 return preg_replace('/[^0-9.]/', '', $value);
            case 'marathi':
                 // Potential character set cleaning if needed
                 return $value;
            default:
                 return $value;
        }
    }
}
