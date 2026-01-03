import { GoogleGenAI } from '@google/genai';
import { WebsiteData, Language, WebsiteType } from '../types';

// ==================== API KEY ROTATION SYSTEM ====================

// Load all API keys from environment variables (GEMINI_API_KEY_1 to GEMINI_API_KEY_20)
const loadApiKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const key = import.meta.env[`VITE_GEMINI_API_KEY_${i}`] || import.meta.env[`GEMINI_API_KEY_${i}`];
    if (key && typeof key === 'string' && key.trim()) {
      keys.push(key.trim());
    }
  }
  // Fallback to single key if no numbered keys found
  if (keys.length === 0) {
    const singleKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (singleKey && typeof singleKey === 'string' && singleKey.trim()) {
      keys.push(singleKey.trim());
    }
  }
  console.log(`[Gemini] Loaded ${keys.length} API key(s)`);
  return keys;
};

const API_KEYS = loadApiKeys();

// Track failed keys with timestamp for automatic reset
interface FailedKeyInfo {
  failedAt: number;
  errorCount: number;
}

const failedKeys = new Map<number, FailedKeyInfo>();
const FAILED_KEY_RESET_MS = 5 * 60 * 1000; // Reset failed keys after 5 minutes
const MAX_RETRIES = 3;

// Current key index for round-robin
let currentKeyIndex = 0;
// Sticky key - use this key until it fails
let stickyKeyIndex = 0;

// Get the next available API key (round-robin with failed key skipping)
const getNextApiKey = (): { key: string; index: number } | null => {
  if (API_KEYS.length === 0) {
    console.error('[Gemini] No API keys available');
    return null;
  }

  const now = Date.now();

  // Reset keys that have been failed for too long
  for (const [index, info] of failedKeys.entries()) {
    if (now - info.failedAt > FAILED_KEY_RESET_MS) {
      console.log(`[Gemini] Resetting key ${index + 1} after cooldown`);
      failedKeys.delete(index);
    }
  }

  // First, try the sticky key if it's not failed
  if (!failedKeys.has(stickyKeyIndex)) {
    return { key: API_KEYS[stickyKeyIndex], index: stickyKeyIndex };
  }

  // Find next available key using round-robin
  const startIndex = currentKeyIndex;
  let attempts = 0;

  while (attempts < API_KEYS.length) {
    if (!failedKeys.has(currentKeyIndex)) {
      const key = API_KEYS[currentKeyIndex];
      const index = currentKeyIndex;
      // Update sticky key to this new working key
      stickyKeyIndex = currentKeyIndex;
      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
      console.log(`[Gemini] Using key ${index + 1}/${API_KEYS.length}`);
      return { key, index };
    }
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    attempts++;
  }

  // All keys are failed, reset all and try again
  console.warn('[Gemini] All keys failed, resetting all keys');
  failedKeys.clear();
  stickyKeyIndex = 0;
  currentKeyIndex = 0;
  return { key: API_KEYS[0], index: 0 };
};

// Mark a key as failed
const markKeyAsFailed = (index: number, error: any): void => {
  const existing = failedKeys.get(index);
  const errorCount = existing ? existing.errorCount + 1 : 1;

  failedKeys.set(index, {
    failedAt: Date.now(),
    errorCount
  });

  console.warn(`[Gemini] Key ${index + 1} failed (count: ${errorCount}):`, error?.message || error);

  // Move to next key
  currentKeyIndex = (index + 1) % API_KEYS.length;
};

// Create GenAI instance with specific key
const createGenAI = (apiKey: string): GoogleGenAI => {
  return new GoogleGenAI({ apiKey });
};

// Get status of all keys (for debugging)
export const getKeyStatus = (): { total: number; available: number; failed: number[] } => {
  const failedIndices = Array.from(failedKeys.keys()).map(i => i + 1);
  return {
    total: API_KEYS.length,
    available: API_KEYS.length - failedKeys.size,
    failed: failedIndices
  };
};

// ==================== END API KEY ROTATION SYSTEM ====================

