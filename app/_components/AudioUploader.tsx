// src/app/video-creator/components/AudioUploader.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Music, X, FileAudio } from 'lucide-react';

interface AudioUploaderProps {
    audioFile: File | null;
    onAudioChange: (file: File | null) => void;
}

export default function AudioUploader({ audioFile, onAudioChange }: AudioUploaderProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onAudioChange(acceptedFiles[0]);
        }
    }, [onAudioChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
        },
        maxFiles: 1
    });

    const removeAudio = () => {
        onAudioChange(null);
    };

    if (audioFile) {
        return (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                    <FileAudio className="w-8 h-8 text-indigo-600" />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{audioFile.name}</p>
                        <p className="text-sm text-gray-500">
                            {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                </div>
                <button
                    onClick={removeAudio}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                    aria-label="Xóa file âm thanh"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400'
                }`}
        >
            <input {...getInputProps()} />
            <Music className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
                <p className="text-indigo-600 dark:text-indigo-400">Thả file âm thanh vào đây...</p>
            ) : (
                <>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                        Kéo thả file âm thanh vào đây, hoặc click để chọn
                    </p>
                    <p className="text-sm text-gray-500">
                        Hỗ trợ: MP3, WAV, M4A, AAC, OGG (Tùy chọn)
                    </p>
                </>
            )}
        </div>
    );
}