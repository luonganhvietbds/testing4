import { GoogleGenAI } from '@google/genai';
import { WebsiteData, Language, WebsiteType, GeneratedFile } from '../types';

// ==================== API KEY ROTATION SYSTEM ====================

const loadApiKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const key = import.meta.env[`VITE_GEMINI_API_KEY_${i}`] || import.meta.env[`GEMINI_API_KEY_${i}`];
    if (key && typeof key === 'string' && key.trim()) {
      keys.push(key.trim());
    }
  }
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

interface FailedKeyInfo {
  failedAt: number;
  errorCount: number;
}

const failedKeys = new Map<number, FailedKeyInfo>();
const FAILED_KEY_RESET_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;

let currentKeyIndex = 0;
let stickyKeyIndex = 0;

const getNextApiKey = (): { key: string; index: number } | null => {
  if (API_KEYS.length === 0) return null;

  const now = Date.now();
  for (const [index, info] of failedKeys.entries()) {
    if (now - info.failedAt > FAILED_KEY_RESET_MS) {
      failedKeys.delete(index);
    }
  }

  if (!failedKeys.has(stickyKeyIndex)) {
    return { key: API_KEYS[stickyKeyIndex], index: stickyKeyIndex };
  }

  let attempts = 0;
  while (attempts < API_KEYS.length) {
    if (!failedKeys.has(currentKeyIndex)) {
      const key = API_KEYS[currentKeyIndex];
      const index = currentKeyIndex;
      stickyKeyIndex = currentKeyIndex;
      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
      return { key, index };
    }
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    attempts++;
  }

  failedKeys.clear();
  stickyKeyIndex = 0;
  currentKeyIndex = 0;
  return { key: API_KEYS[0], index: 0 };
};

const markKeyAsFailed = (index: number, error: any): void => {
  failedKeys.set(index, {
    failedAt: Date.now(),
    errorCount: (failedKeys.get(index)?.errorCount || 0) + 1
  });
  currentKeyIndex = (index + 1) % API_KEYS.length;
};

const createGenAI = (apiKey: string): GoogleGenAI => new GoogleGenAI({ apiKey });

export const getKeyStatus = () => ({
  total: API_KEYS.length,
  available: API_KEYS.length - failedKeys.size,
  failed: Array.from(failedKeys.keys()).map(i => i + 1)
});

// ==================== MULTI-STEP GENERATION ====================

interface GenerationContext {
  prompt: string;
  language: Language;
  lang: string;
  type: WebsiteType;
  selectedPages: string[];
  includeAdmin: boolean;
  referenceUrl?: string;
}

// Helper: Call Gemini API with retry
async function callGeminiAPI(prompt: string, expectJson = true): Promise<string> {
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const keyInfo = getNextApiKey();
    if (!keyInfo) throw new Error('No API keys available');

    try {
      const genAI = createGenAI(keyInfo.key);
      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.8,
          maxOutputTokens: 32768,
          ...(expectJson && { responseMimeType: 'application/json' })
        }
      });

      const text = response.text || '';
      console.log(`[Gemini] Response length: ${text.length} chars`);
      return text;
    } catch (error: any) {
      lastError = error;
      console.error(`[Gemini] Attempt ${attempt + 1} failed:`, error?.message);
      markKeyAsFailed(keyInfo.index, error);

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('All API retries exhausted');
}

// Parse JSON response
function parseJsonResponse<T>(text: string): T {
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  return JSON.parse(jsonStr.trim());
}

// STEP 1: Generate HTML
async function generateHTML(ctx: GenerationContext): Promise<GeneratedFile> {
  console.log('[Step 1/4] Generating HTML...');

  const prompt = `You are a SENIOR WEB DEVELOPER. Create a COMPLETE, PRODUCTION-READY index.html file.

USER REQUEST: ${ctx.prompt}

REQUIREMENTS:
- ALL text content in ${ctx.lang}
- Modern, responsive design with Tailwind CSS (use CDN: https://cdn.tailwindcss.com)
- AT LEAST 250 lines of HTML
- Include: DOCTYPE, head (meta, OG tags, title), and full body
- Sections: Header/Nav, Hero, Features (6+ items), About, Services, Testimonials (3+), CTA, Contact Form, Footer
- Mobile-responsive navigation
- Real content (not Lorem ipsum)
- Icons using emoji or SVG
- Schema.org JSON-LD
- Link to styles.css and script.js

Return JSON only:
{"path": "index.html", "content": "<!DOCTYPE html>...", "type": "html"}`;

  try {
    const text = await callGeminiAPI(prompt);
    return parseJsonResponse<GeneratedFile>(text);
  } catch (e) {
    console.error('[Step 1] HTML generation failed, using fallback');
    return { path: 'index.html', content: generateFallbackHTML(ctx.prompt, ctx.language), type: 'html' };
  }
}