export async function generateWebsite(
  prompt: string,
  language: Language,
  type: WebsiteType,
  selectedPages: string[],
  includeAdmin: boolean,
  referenceUrl?: string,
  referenceImage?: string | null
): Promise<WebsiteData> {
  const lang = language === 'vi' ? 'Tiếng Việt' : 'English';
  const websiteType = type === 'landing' ? 'single-page landing page' : 'multi-page website';

  let systemPrompt = `You are an expert web developer. Generate a complete, production-ready ${websiteType} based on the user's description.

IMPORTANT REQUIREMENTS:
- Language: All content MUST be in ${lang}
- Design: Modern, beautiful, responsive UI with Tailwind CSS classes
- SEO: Include proper meta tags, schema.org, and semantic HTML
- Files: Return valid HTML, CSS, and JavaScript files
${type === 'website' ? `- Pages to include: ${selectedPages.join(', ')}` : ''}
${includeAdmin ? '- Include a basic admin dashboard page' : ''}
${referenceUrl ? `- Take design inspiration from: ${referenceUrl}` : ''}

RESPONSE FORMAT (JSON only, no markdown):
{
  "files": [
    { "path": "index.html", "content": "...", "type": "html" },
    { "path": "styles.css", "content": "...", "type": "css" },
    { "path": "script.js", "content": "...", "type": "js" }
  ],
  "seo": {
    "title": "...",
    "description": "...",
    "keywords": "..."
  }
}`;

  const contents: any[] = [];

  // Add image if provided
  if (referenceImage && referenceImage.startsWith('data:image')) {
    const base64Data = referenceImage.split(',')[1];
    const mimeType = referenceImage.split(';')[0].split(':')[1];

    contents.push({
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `Analyze this reference image and use its design style (colors, layout, typography) as inspiration.\n\nUser Request: ${prompt}\n\n${systemPrompt}`
        }
      ]
    });
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nUser Request: ${prompt}` }]
    });
  }

  // Retry logic with key rotation
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const keyInfo = getNextApiKey();
    if (!keyInfo) {
      throw new Error('No API keys available');
    }

    try {
      const genAI = createGenAI(keyInfo.key);
      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      });

      const text = response.text || '';

      // Clean up the response - remove markdown code blocks if present
      let jsonStr = text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const data = JSON.parse(jsonStr) as WebsiteData;
      return data;
    } catch (error: any) {
      lastError = error;
      console.error(`[Gemini] Attempt ${attempt + 1}/${MAX_RETRIES} failed with key ${keyInfo.index + 1}:`, error?.message);

      // Check if it's a rate limit or quota error
      const isQuotaError = error?.message?.includes('429') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('rate') ||
        error?.status === 429;

      if (isQuotaError) {
        markKeyAsFailed(keyInfo.index, error);
      } else {
        // For other errors, still mark as failed but might be temporary
        markKeyAsFailed(keyInfo.index, error);
      }

      // Small delay before retry
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  console.error('[Gemini] All retries exhausted:', lastError);

  // Return a fallback template if API fails
  return {
    files: [
      {
        path: 'index.html',
        content: generateFallbackHTML(prompt, language),
        type: 'html'
      },
      {
        path: 'styles.css',
        content: generateFallbackCSS(),
        type: 'css'
      }
    ],
    seo: {
      title: prompt.slice(0, 60),
      description: prompt,
      keywords: 'website, landing page'
    }
  };
}

function generateFallbackHTML(prompt: string, language: Language): string {
  const isVi = language === 'vi';
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${prompt.slice(0, 50)}</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
  <header class="py-6 px-8 border-b border-white/10">
    <nav class="max-w-6xl mx-auto flex justify-between items-center">
      <h1 class="text-2xl font-bold">${prompt.slice(0, 30)}</h1>
      <div class="flex gap-6">
        <a href="#" class="hover:text-blue-400 transition">${isVi ? 'Trang chủ' : 'Home'}</a>
        <a href="#" class="hover:text-blue-400 transition">${isVi ? 'Giới thiệu' : 'About'}</a>
        <a href="#" class="hover:text-blue-400 transition">${isVi ? 'Liên hệ' : 'Contact'}</a>
      </div>
    </nav>
  </header>
  
  <main class="max-w-6xl mx-auto px-8 py-20">
    <section class="text-center mb-20">
      <h2 class="text-5xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        ${prompt.slice(0, 60)}
      </h2>
      <p class="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
        ${isVi ? 'Chào mừng đến với website của chúng tôi. Khám phá các dịch vụ tuyệt vời mà chúng tôi mang lại.' : 'Welcome to our website. Discover the amazing services we provide.'}
      </p>
      <button class="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg transition shadow-lg shadow-blue-500/30">
        ${isVi ? 'Bắt đầu ngay' : 'Get Started'}
      </button>
    </section>
  </main>
  
  <footer class="border-t border-white/10 py-8 text-center text-slate-400">
    <p>© 2024 ${prompt.slice(0, 30)}. ${isVi ? 'Tạo bởi DMP AI' : 'Created by DMP AI'}</p>
  </footer>
</body>
</html>`;
}

function generateFallbackCSS(): string {
  return `/* Custom styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}`;
}
