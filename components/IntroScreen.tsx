import React from 'react';
import { Language } from '../types';

interface IntroScreenProps {
    onStart: () => void;
    language: Language;
    onLanguageChange: (lang: Language) => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart, language, onLanguageChange }) => {
    const content = {
        vi: {
            welcome: 'Chào mừng đến với',
            title: 'DMP AI Website Builder',
            subtitle: 'Công cụ AI tạo website chuyên nghiệp chỉ từ một câu mô tả',
            feature1: 'Tạo Landing Page & Website đa trang',
            feature2: 'Thiết kế UI/UX hiện đại, SEO Ready',
            feature3: 'Hỗ trợ tải lên ảnh mẫu để AI học',
            start: 'Bắt đầu ngay',
            powered: 'Powered by Google Gemini AI'
        },
        en: {
            welcome: 'Welcome to',
            title: 'DMP AI Website Builder',
            subtitle: 'AI tool to create professional websites from a single description',
            feature1: 'Create Landing Pages & Multi-page Websites',
            feature2: 'Modern UI/UX design, SEO Ready',
            feature3: 'Upload reference images for AI learning',
            start: 'Get Started',
            powered: 'Powered by Google Gemini AI'
        }
    };

    const t = content[language];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>

            {/* Language Toggle - Top Right */}
            <div className="absolute top-6 right-6 flex bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
                <button
                    onClick={() => onLanguageChange('vi')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${language === 'vi'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-white/70 hover:text-white'
                        }`}
                >
                    VI
                </button>
                <button
                    onClick={() => onLanguageChange('en')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${language === 'en'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-white/70 hover:text-white'
                        }`}
                >
                    EN
                </button>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center max-w-2xl mx-auto animate-fade-in">
                {/* Logo */}
                <div className="mb-8">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <p className="text-blue-400 text-sm font-medium mb-2">{t.welcome}</p>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        {t.title}
                    </h1>
                    <p className="text-lg text-slate-300 max-w-lg mx-auto">
                        {t.subtitle}
                    </p>
                </div>

                {/* Features */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-10">
                    {[t.feature1, t.feature2, t.feature3].map((feature, i) => (
                        <div key={i} className="flex items-center space-x-2 text-sm text-slate-400">
                            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>

                {/* CTA Button */}
                <button
                    onClick={onStart}
                    className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                >
                    <span className="flex items-center space-x-2">
                        <span>{t.start}</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </span>
                </button>

                {/* Footer */}
                <p className="mt-12 text-xs text-slate-500">
                    {t.powered}
                </p>
            </div>
        </div>
    );
};
