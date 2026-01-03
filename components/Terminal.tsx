import React, { useEffect, useRef } from 'react';

interface TerminalProps {
    logs: string[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="mt-8 md:mt-12 animate-fade-in">
            <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 shadow-2xl">
                {/* Terminal Header */}
                <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500"></div>
                    </div>
                    <span className="ml-4 text-xs font-mono text-slate-400">DMP AI Terminal</span>
                </div>

                {/* Terminal Body */}
                <div
                    ref={terminalRef}
                    className="p-4 md:p-6 font-mono text-sm text-green-400 max-h-64 overflow-y-auto custom-scrollbar"
                >
                    {logs.map((log, index) => (
                        <div key={index} className="flex items-start space-x-2 mb-2">
                            <span className="text-blue-400 flex-shrink-0">❯</span>
                            <span
                                className={`${log.startsWith('Error') ? 'text-red-400' :
                                        log.startsWith('✓') ? 'text-green-400' :
                                            'text-slate-300'
                                    }`}
                            >
                                {log}
                            </span>
                        </div>
                    ))}
                    {logs.length > 0 && !logs[logs.length - 1]?.startsWith('✓') && !logs[logs.length - 1]?.startsWith('Error') && (
                        <span className="inline-block w-2 h-4 bg-green-400 animate-blink ml-1"></span>
                    )}
                </div>
            </div>
        </div>
    );
};
