import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenDonate: () => void;
  onOpenGuide: () => void;
  onOpenFeatures: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onOpenDonate,
  onOpenGuide,
  onOpenFeatures
}) => {
  const t = TRANSLATIONS[language];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            DMP AI
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-2 md:space-x-4">
          <button
            onClick={onOpenFeatures}
            className="hidden sm:flex items-center px-3 py-2 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {t.features}
          </button>
          <button
            onClick={onOpenGuide}
            className="hidden sm:flex items-center px-3 py-2 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {t.guide}
          </button>
          <button
            onClick={onOpenDonate}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            {t.donate}
          </button>
          
          {/* Language Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onLanguageChange('vi')}
              className={`px-2 md:px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                language === 'vi'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              VI
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 md:px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                language === 'en'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
