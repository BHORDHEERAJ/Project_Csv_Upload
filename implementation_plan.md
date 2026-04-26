# Updated Implementation Plan - Unified Customer Data Processing System

**Goal**: consolidate all logic into a **single Laravel application** (Single Deployment) and implement a robust OCR/AI pipeline with multi-provider fallbacks and Marathi support.

## User Review Required

> [!IMPORTANT]
> **Unified Architecture**: The Node.js server (`tipic-node`) will be **removed**. All extraction, OCR, and AI logic will be moved into Laravel Controllers and Services. This ensures a single deployment (one domain, one server).

> [!IMPORTANT]
> **Dependencies**: We will install PHP packages for Excel/PDF parsing (e.g., `phpoffice/phpspreadsheet`, `smalot/pdfparser`) to replace their Node.js equivalents.

## Proposed Changes

---

### Phase 1: Laravel Backend Refactoring (Extraction & AI)

#### [NEW] [ExtractionService.php](file:///e:/Dheeraj/Project_Csv/app/Services/ExtractionService.php)
- Handle file type detection.
- **Excel/CSV**: Use `PhpSpreadsheet` to extract headers and rows.
- **PDF/Image (OCR)**: 
    - Use **Google Vision API** (via HTTP/Client) for primary extraction.
    - Implement **Gemini Vision** fallback for complex layouts.
    - Implement **Rule-based fallback** for simple text-based PDFs.

#### [NEW] [AIService.php](file:///e:/Dheeraj/Project_Csv/app/Services/AIService.php)
- Implement `FallbackChain`: 
    1. **Gemini 2.0 Flash** (Primary)
    2. **OpenAI GPT-4o-mini** (Fallback 1)
    3. **Groq / Llama 3** (Fallback 2)
    4. **Deterministic Rules** (Final Backup)
- Handle **Batch Processing**: Groups rows into chunks for AI normalization to reduce API calls.
- **Marathi Support**: Explicitly instruct AI to maintain and clean Marathi text using UTF-8.

#### [MODIFY] [AiProxyController.php](file:///e:/Dheeraj/Project_Csv/app/Http/Controllers/Api/AiProxyController.php)
- Remove all `Http::post($this->nodeServer, ...)` calls.
- Directly call `ExtractionService` and `AIService`.
- Update response formats to match what the frontend expects.

---

### Phase 2: Data Mapping & Normalization

#### [NEW] [MappingEngine.php](file:///e:/Dheeraj/Project_Csv/app/Services/MappingEngine.php)
- **Fuzzy Mapping**: Initial mapping based on string similarity (e.g., "Full Name" -> "Name").
- **AI Suggestion**: If confidence < 85%, use AI to suggest mapping.
- **Field Normalization**:
    - Clean phone numbers (Regex + AI).
    - Trim strings, remove OCR noise (special characters).
    - Handle date format standardization.

---

### Phase 3: Frontend Enhancements (React)

#### [MODIFY] [Preview.jsx](file:///e:/Dheeraj/Project_Csv/resources/js/pages/Preview.jsx)
- **Table Features**:
    - **Multi-cell/Multi-row Selection**: Use checkboxes for bulk actions (Delete/Apply Password).
    - **Search/Filter**: Add client-side filtering for the extracted data.
- **Password UI**:
    - Add "Set for Selected Rows" button.
    - Add "Auto-Generate Labels" to show what formula is being used.
- **Status Indicators**: Show "Source: Vision API" or "Source: AI Fallback" for transparency.

---

### Phase 4: Export & Dashboard

#### [MODIFY] [Export Logic]
- Implement XLSX/CSV export directly in Laravel (using `PhpSpreadsheet`).
- Ensure **UTF-8 BOM** is included for CSVs to fix Marathi display in Excel.

#### [MODIFY] [DashboardController.php](file:///e:/Dheeraj/Project_Csv/app/Http/Controllers/Api/DashboardController.php)
- Calculate **Success Rate**: `(Successful Jobs / Total Jobs) * 100`.
- Calculate **OCR Confidence Average** from stored job metadata.

---

## Open Questions

1. **PDF Support**: Is it okay to use a PHP-based PDF parser (lighter) or do you prefer a dedicated OCR-first approach for ALL PDFs to ensure accuracy?
2. **AI Keys**: Please ensure `.env` contains `OPENAI_API_KEY` and `GROQ_API_KEY` if you want those fallbacks active.
3. **Deployment**: Since we are moving to a single Laravel deployment, do you want me to delete the `tipic-node` folder once the migration is complete?

## Verification Plan

### Automated
- `php artisan test` to verify extraction logic.
- Verify API response times (targeted < 5s for rule-based, < 15s for AI).

### Manual
- Upload a Marathi-only PDF and verify character integrity in the editable table.
- Test "Bulk Password" apply on 10+ rows simultaneously.
- Verify Exported CSV opens correctly in Excel without broken characters.
