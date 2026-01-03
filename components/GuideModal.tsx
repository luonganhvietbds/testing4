import React from 'react';
import { Language } from '../types';

interface GuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, language }) => {
    if (!isOpen) return null;

    const content = {
        vi: {
            title: 'Hướng dẫn sử dụng',
            steps: [
                { icon: '1️⃣', title: 'Chọn loại website', desc: 'Landing Page (đơn trang) hoặc Website (đa trang)' },
                { icon: '2️⃣', title: 'Mô tả chi tiết', desc: 'Nhập prompt mô tả về website bạn muốn tạo' },
                { icon: '3️⃣', title: 'Thêm tham khảo (tuỳ chọn)', desc: 'Dán link hoặc upload ảnh mẫu để AI học phong cách' },
                { icon: '4️⃣', title: 'Nhấn tạo', desc: 'Chờ AI sinh code và xem kết quả' },
                { icon: '5️⃣', title: 'Tải về & Triển khai', desc: 'Download source code hoặc deploy trực tiếp' }
            ],
            tips: 'Mẹo: Mô tả càng chi tiết, kết quả càng chính xác!',
            close: 'Đã hiểu'
        },
        en: {
            title: 'How to Use',
            steps: [
                { icon: '1️⃣', title: 'Choose website type', desc: 'Landing Page (single) or Website (multi-page)' },
                { icon: '2️⃣', title: 'Describe in detail', desc: 'Enter a prompt describing your desired website' },
                { icon: '3️⃣', title: 'Add reference (optional)', desc: 'Paste URL or upload image for AI to learn style' },
                { icon: '4️⃣', title: 'Click generate', desc: 'Wait for AI to generate code and view results' },
                { icon: '5️⃣', title: 'Download & Deploy', desc: 'Download source code or deploy directly' }
            ],
            tips: 'Tip: The more detailed your description, the more accurate the result!',
            close: 'Got it'
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
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-8 animate-scale-up border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
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
                        <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h2>
                    </div>

                    <div className="space-y-4">
                        {t.steps.map((step, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-2xl">{step.icon}</span>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{step.title}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">💡 {t.tips}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        {t.close}
                    </button>
                </div>
            </div>
        </div>
    );
};
