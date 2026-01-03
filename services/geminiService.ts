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
  selectedOptions: string[];
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
        model: 'gemini-2.5-flash',  // Upgraded from 2.0-flash for better quality
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.9,  // Higher temperature for more creative output
          maxOutputTokens: 65536,  // Maximum output
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

// STEP 1: Generate HTML - Uses user input DEEPLY
async function generateHTML(ctx: GenerationContext): Promise<GeneratedFile> {
  console.log('[Step 1/4] Generating HTML...');
  console.log(`[Step 1] User Input: "${ctx.prompt.substring(0, 100)}..."`);

  const prompt = `Bạn là một SENIOR FULL-STACK WEB DEVELOPER với 15+ năm kinh nghiệm.

=== YÊU CẦU TỪ KHÁCH HÀNG ===
"${ctx.prompt}"

=== PHÂN TÍCH YÊU CẦU ===
Dựa trên yêu cầu trên, hãy:
1. Xác định LOẠI HÌNH WEBSITE (dịch vụ, sản phẩm, portfolio, doanh nghiệp...)
2. Xác định ĐỐI TƯỢNG KHÁCH HÀNG MỤC TIÊU
3. Xác định TONE & MOOD phù hợp (chuyên nghiệp, thân thiện, sang trọng, trẻ trung...)
4. Xác định MÀU SẮC CHỦ ĐẠO phù hợp với ngành

=== TÍNH NĂNG BỔ SUNG YÊU CẦU ===
${ctx.selectedOptions.length > 0 ? ctx.selectedOptions.map(opt => {
    const optionDescriptions: Record<string, string> = {
      chatbot: '🤖 CHATBOT: Thêm widget chatbot AI ở góc phải màn hình với nút mở/đóng',
      newsletter: '📰 NEWSLETTER: Thêm section form đăng ký nhận tin (email input + submit button)',
      partners: '🤝 PARTNERS: Thêm section logo đối tác/khách hàng (6-8 logos)',
      map: '📍 MAP: Thêm Google Maps iframe trong phần liên hệ',
      videoHero: '🎬 VIDEO HERO: Hero section có video background thay vì ảnh',
      stats: '📊 STATS: Thêm section số liệu thống kê với animation counter (4 items)',
      awards: '🏆 AWARDS: Thêm section chứng chỉ/giải thưởng',
      promoPopup: '🎉 POPUP: Thêm promotion popup hiển thị khi load trang',
      appDownload: '📱 APP CTA: Thêm section download app với App Store/Play Store buttons',
      liveChat: '💬 LIVE CHAT: Thêm widget live chat ở góc màn hình',
      multiLang: '🌐 MULTI-LANG: Thêm language switcher trong header',
      rating: '⭐ RATING: Thêm star rating component trong testimonials'
    };
    return '- ' + (optionDescriptions[opt] || opt);
  }).join('\n') : 'Không có tính năng bổ sung'}

=== TẠO index.html HOÀN CHỈNH ===

NGÔN NGỮ: Toàn bộ nội dung phải bằng ${ctx.lang}

YÊU CẦU BẮT BUỘC:
1. TIÊU ĐỀ & NỘI DUNG phải LIÊN QUAN TRỰC TIẾP đến: "${ctx.prompt}"
2. KHÔNG dùng Lorem ipsum - tạo nội dung THỰC, CỤ THỂ cho "${ctx.prompt}"
3. Minimum 300+ dòng HTML
4. Tailwind CSS CDN: https://cdn.tailwindcss.com

CẤU TRÚC BẮT BUỘC:
- Header: Logo với tên từ "${ctx.prompt}", navigation 5+ links
- Hero Section: Headline mạnh mẽ về "${ctx.prompt}", subheadline, 2 CTAs
- Features: 6 tính năng/lợi ích CỤ THỂ của "${ctx.prompt}"
- About: Câu chuyện, sứ mệnh liên quan đến "${ctx.prompt}"
- Services/Products: 4+ dịch vụ/sản phẩm từ "${ctx.prompt}"
- Testimonials: 3 đánh giá của khách hàng (tên, chức vụ, nội dung)
- Stats: 4 con số ấn tượng (ví dụ: 500+ khách hàng, 10 năm kinh nghiệm...)
- CTA Section: Kêu gọi hành động mạnh mẽ
- Contact: Form liên hệ đầy đủ (họ tên, email, điện thoại, tin nhắn)
- Footer: Links, thông tin liên hệ, social icons, copyright

KỸ THUẬT:
- Mobile-first responsive design
- Semantic HTML5 (header, nav, main, section, article, footer)
- Meta tags: description, keywords, OG tags
- Schema.org JSON-LD LocalBusiness
- Link đến styles.css và script.js
- ARIA labels cho accessibility
- Lazy loading images

MÀU SẮC:
- Chọn palette phù hợp với "${ctx.prompt}"
- Gradient backgrounds
- Consistent color scheme

Return JSON format (KHÔNG markdown):
{"path": "index.html", "content": "<!DOCTYPE html>...<COMPLETE 300+ LINES>...", "type": "html"}`;

  try {
    const text = await callGeminiAPI(prompt);
    const result = parseJsonResponse<GeneratedFile>(text);

    // Validate output quality
    const lineCount = result.content.split('\n').length;
    const charCount = result.content.length;
    console.log(`[Step 1] Generated HTML: ${lineCount} lines, ${charCount} chars`);

    if (charCount < 5000) {
      console.warn('[Step 1] HTML too short, regenerating with stricter prompt...');
      const stricterPrompt = prompt + `\n\nCRITICAL: Your previous output was TOO SHORT (${charCount} chars). Generate AT LEAST 10,000 characters of complete HTML code.`;
      const text2 = await callGeminiAPI(stricterPrompt);
      return parseJsonResponse<GeneratedFile>(text2);
    }

    return result;
  } catch (e) {
    console.error('[Step 1] HTML generation failed, using fallback');
    return { path: 'index.html', content: generateFallbackHTML(ctx.prompt, ctx.language), type: 'html' };
  }
}