// STEP 2: Generate CSS
async function generateCSS(ctx: GenerationContext, htmlContent: string): Promise<GeneratedFile> {
  console.log('[Step 2/4] Generating CSS...');

  const prompt = `You are a CSS EXPERT. Create a COMPREHENSIVE styles.css file for this website.

WEBSITE CONTEXT: ${ctx.prompt}

REQUIREMENTS:
- AT LEAST 200 lines of CSS
- CSS custom properties (variables) for colors, fonts
- Modern layout: Flexbox and Grid
- Responsive: mobile, tablet, desktop breakpoints
- Dark mode with prefers-color-scheme
- Smooth transitions and hover effects
- Custom animations: fadeIn, slideUp, pulse
- Typography: line-height, letter-spacing
- Glassmorphism effects
- Custom scrollbar
- Form styling

The HTML uses Tailwind CSS, but add custom styles for:
- Custom components not covered by Tailwind
- Animations
- Color scheme variables
- Dark mode overrides

Return JSON only:
{"path": "styles.css", "content": "/* Full CSS code */", "type": "css"}`;

  try {
    const text = await callGeminiAPI(prompt);
    return parseJsonResponse<GeneratedFile>(text);
  } catch (e) {
    console.error('[Step 2] CSS generation failed, using fallback');
    return { path: 'styles.css', content: generateFallbackCSS(), type: 'css' };
  }
}

// STEP 3: Generate JavaScript
async function generateJS(ctx: GenerationContext): Promise<GeneratedFile> {
  console.log('[Step 3/4] Generating JavaScript...');

  const prompt = `You are a JavaScript EXPERT. Create a COMPREHENSIVE script.js file.

WEBSITE CONTEXT: ${ctx.prompt}

REQUIREMENTS:
- AT LEAST 100 lines of JavaScript
- Mobile menu toggle (hamburger menu)
- Smooth scroll for anchor links
- Scroll spy for navigation
- Form validation
- Intersection Observer for scroll animations
- Sticky header on scroll
- Back to top button
- Modal/popup handling
- Dynamic content interactions
- Lazy loading images

Use modern ES6+ syntax. Add event listeners on DOMContentLoaded.

Return JSON only:
{"path": "script.js", "content": "// Complete JavaScript code", "type": "js"}`;

  try {
    const text = await callGeminiAPI(prompt);
    return parseJsonResponse<GeneratedFile>(text);
  } catch (e) {
    console.error('[Step 3] JS generation failed, using fallback');
    return { path: 'script.js', content: generateFallbackJS(), type: 'js' };
  }
}

// STEP 4: Generate Additional Pages
async function generatePage(pageName: string, ctx: GenerationContext): Promise<GeneratedFile> {
  console.log(`[Step 4] Generating ${pageName}.html...`);

  const prompt = `You are a WEB DEVELOPER. Create a complete ${pageName}.html page.

WEBSITE CONTEXT: ${ctx.prompt}
PAGE: ${pageName}

REQUIREMENTS:
- ALL text in ${ctx.lang}
- AT LEAST 150 lines of HTML
- Use Tailwind CSS CDN
- Include header/nav (same as main site), main content, footer
- Page-specific content for "${pageName}"
- Link to styles.css and script.js
- Responsive design

Return JSON only:
{"path": "${pageName}.html", "content": "<!DOCTYPE html>...", "type": "html"}`;

  try {
    const text = await callGeminiAPI(prompt);
    return parseJsonResponse<GeneratedFile>(text);
  } catch (e) {
    console.error(`[Step 4] ${pageName}.html generation failed`);
    return { path: `${pageName}.html`, content: generateFallbackPage(pageName, ctx), type: 'html' };
  }
}

// Generate SEO data
async function generateSEO(ctx: GenerationContext): Promise<{ title: string; description: string; keywords: string }> {
  const prompt = `Generate SEO metadata for this website: "${ctx.prompt}"
Language: ${ctx.lang}

Return JSON only:
{"title": "60 char title", "description": "160 char description", "keywords": "keyword1, keyword2, keyword3"}`;

  try {
    const text = await callGeminiAPI(prompt);
    return parseJsonResponse<{ title: string; description: string; keywords: string }>(text);
  } catch (e) {
    return {
      title: ctx.prompt.slice(0, 60),
      description: ctx.prompt,
      keywords: 'website, landing page'
    };
  }
}

