// src/app/video-creator/components/AspectRatioSelector.tsx
'use client';

import { Smartphone, Monitor } from 'lucide-react';

interface AspectRatioSelectorProps {
    value: '9:16' | '16:9';
    onChange: (value: '9:16' | '16:9') => void;
}

export default function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
    return (
        <div className="flex gap-4">
            <button
                onClick={() => onChange('9:16')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${value === '9:16'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
            >
                <Smartphone className="w-4 h-4" />
                9:16 (TikTok/Reels)
            </button>
            <button
                onClick={() => onChange('16:9')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${value === '16:9'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
            >
                <Monitor className="w-4 h-4" />
                16:9 (YouTube)
            </button>
        </div>
    );
}