// STEP 2: Generate CSS - Context-aware styling
async function generateCSS(ctx: GenerationContext, htmlContent: string): Promise<GeneratedFile> {
  console.log('[Step 2/4] Generating CSS...');
  console.log(`[Step 2] Context: "${ctx.prompt.substring(0, 50)}..."`);

  const prompt = `Bạn là CSS/UI DESIGN EXPERT. Tạo file styles.css HOÀN CHỈNH cho website.

=== CONTEXT WEBSITE ===
"${ctx.prompt}"

=== PHÂN TÍCH THƯƠNG HIỆU ===
Dựa trên "${ctx.prompt}", hãy:
1. Xác định BẢNG MÀU phù hợp (primary, secondary, accent)
2. Xác định FONT phù hợp (sans-serif chuyên nghiệp hay serif sang trọng)
3. Xác định STYLE (minimal, luxury, playful, corporate...)

=== YÊU CẦU BẮT BUỘC ===
Tạo CSS với TỐI THIỂU 250+ dòng code:

1. CSS VARIABLES (30+ variables):
   - Màu sắc: --color-primary, --color-secondary, --color-accent, --color-bg, --color-text
   - Typography: --font-primary, --font-secondary
   - Spacing: --spacing-xs đến --spacing-3xl
   - Border radius, shadows, transitions

2. RESET & BASE (20+ dòng):
   - Box-sizing, margin, padding reset
   - Smooth scroll, font rendering

3. TYPOGRAPHY (30+ dòng):
   - Headings h1-h6 với scale đẹp
   - Body text, links, lists
   - Line-height, letter-spacing

4. COMPONENTS (80+ dòng):
   - Buttons: primary, secondary, outline, ghost
   - Cards với hover effects
   - Forms: inputs, textareas, selects
   - Navigation styles
   - Badges, tags

5. LAYOUT (30+ dòng):
   - Container, grid, flex utilities
   - Section spacing

6. ANIMATIONS (40+ dòng):
   - @keyframes fadeIn, slideUp, slideDown, scaleIn, pulse
   - .animate-* utility classes
   - Transition timing functions

7. RESPONSIVE (30+ dòng):
   - Mobile first approach
   - @media queries: 640px, 768px, 1024px, 1280px

8. DARK MODE (20+ dòng):
   - @media (prefers-color-scheme: dark)
   - Inverted colors

9. SPECIAL EFFECTS:
   - Glassmorphism: backdrop-filter blur
   - Gradients phù hợp với "${ctx.prompt}"
   - Custom scrollbar
   - Selection color

Return JSON (KHÔNG markdown):
{"path": "styles.css", "content": "/* Complete CSS - 250+ lines */...", "type": "css"}`;

  try {
    const text = await callGeminiAPI(prompt);
    const result = parseJsonResponse<GeneratedFile>(text);

    const lineCount = result.content.split('\n').length;
    const charCount = result.content.length;
    console.log(`[Step 2] Generated CSS: ${lineCount} lines, ${charCount} chars`);

    if (charCount < 3000) {
      console.warn('[Step 2] CSS too short, regenerating...');
      const stricterPrompt = prompt + `\n\nCRITICAL: Generate AT LEAST 5,000 characters of CSS code. Previous output was only ${charCount} chars.`;
      const text2 = await callGeminiAPI(stricterPrompt);
      return parseJsonResponse<GeneratedFile>(text2);
    }

    return result;
  } catch (e) {
    console.error('[Step 2] CSS generation failed, using fallback');
    return { path: 'styles.css', content: generateFallbackCSS(), type: 'css' };
  }
}