// ==================== MAIN EXPORT ====================

export async function generateWebsite(
  prompt: string,
  language: Language,
  type: WebsiteType,
  selectedPages: string[],
  includeAdmin: boolean,
  referenceUrl?: string,
  referenceImage?: string | null
): Promise<WebsiteData> {
  const ctx: GenerationContext = {
    prompt,
    language,
    lang: language === 'vi' ? 'Tiếng Việt' : 'English',
    type,
    selectedPages,
    includeAdmin,
    referenceUrl
  };

  console.log('[Gemini] Starting multi-step generation...');
  console.log(`[Gemini] Type: ${type}, Pages: ${selectedPages.join(', ')}`);

  const files: GeneratedFile[] = [];

  // Step 1: HTML
  const htmlFile = await generateHTML(ctx);
  files.push(htmlFile);

  // Step 2: CSS
  const cssFile = await generateCSS(ctx, htmlFile.content);
  files.push(cssFile);

  // Step 3: JavaScript
  const jsFile = await generateJS(ctx);
  files.push(jsFile);

  // Step 4: Additional pages (if multi-page website)
  if (type === 'website' && selectedPages.length > 0) {
    for (const pageName of selectedPages) {
      if (pageName !== 'home') {
        const pageFile = await generatePage(pageName, ctx);
        files.push(pageFile);
      }
    }
  }

  // Step 5: Admin dashboard (if requested)
  if (includeAdmin) {
    const adminFile = await generatePage('admin', ctx);
    files.push(adminFile);
  }

  // Generate SEO
  const seo = await generateSEO(ctx);

  console.log(`[Gemini] Generation complete! ${files.length} files created.`);
  console.log(`[Gemini] Files: ${files.map(f => f.path).join(', ')}`);

  return { files, seo };
}

// ==================== FALLBACKS ====================

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
        <a href="#features" class="hover:text-blue-400 transition">${isVi ? 'Tính năng' : 'Features'}</a>
        <a href="#about" class="hover:text-blue-400 transition">${isVi ? 'Giới thiệu' : 'About'}</a>
        <a href="#contact" class="hover:text-blue-400 transition">${isVi ? 'Liên hệ' : 'Contact'}</a>
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

    <section id="features" class="mb-20">
      <h3 class="text-3xl font-bold text-center mb-12">${isVi ? 'Tính năng nổi bật' : 'Key Features'}</h3>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="p-6 bg-white/5 rounded-2xl border border-white/10">
          <div class="text-4xl mb-4">⚡</div>
          <h4 class="text-xl font-bold mb-2">${isVi ? 'Siêu tốc' : 'Lightning Fast'}</h4>
          <p class="text-slate-400">${isVi ? 'Hiệu suất tối ưu cho trải nghiệm tốt nhất' : 'Optimized performance for the best experience'}</p>
        </div>
        <div class="p-6 bg-white/5 rounded-2xl border border-white/10">
          <div class="text-4xl mb-4">🛡️</div>
          <h4 class="text-xl font-bold mb-2">${isVi ? 'Bảo mật' : 'Secure'}</h4>
          <p class="text-slate-400">${isVi ? 'Bảo vệ dữ liệu của bạn tuyệt đối' : 'Your data is absolutely protected'}</p>
        </div>
        <div class="p-6 bg-white/5 rounded-2xl border border-white/10">
          <div class="text-4xl mb-4">🎨</div>
          <h4 class="text-xl font-bold mb-2">${isVi ? 'Thiết kế đẹp' : 'Beautiful Design'}</h4>
          <p class="text-slate-400">${isVi ? 'Giao diện hiện đại, chuyên nghiệp' : 'Modern, professional interface'}</p>
        </div>
      </div>
    </section>

    <section id="about" class="mb-20 text-center">
      <h3 class="text-3xl font-bold mb-8">${isVi ? 'Về chúng tôi' : 'About Us'}</h3>
      <p class="text-lg text-slate-300 max-w-3xl mx-auto">
        ${isVi ? 'Chúng tôi là đội ngũ chuyên gia với nhiều năm kinh nghiệm trong lĩnh vực công nghệ. Sứ mệnh của chúng tôi là mang đến những giải pháp tốt nhất cho khách hàng.' : 'We are a team of experts with years of experience in the technology field. Our mission is to deliver the best solutions to our customers.'}
      </p>
    </section>

    <section id="contact" class="text-center">
      <h3 class="text-3xl font-bold mb-8">${isVi ? 'Liên hệ' : 'Contact Us'}</h3>
      <form class="max-w-md mx-auto space-y-4">
        <input type="text" placeholder="${isVi ? 'Họ tên' : 'Full Name'}" class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-blue-500 outline-none">
        <input type="email" placeholder="Email" class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-blue-500 outline-none">
        <textarea placeholder="${isVi ? 'Tin nhắn' : 'Message'}" rows="4" class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-blue-500 outline-none"></textarea>
        <button type="submit" class="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition">
          ${isVi ? 'Gửi tin nhắn' : 'Send Message'}
        </button>
      </form>
    </section>
  </main>
  
  <footer class="border-t border-white/10 py-8 text-center text-slate-400 mt-20">
    <p>© 2024 ${prompt.slice(0, 30)}. ${isVi ? 'Tạo bởi DMP AI' : 'Created by DMP AI'}</p>
  </footer>
  <script src="script.js"></script>
