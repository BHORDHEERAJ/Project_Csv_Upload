# Google Cloud AI Setup Guide (TiPiC Project)

This document outlines the **Two-Key Strategy** for integrating Gemini AI and Cloud Vision OCR.

## 🚀 The Strategy: Two Separate Keys
Due to Google Cloud Console limitations, selecting "Generative Language API" can often grey out "Cloud Vision API" (and vice versa) when applying restrictions. The most reliable solution is to maintain **two separate API keys**.

### 1. Enable APIs in Google Cloud Console
Ensure both of the following APIs are enabled in your project:
- **Generative Language API** (for Gemini AI)
- **Cloud Vision API** (for OCR/Extraction)

---

### 2. Create and Restrict API Keys

#### **Key A: GenLangAPI (Gemini)**
- **API Restriction**: Restrict this key *only* to "Generative Language API".
- **Application Restriction**: (Android) Restrict to your package name and SHA1 fingerprint.

#### **Key B: ClovisAPI (Vision)**
- **API Restriction**: Restrict this key *only* to "Cloud Vision API".
- **Application Restriction**: (Android) Restrict to your package name and SHA1 fingerprint.

---

### 3. Implementation Details

#### 📱 Android (PWA/Mobile Implementation)
Add both keys to your `local.properties` (do NOT commit this file):
```properties
GEMINI_API_KEY=AIzaSyB7P5qF81IKJ5F8ZD7WhlR9BL2z75teZ68
VISION_API_KEY=AIzaSyCAfdSIy6xHpqGScwAAUXrGhOdtpFktDHM
```

Expose them via `build.gradle`:
```gradle
buildConfigField "String", "GEMINI_API_KEY", "\"${project.property('GEMINI_API_KEY')}\""
buildConfigField "String", "VISION_API_KEY", "\"${project.property('VISION_API_KEY')}\""
```

#### 🖥️ Backend (Node.js Service)
Sync these keys in `tipic-node/.env`:
```env
# .env
GOOGLE_VISION_API_KEY=AIzaSyCAfdSIy6xHpqGScwAAUXrGhOdtpFktDHM
GEMINI_API_KEY=AIzaSyB7P5qF81IKJ5F8ZD7WhlR9BL2z75teZ68
```

---

### 🛡️ Production Best Practices: SDKs & Service Accounts
For production-grade applications, avoid using direct API keys (via `?key=...` query parameters) as they are less secure and harder to manage.

#### 1. Use the Official SDKs
The TiPiC project has been optimized to use:
- `@google/generative-ai` for all Gemini AI features.
- `@google-cloud/vision` for high-accuracy OCR.
These SDKs handle authentication headers and token exchanges securely.

#### 2. Service Account (IAM) Authentication
Instead of API keys, use a **Service Account** with the "Cloud Vision API User" and "Generative Language API User" roles.
1. Download your Service Account JSON file from the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Save it securely (e.g., as `service-account.json` in your backend).
3. Set the path in your `.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
   ```

#### 3. Why this is better:
- **No Keys in URLs**: Prevents keys from leaking in browser history or server logs.
- **Granular Permissions**: You can revoke access specifically for one service without affecting others.
- **Automatic Rotation**: Service accounts support easier credential rotation.

> [!TIP]
> The backend is currently configured to prioritize your **Service Account JSON** if provided, and will automatically fall back to your **Restricted API Keys** if the JSON file is not found.