// STEP 3: Generate JavaScript - Feature-rich interactions
async function generateJS(ctx: GenerationContext): Promise<GeneratedFile> {
  console.log('[Step 3/4] Generating JavaScript...');
  console.log(`[Step 3] Context: "${ctx.prompt.substring(0, 50)}..."`);

  const prompt = `Bạn là JAVASCRIPT EXPERT. Tạo file script.js HOÀN CHỈNH cho website.

=== CONTEXT WEBSITE ===
"${ctx.prompt}"

=== YÊU CẦU BẮT BUỘC ===
Tạo JavaScript với TỐI THIỂU 200+ dòng code, đầy đủ chức năng:

1. MOBILE NAVIGATION (30+ dòng):
   - Toggle hamburger menu
   - Close menu khi click outside
   - Close menu khi click link
   - Body scroll lock khi menu open

2. SMOOTH SCROLL (20+ dòng):
   - Smooth scroll cho tất cả anchor links
   - Offset cho fixed header
   - Active state cho navigation

3. SCROLL EFFECTS (40+ dòng):
   - Sticky header với background change
   - Scroll spy để highlight active menu
   - Back to top button (show/hide)
   - Progress bar (optional)

4. SCROLL ANIMATIONS (40+ dòng):
   - IntersectionObserver cho animate-on-scroll
   - Fade in, slide up animations
   - Stagger animations cho list items
   - Lazy load images

5. FORM HANDLING (40+ dòng):
   - Validation cho contact form
   - Email format check
   - Phone format check
   - Required field check
   - Error message display
   - Success message
   - Form reset sau submit

6. UI INTERACTIONS (30+ dòng):
   - Accordion/FAQ toggle
   - Tab switching
   - Modal open/close
   - Tooltip hover
   - Counter animation cho stats

7. UTILITY FUNCTIONS:
   - Debounce/throttle
   - Get viewport height
   - Check mobile device

=== KỸ THUẬT ===
- Modern ES6+ syntax
- Event delegation khi cần
- DOMContentLoaded wrapper
- Error handling
- Console logs cho debugging

Return JSON (KHÔNG markdown):
{"path": "script.js", "content": "// Complete JavaScript - 200+ lines...", "type": "js"}`;

  try {
    const text = await callGeminiAPI(prompt);
    const result = parseJsonResponse<GeneratedFile>(text);

    const lineCount = result.content.split('\n').length;
    const charCount = result.content.length;
    console.log(`[Step 3] Generated JS: ${lineCount} lines, ${charCount} chars`);

    if (charCount < 2000) {
      console.warn('[Step 3] JS too short, regenerating...');
      const stricterPrompt = prompt + `\n\nCRITICAL: Generate AT LEAST 4,000 characters of JavaScript code. Previous output was only ${charCount} chars.`;
      const text2 = await callGeminiAPI(stricterPrompt);
      return parseJsonResponse<GeneratedFile>(text2);
    }

    return result;
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
  selectedOptions: string[],
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
    selectedOptions,
    includeAdmin,
    referenceUrl
  };

  console.log('[Gemini] Starting multi-step generation...');
  console.log(`[Gemini] Type: ${type}, Pages: ${selectedPages.join(', ')}, Options: ${selectedOptions.join(', ')}`);

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
