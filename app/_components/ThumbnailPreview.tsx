// app/_components/ThumbnailPreview.tsx
'use client';

import { Image as ImageIcon } from 'lucide-react';
import { ASPECT_RATIOS, FONTS } from "./ThumbnailCreator";
import { useState } from 'react';

export const ThumbnailPreview: React.FC<{
    canvasRef: React.RefObject<HTMLDivElement | null>;
    aspectRatio: typeof ASPECT_RATIOS[0];
    backgroundImage: string | null;
    overlayColor: string;
    overlayOpacity: number;
    text: string;
    textColor: string;
    fontSize: number;
    fontFamily: typeof FONTS[0];
    darkMode: boolean;
}> = ({ canvasRef, aspectRatio, backgroundImage, overlayColor, overlayOpacity, text, textColor, fontSize, fontFamily, darkMode }) => {
    const [imageFit, setImageFit] = useState<'cover' | 'contain'>('cover');

    // Tính toán font size dựa trên aspect ratio
    const scaledFontSize = Math.floor(fontSize * (aspectRatio.value === '9:16' ? 1.2 : 1));

    return (
        <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-[600px]">
                <div
                    ref={canvasRef}
                    className={`
                        ${aspectRatio.ratio} 
                        bg-gray-900 rounded-xl overflow-hidden relative shadow-2xl
                        w-full
                    `}
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {!backgroundImage ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/50">
                            <ImageIcon className="w-24 h-24 text-gray-400 mb-4" />
                            <p className="text-gray-300 text-center text-xl px-8">
                                Chọn ảnh nền để bắt đầu
                                <br />
                                <span className="text-sm opacity-70 mt-2 block">
                                    Hỗ trợ 9:16, 16:9, 1:1
                                </span>
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Ảnh nền */}
                            <img
                                src={backgroundImage}
                                alt="background"
                                className={`
                                    absolute inset-0 w-full h-full
                                    ${imageFit === 'cover' ? 'object-cover' : 'object-contain'}
                                `}
                                style={{
                                    objectPosition: 'center',
                                    backgroundColor: darkMode ? '#1f2937' : '#f3f4f6'
                                }}
                                crossOrigin="anonymous"
                            />

                            {/* Lớp phủ */}
                            <div
                                className="absolute inset-0 z-10"
                                style={{
                                    backgroundColor: overlayColor,
                                    opacity: overlayOpacity,
                                }}
                            />

                            {/* Tiêu đề */}
                            <div className="absolute inset-0 z-20 flex items-center justify-center p-8">
                                <div
                                    className="w-full max-w-[90%] text-center break-words"
                                    style={{
                                        color: textColor,
                                        fontSize: `${scaledFontSize}px`,
                                        fontWeight: '800',
                                        fontFamily: fontFamily.family,
                                        textShadow: '0 4px 15px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.5)',
                                        lineHeight: 1.2,
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {text || 'Tiêu đề của bạn...'}
                                </div>
                            </div>

                            {/* Nút toggle cover/contain */}
                            <button
                                onClick={() => setImageFit(prev => prev === 'cover' ? 'contain' : 'cover')}
                                className="
                                    absolute bottom-4 right-4 z-30
                                    bg-black/70 hover:bg-black/90 text-white 
                                    text-sm px-4 py-2 rounded-full 
                                    backdrop-blur-sm transition-all
                                    font-medium shadow-lg
                                "
                            >
                                {imageFit === 'cover' ? '⤢ Phủ kín' : '⤡ Giữ tỉ lệ'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};