import { GoogleGenAI } from '@google/genai';
import { WebsiteData, Language, WebsiteType } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const genAI = new GoogleGenAI({ apiKey: API_KEY });

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

    try {
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
        console.error('Gemini API Error:', error);

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