</body>
</html>`;
}

function generateFallbackCSS(): string {
  return `/* DMP AI Generated Styles */
:root {
  --color-primary: #3b82f6;
  --color-primary-dark: #2563eb;
  --color-secondary: #8b5cf6;
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f8fafc;
  --color-text-muted: #94a3b8;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-background);
  color: var(--color-text);
  line-height: 1.6;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-fadeIn {
  animation: fadeIn 0.6s ease-out;
}

.animate-slideUp {
  animation: slideUp 0.8s ease-out;
}

/* Glass effect */
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-surface);
}

::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 4px;
}

/* Responsive */
@media (max-width: 768px) {
  nav .flex.gap-6 {
    display: none;
  }
}`;
}

function generateFallbackJS(): string {
  return `// DMP AI Generated JavaScript
document.addEventListener('DOMContentLoaded', function() {
  console.log('Website initialized');

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Form validation
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const inputs = form.querySelectorAll('input, textarea');
      let isValid = true;
      
      inputs.forEach(input => {
        if (!input.value.trim()) {
          input.style.borderColor = '#ef4444';
          isValid = false;
        } else {
          input.style.borderColor = '';
        }
      });

      if (isValid) {
        alert('Form submitted successfully!');
        form.reset();
      }
    });
  }

  // Scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'all 0.6s ease-out';
    observer.observe(section);
  });

  // Mobile menu (if exists)
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});`;
}

function generateFallbackPage(pageName: string, ctx: GenerationContext): string {
  const isVi = ctx.language === 'vi';
  const titles: Record<string, { vi: string; en: string }> = {
    about: { vi: 'Giới thiệu', en: 'About Us' },
    services: { vi: 'Dịch vụ', en: 'Services' },
    products: { vi: 'Sản phẩm', en: 'Products' },
    contact: { vi: 'Liên hệ', en: 'Contact' },
    blog: { vi: 'Tin tức', en: 'Blog' },
    admin: { vi: 'Quản trị', en: 'Admin' }
  };

  const title = titles[pageName]?.[ctx.language] || pageName;

  return `<!DOCTYPE html>
<html lang="${ctx.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${ctx.prompt.slice(0, 30)}</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
  <header class="py-6 px-8 border-b border-white/10">
    <nav class="max-w-6xl mx-auto flex justify-between items-center">
      <a href="index.html" class="text-2xl font-bold">${ctx.prompt.slice(0, 20)}</a>
      <a href="index.html" class="text-blue-400 hover:text-white transition">${isVi ? '← Trang chủ' : '← Home'}</a>
    </nav>
  </header>
  
  <main class="max-w-6xl mx-auto px-8 py-20">
    <h1 class="text-4xl font-bold mb-8">${title}</h1>
    <div class="prose prose-invert max-w-none">
      <p class="text-xl text-slate-300">
        ${isVi ? `Đây là trang ${title.toLowerCase()}. Nội dung sẽ được cập nhật.` : `This is the ${pageName} page. Content will be updated.`}
      </p>
    </div>
  </main>
  
  <footer class="border-t border-white/10 py-8 text-center text-slate-400 mt-20">
    <p>© 2024 ${ctx.prompt.slice(0, 30)}</p>
  </footer>
  <script src="script.js"></script>
</body>
</html>`;
}
