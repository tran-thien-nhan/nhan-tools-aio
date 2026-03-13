// src/app/video-creator/components/ImageUploader.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image, X } from 'lucide-react';

interface ImageUploaderProps {
    images: File[];
    onImagesChange: (images: File[]) => void;
}

export default function ImageUploader({ images, onImagesChange }: ImageUploaderProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const validFiles = acceptedFiles.filter(file =>
            file.type.startsWith('image/')
        );
        onImagesChange([...images, ...validFiles]);
    }, [images, onImagesChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
        }
    });

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        onImagesChange(newImages);
    };

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragActive
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400'
                    }`}
            >
                <input {...getInputProps()} />
                <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                    <p className="text-indigo-600 dark:text-indigo-400">Thả ảnh vào đây...</p>
                ) : (
                    <>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                            Kéo thả hình ảnh vào đây, hoặc click để chọn
                        </p>
                        <p className="text-sm text-gray-500">
                            Hỗ trợ: PNG, JPG, JPEG, GIF, WEBP
                        </p>
                    </>
                )}
            </div>

            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {images.map((file, index) => (
                        <div key={index} className="relative group">
                            <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                            <button
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                aria-label="Xóa ảnh"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs px-2 py-1 rounded truncate">
                                {file.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}