import React from 'react';
import { Language } from '../types';

interface DonationModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose, language }) => {
    if (!isOpen) return null;

    const content = {
        vi: {
            title: 'Ủng hộ DMP AI',
            subtitle: 'Cảm ơn bạn muốn ủng hộ dự án! Mọi đóng góp đều giúp chúng tôi phát triển sản phẩm tốt hơn.',
            bank: 'Chuyển khoản ngân hàng',
            bankName: 'Vietcombank',
            accountName: 'LUONG ANH VIET',
            accountNumber: '1234567890',
            note: 'Nội dụng: DMP AI Support',
            contact: 'Liên hệ Zalo: +84 766771509',
            close: 'Đóng'
        },
        en: {
            title: 'Support DMP AI',
            subtitle: 'Thank you for wanting to support the project! Every contribution helps us develop better products.',
            bank: 'Bank Transfer',
            bankName: 'Vietcombank',
            accountName: 'LUONG ANH VIET',
            accountNumber: '1234567890',
            note: 'Note: DMP AI Support',
            contact: 'Zalo Contact: +84 766771509',
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
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 animate-scale-up border border-slate-200 dark:border-slate-700">
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
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{t.subtitle}</p>

                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2 text-left border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t.bank}</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t.bankName}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{t.accountName}</p>
                        <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">{t.accountNumber}</p>
                        <p className="text-xs text-slate-500">{t.note}</p>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400">{t.contact}</p>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-black dark:hover:bg-white transition-colors"
                    >
                        {t.close}
                    </button>
                </div>
            </div>
        </div>
    );
};
