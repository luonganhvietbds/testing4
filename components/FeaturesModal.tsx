import React from 'react';
import { Language } from '../types';

interface FeaturesModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
}

export const FeaturesModal: React.FC<FeaturesModalProps> = ({ isOpen, onClose, language }) => {
    if (!isOpen) return null;

    const content = {
        vi: {
            title: 'Tính năng nổi bật',
            features: [
                { icon: '🤖', title: 'AI Gemini Pro', desc: 'Sử dụng AI tiên tiến nhất của Google' },
                { icon: '⚡', title: 'Siêu tốc', desc: 'Tạo website hoàn chỉnh trong vài giây' },
                { icon: '🎨', title: 'Thiết kế Modern', desc: 'UI/UX hiện đại, đẹp mắt, responsive' },
                { icon: '📱', title: 'Responsive', desc: 'Tương thích mọi thiết bị' },
                { icon: '🔍', title: 'SEO Ready', desc: 'Tối ưu SEO ngay từ đầu' },
                { icon: '📊', title: 'Admin Dashboard', desc: 'Tùy chọn kèm trang quản trị' },
                { icon: '🌍', title: 'Đa ngôn ngữ', desc: 'Hỗ trợ Tiếng Việt & English' },
                { icon: '📷', title: 'Học từ hình ảnh', desc: 'AI phân tích ảnh mẫu để tạo thiết kế' }
            ],
            close: 'Đóng'
        },
        en: {
            title: 'Key Features',
            features: [
                { icon: '🤖', title: 'AI Gemini Pro', desc: 'Using Google\'s most advanced AI' },
                { icon: '⚡', title: 'Super Fast', desc: 'Create complete website in seconds' },
                { icon: '🎨', title: 'Modern Design', desc: 'Beautiful, modern, responsive UI/UX' },
                { icon: '📱', title: 'Responsive', desc: 'Compatible with all devices' },
                { icon: '🔍', title: 'SEO Ready', desc: 'SEO optimized from the start' },
                { icon: '📊', title: 'Admin Dashboard', desc: 'Optional admin panel included' },
                { icon: '🌍', title: 'Multilingual', desc: 'Vietnamese & English supported' },
                { icon: '📷', title: 'Image Learning', desc: 'AI analyzes reference images for design' }
            ],
            close: 'Close'
        }
    };

    const t = content[language];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 animate-scale-up border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {t.features.map((feature, index) => (
                            <div key={index} className="flex items-start space-x-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
                                <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{feature.title}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        {t.close}
                    </button>
                </div>
            </div>
        </div>
    );
};
