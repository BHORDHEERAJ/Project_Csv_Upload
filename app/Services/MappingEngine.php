<?php

namespace App\Services;

class MappingEngine
{
    protected $aiService;

    public function __construct(AIService $aiService)
    {
        $this->aiService = $aiService;
    }

    public function autoMap(array $sourceHeaders, array $templateHeaders)
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

        // If many fields unmapped, use AI to assist
        if (count($unmappedTemplate) > 0 && count($unmappedTemplate) > count($templateHeaders) / 2) {
             try {
                 $aiSuggestions = $this->aiService->suggestMapping($sourceHeaders, $templateHeaders);
                 return array_merge($mapping, $aiSuggestions);
             } catch (\Exception $e) {
                 // Fallback to whatever fuzzy matches we found
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

            // 2. Levenshtein Similarity
            $lev = levenshtein($target, $optClean);
            $sim = 1 - ($lev / max(strlen($target), strlen($optClean), 1));
            if ($sim > 0.8 && $sim > $maxScore) {
                $maxScore = $sim;
                $bestMatch = $option;
            }

            // 3. Keyword match (Marathi + English common terms)
            $keywords = [
                'name' => ['नाव', 'full name', 'employee', 'customer'],
                'mobile' => ['मोबाईल', 'phone', 'contact', 'cell'],
                'address' => ['पत्ता', 'location', 'city'],
                'date' => ['तारीख', 'dob', 'joining'],
                'id' => ['कोड', 'code', 'no', 'number'],
                'amount' => ['रक्कम', 'price', 'total', 'salary']
            ];

            foreach ($keywords as $key => $syns) {
                if (str_contains($target, $key)) {
                    foreach ($syns as $syn) {
                        if (str_contains($optClean, $syn)) return $option;
                    }
                }
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
