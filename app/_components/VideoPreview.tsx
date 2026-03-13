// src/app/video-creator/components/VideoPreview.tsx
'use client';

import { Image as ImageIcon } from 'lucide-react';

interface VideoPreviewProps {
    videoUrl: string | null;
    aspectRatio: '9:16' | '16:9';
}

export default function VideoPreview({ videoUrl, aspectRatio }: VideoPreviewProps) {
    const aspectRatioClass = aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video';

    if (!videoUrl) {
        return (
            <div className={`${aspectRatioClass} bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center`}>
                <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                    Video sẽ hiển thị ở đây
                    <br />
                    <span className="text-sm">Sau khi tạo video</span>
                </p>
            </div>
        );
    }

    return (
        <div className="relative">
            <video
                src={videoUrl}
                controls
                className={`w-full ${aspectRatioClass} rounded-lg bg-black`}
            />
        </div>
    );
}