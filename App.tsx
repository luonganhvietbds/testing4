
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Terminal } from './components/Terminal';
import { DonationModal } from './components/DonationModal';
import { GuideModal } from './components/GuideModal';
import { FeaturesModal } from './components/FeaturesModal';
import { IntroScreen } from './components/IntroScreen';
import { AppState } from './types';
import { TRANSLATIONS, PAGE_OPTIONS } from './constants';
import { generateWebsite } from './services/geminiService';
// @ts-ignore
import JSZip from 'jszip';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [state, setState] = useState<AppState>({
    prompt: '',
    language: 'vi',
    type: 'landing',
    selectedPages: ['home'],
    includeAdmin: false,
    referenceUrl: '',
    referenceImage: null,
    isGenerating: false,
    terminalLogs: [],
    websiteData: null,
    activeView: 'editor'
  });

  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const t = TRANSLATIONS[state.language];

  const addLog = useCallback((msg: string) => {
    setState(prev => ({
      ...prev,
      terminalLogs: [...prev.terminalLogs, msg]
    }));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(state.language === 'vi' ? 'Kích thước ảnh quá lớn (Tối đa 5MB)' : 'Image size too large (Max 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(s => ({ ...s, referenceImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setState(s => ({ ...s, referenceImage: null }));
  };

  const handleGenerate = async () => {
    if (!state.prompt.trim()) return;

    setState(prev => ({
      ...prev,
      isGenerating: true,
      terminalLogs: [],
      websiteData: null
    }));

    addLog(t.terminal_analyzing);
    
    try {
      await new Promise(r => setTimeout(r, 800));
      
      if (state.referenceUrl) {
        addLog(`Analyzing reference style: ${state.referenceUrl}...`);
        await new Promise(r => setTimeout(r, 800));
      }

      if (state.referenceImage) {
        addLog(state.language === 'vi' ? 'Đang phân tích hình ảnh mẫu...' : 'Analyzing reference image...');
        await new Promise(r => setTimeout(r, 1000));
      }

      addLog(t.terminal_detecting);
      
      await new Promise(r => setTimeout(r, 1200));
      addLog(t.terminal_content);
      
      const data = await generateWebsite(
        state.prompt,
        state.language,
        state.type,
        state.selectedPages,
        state.includeAdmin,
        state.referenceUrl,
        state.referenceImage
      );
      
      addLog(t.terminal_design);
      await new Promise(r => setTimeout(r, 1000));
      
      addLog(t.terminal_seo);
      await new Promise(r => setTimeout(r, 800));
      
      addLog(t.terminal_exporting);
      await new Promise(r => setTimeout(r, 1500));
      
      addLog(`✓ Website generated successfully: ${data.seo.title}`);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        websiteData: data,
        activeView: 'preview'
      }));
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const downloadZip = async () => {
    if (!state.websiteData) return;
    
    try {
      const zip = new JSZip();
      
      state.websiteData.files.forEach(file => {
        // Normalize path, remove leading slash or ./
        let cleanPath = file.path;
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
        if (cleanPath.startsWith('./')) cleanPath = cleanPath.slice(2);
        
        zip.file(cleanPath, file.content);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Sanitize filename
      const filename = (state.websiteData.seo.title || 'website')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      a.download = `${filename}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (state.language === 'vi') {
        alert('Đã tải xuống toàn bộ mã nguồn website.');
      } else {
        alert('Full website source code downloaded successfully.');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating zip file.');
    }
  };

  const renderPreview = () => {
    if (!state.websiteData) return null;
    const indexFile = state.websiteData.files.find(f => f.path.endsWith('index.html')) || 
                      state.websiteData.files.find(f => f.type === 'html');
    
    if (!indexFile) return <div className="p-8 text-center text-red-500">No entry file found</div>;

    let fullHtml = indexFile.content;
    const cssFiles = state.websiteData.files.filter(f => f.type === 'css');
    const jsFiles = state.websiteData.files.filter(f => f.type === 'js');

    cssFiles.forEach(file => {
       fullHtml = fullHtml.replace('</head>', `<style>/* ${file.path} */\n${file.content}</style></head>`);
    });

    jsFiles.forEach(file => {
       fullHtml = fullHtml.replace('</body>', `<script>/* ${file.path} */\n${file.content}</script></body>`);
    });

    return (
      <div className="w-full bg-white rounded-xl shadow-2xl overflow-hidden min-h-[400px] md:min-h-[600px] border border-slate-300 dark:border-slate-700 flex flex-col">
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500 hover:bg-red-500 transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500 hover:bg-yellow-500 transition-colors"></div>
            <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500 hover:bg-green-500 transition-colors"></div>
          </div>
          <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-1 rounded text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 truncate max-w-[150px] md:max-w-xs shadow-sm mx-2">
            {state.websiteData.seo.title}
          </div>
          <div className="w-12"></div>
        </div>
        <iframe 
          title="Website Preview"
          srcDoc={fullHtml}
          className="w-full flex-grow bg-white min-h-[400px] md:min-h-[550px]"
          sandbox="allow-scripts"
        />
      </div>
    );
  };

  const renderCode = () => {
    if (!state.websiteData) return null;
    return (
      <div className="w-full space-y-4">
        {state.websiteData.files.map((file, idx) => (
          <div key={idx} className="rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 shadow-lg">
            <div className="bg-slate-900 px-4 py-2.5 text-xs text-slate-300 font-mono flex justify-between items-center border-b border-slate-800">
              <span className="font-semibold text-slate-200 truncate mr-2">{file.path}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(file.content)}
                className="text-blue-400 hover:text-white hover:bg-blue-600 transition-colors bg-slate-800 px-3 py-1.5 rounded font-medium flex-shrink-0"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs text-green-400 font-mono max-h-96 leading-relaxed custom-scrollbar">
              <code>{file.content}</code>
            </pre>
          </div>
        ))}
      </div>
    );
  };

  if (showIntro) {
    return (
      <IntroScreen 
        onStart={() => setShowIntro(false)} 
        language={state.language}
        onLanguageChange={(lang) => setState(s => ({ ...s, language: lang }))}
      />
    );
  }

  return (
    <div className="min-h-screen transition-colors bg-slate-50 dark:bg-slate-950 pb-20 selection:bg-indigo-200 selection:text-indigo-900 animate-fade-in">
      <Header 
        language={state.language} 
        onLanguageChange={(lang) => setState(s => ({ ...s, language: lang }))}
        onOpenDonate={() => setIsDonateOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenFeatures={() => setIsFeaturesOpen(true)}
      />

      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-12">
        {/* Hero Section */}
        <div className="text-center mb-10 md:mb-16 space-y-4 md:space-y-5">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm px-2">
            {t.title}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-700 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium px-4">
            {t.subtitle}
          </p>
        </div>

        {/* Action Panel */}
        <div className="glass rounded-2xl md:rounded-[2rem] p-4 md:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 md:w-64 h-40 md:h-64 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 md:w-64 h-40 md:h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 relative z-10">
            {/* Left: Settings */}
            <div className="space-y-6 md:space-y-8">
              {/* Type Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">{t.landingLabel.split('(')[0]}</label>
                <div className="flex flex-col space-y-3">
                  <button 
                    role="radio"
                    aria-checked={state.type === 'landing'}
                    onClick={() => setState(s => ({ ...s, type: 'landing' }))}
                    className={`group flex items-center p-3 md:p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${state.type === 'landing' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-[2.5px] flex items-center justify-center mr-3 transition-colors ${state.type === 'landing' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-500 group-hover:border-blue-500'}`}>
                      {state.type === 'landing' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm font-bold ${state.type === 'landing' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>{t.landingLabel}</span>
                  </button>
                  <button 
                    role="radio"
                    aria-checked={state.type === 'website'}
                    onClick={() => setState(s => ({ ...s, type: 'website' }))}
                    className={`group flex items-center p-3 md:p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${state.type === 'website' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-[2.5px] flex items-center justify-center mr-3 transition-colors ${state.type === 'website' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-500 group-hover:border-blue-500'}`}>
                      {state.type === 'website' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm font-bold ${state.type === 'website' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>{t.websiteLabel}</span>
                  </button>
                </div>
              </div>

              {/* Admin Toggle */}
              <div className="space-y-3">
                 <label className="group flex items-center space-x-3 cursor-pointer p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 transition-all focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
                    <div className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={state.includeAdmin}
                        onChange={(e) => setState(s => ({ ...s, includeAdmin: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 shadow-inner"></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 select-none group-hover:text-blue-600 transition-colors">{t.adminLabel}</span>
                 </label>
              </div>

              {state.type === 'website' && (
                <div className="space-y-3 animate-slide-down">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">{t.selectPages}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAGE_OPTIONS.map(page => (
                      <button 
                        key={page.id}
                        aria-pressed={state.selectedPages.includes(page.id)}
                        onClick={() => {
                          const current = state.selectedPages;
                          if (current.includes(page.id)) {
                            setState(s => ({ ...s, selectedPages: current.filter(p => p !== page.id) }));
                          } else {
                            setState(s => ({ ...s, selectedPages: [...current, page.id] }));
                          }
                        }}
                        className={`group flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${state.selectedPages.includes(page.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600'}`}
                      >
                        {state.selectedPages.includes(page.id) ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 group-hover:border-indigo-400" />
                        )}
                        <span>{t[page.labelKey]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Middle & Right: Input */}
            <div className="md:col-span-2 space-y-6 md:space-y-8">
              
               {/* Reference Section (URL + Image) */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* URL Input */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                      {t.referenceUrlLabel.split('(')[0]} <span className="text-slate-500 font-normal lowercase">(Optional)</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={state.referenceUrl}
                        onChange={(e) => setState(s => ({ ...s, referenceUrl: e.target.value }))}
                        placeholder={t.referenceUrlPlaceholder}
                        className="w-full pl-12 p-3 md:p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-800 dark:text-slate-200 shadow-sm text-sm placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  
                  {/* Image Upload */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                      {t.referenceImageLabel.split('(')[0]} <span className="text-slate-500 font-normal lowercase">(Optional)</span>
                    </label>
                    {!state.referenceImage ? (
                      <label className="flex flex-col items-center justify-center w-full h-[54px] md:h-[58px] border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-400 transition-all overflow-hidden relative group">
                        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 px-4 text-center">
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          <span className="text-xs font-bold truncate">{t.referenceImagePlaceholder}</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    ) : (
                      <div className="relative w-full h-[54px] md:h-[58px] rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden group bg-white dark:bg-slate-900 flex items-center px-2">
                        <img src={state.referenceImage} alt="Reference" className="h-9 w-9 md:h-10 md:w-10 object-cover rounded-lg mr-3 shadow-sm border border-slate-200" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate flex-1">Image selected</span>
                        <button 
                          onClick={removeImage}
                          className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title={t.removeImage}
                        >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
               </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Describe your vision</label>
                <textarea 
                  value={state.prompt}
                  onChange={(e) => setState(s => ({ ...s, prompt: e.target.value }))}
                  placeholder={t.promptPlaceholder}
                  className="w-full h-32 md:h-40 p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none text-base md:text-lg leading-relaxed placeholder:text-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
                ></textarea>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={state.isGenerating || !state.prompt.trim()}
                className={`w-full py-3 md:py-4 rounded-2xl font-bold text-base md:text-lg flex items-center justify-center transition-all duration-300 ${state.isGenerating || !state.prompt.trim() ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30'}`}
              >
                {state.isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 md:h-6 md:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 md:w-6 md:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    {t.generateBtn}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Terminal Section */}
        {(state.terminalLogs.length > 0 || state.isGenerating) && (
          <Terminal logs={state.terminalLogs} />
        )}

        {/* Output Section */}
        {state.websiteData && !state.isGenerating && (
          <div className="mt-12 md:mt-16 space-y-6 md:space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
              <div className="flex bg-slate-200 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 w-full md:w-auto">
                <button 
                  onClick={() => setState(s => ({ ...s, activeView: 'preview' }))}
                  className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${state.activeView === 'preview' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-700 dark:text-white ring-1 ring-black/5' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  {t.preview}
                </button>
                <button 
                  onClick={() => setState(s => ({ ...s, activeView: 'code' }))}
                  className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${state.activeView === 'code' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-700 dark:text-white ring-1 ring-black/5' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  {t.code}
                </button>
              </div>

              <div className="flex space-x-3 w-full md:w-auto">
                <button 
                  onClick={downloadZip}
                  className="flex-1 md:flex-none flex justify-center items-center px-6 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  {t.download}
                </button>
                <button 
                  className="flex-1 md:flex-none flex justify-center items-center px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-white/90 transition-all shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  onClick={() => alert('To deploy: 1. Download source. 2. Install Vercel CLI. 3. Run "vercel" in the folder.')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  {t.deploy}
                </button>
              </div>
            </div>

            <div className="relative">
              {state.activeView === 'preview' ? renderPreview() : renderCode()}
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-16 md:mt-24 border-t border-slate-200 dark:border-slate-800 py-8 md:py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-slate-600 dark:text-slate-400 text-xs md:text-sm font-medium gap-4 md:gap-0">
          <div className="text-center md:text-left">
            <span className="font-bold text-slate-800 dark:text-slate-200">DMP AI Developer</span> — {state.language === 'vi' ? 'Sản phẩm bởi chuyên gia Frontend & AI' : 'Powered by Frontend & AI Experts'}
          </div>
          <div className="flex space-x-6">
            <a href="mailto:dmpaidev@gmail.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</a>
            <a href="https://zalo.me/g/kodwgn037" target="_blank" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Zalo Community</a>
            <span>+84 766771509</span>
          </div>
        </div>
      </footer>

      <DonationModal 
        isOpen={isDonateOpen} 
        onClose={() => setIsDonateOpen(false)} 
        language={state.language} 
      />
      
      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        language={state.language}
      />
      
      <FeaturesModal
        isOpen={isFeaturesOpen}
        onClose={() => setIsFeaturesOpen(false)}
        language={state.language}
      />

      <style>{`
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-scale-up { animation: scale-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        .animate-blink { animation: blink 1s step-end infinite; }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
};

export default App;
