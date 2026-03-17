// src/app/video-creator/components/VideoCreator.tsx
'use client';

import { useState, useEffect } from 'react';
import { Film, Loader2, Download, ArrowLeft, Edit, Save, X, Plus, Trash2, GripVertical } from 'lucide-react';
import AudioUploader from './AudioUploader';
import AspectRatioSelector from './AspectRatioSelector';
import VideoPreview from './VideoPreview';
import ImageUploader from './ImageUploader';
import { generateVideo } from '../_services/video-generator';
import ImageTimelineEditor from './ImageTimelineEditor';

interface VideoCreatorProps {
    onBack?: () => void;
}

export interface TimelineImage {
    id: string;
    file: File;
    index: number; // Index trong mảng images gốc
    duration: number; // Thời gian hiển thị (giây)
    order: number; // Thứ tự trong timeline
}

export default function VideoCreator({ onBack }: VideoCreatorProps) {
    const [images, setImages] = useState<File[]>([]);
    const [timelineImages, setTimelineImages] = useState<TimelineImage[]>([]);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('16:9');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);
    const [showTimelineEditor, setShowTimelineEditor] = useState(false);
    const [audioDuration, setAudioDuration] = useState<number | null>(null);

    // Cập nhật timeline khi images thay đổi
    useEffect(() => {
        if (images.length > 0) {
            // Tạo timeline mặc định: mỗi hình 2 giây, theo thứ tự upload
            const newTimeline: TimelineImage[] = images.map((file, idx) => ({
                id: `img-${Date.now()}-${idx}-${Math.random()}`,
                file,
                index: idx,
                duration: 2,
                order: idx
            }));
            setTimelineImages(newTimeline);
        } else {
            setTimelineImages([]);
        }
    }, [images]);

    // Lấy thời lượng audio khi có file audio mới
    useEffect(() => {
        if (audioFile) {
            // Tạo audio element để lấy thời lượng thực tế
            const audio = new Audio();
            const url = URL.createObjectURL(audioFile);
            audio.src = url;
            
            audio.addEventListener('loadedmetadata', () => {
                setAudioDuration(audio.duration);
                URL.revokeObjectURL(url);
            });

            audio.addEventListener('error', () => {
                // Fallback về ước tính nếu không lấy được
                const estimatedDuration = estimateAudioDuration(audioFile);
                setAudioDuration(estimatedDuration);
                URL.revokeObjectURL(url);
            });
        } else {
            setAudioDuration(null);
        }
    }, [audioFile]);

    // Hàm ước tính thời lượng âm thanh
    const estimateAudioDuration = (file: File): number => {
        const bitrates: { [key: string]: number } = {
            'mp3': 128,
            'm4a': 128,
            'aac': 128,
            'ogg': 128,
            'wav': 1411,
            'flac': 800,
            'default': 128
        };

        const extension = file.name.split('.').pop()?.toLowerCase() || 'default';
        const bitrateKbps = bitrates[extension] || bitrates.default;
        const fileSizeBits = file.size * 8;
        const bitrateBps = bitrateKbps * 1024;
        
        return fileSizeBits / bitrateBps;
    };

    // Tính tổng thời gian hình ảnh
    const totalImageDuration = timelineImages.reduce((sum, img) => sum + img.duration, 0);

    const handleGenerateVideo = async () => {
        if (timelineImages.length === 0) {
            setError('Vui lòng upload ít nhất 1 hình ảnh');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setProgress(0);
        setStatus('Đang chuẩn bị...');

        try {
            // Sắp xếp timeline theo order
            const sortedTimeline = [...timelineImages].sort((a, b) => a.order - b.order);
            
            // Tạo mảng images theo thứ tự timeline
            const orderedImages = sortedTimeline.map(item => item.file);
            
            // Tạo mảng durations tương ứng
            const durations = sortedTimeline.map(item => item.duration);

            const result = await generateVideo({
                images: orderedImages,
                durations,
                audioFile,
                aspectRatio,
                audioDuration: audioDuration || undefined, // Truyền thời lượng audio thực tế
                onProgress: (progressValue, statusMessage) => {
                    setProgress(progressValue);
                    if (statusMessage) setStatus(statusMessage);
                },
            });

            setVideoUrl(result.url);
            setStatus('Hoàn thành!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo video');
            setStatus('Lỗi');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (videoUrl) {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = `video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleReset = () => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        setImages([]);
        setTimelineImages([]);
        setAudioFile(null);
        setVideoUrl(null);
        setError(null);
        setProgress(0);
        setStatus('');
        setIsEditing(false);
        setShowTimelineEditor(false);
        setAudioDuration(null);
    };

    const handleUpdateTimeline = (newTimeline: TimelineImage[]) => {
        setTimelineImages(newTimeline);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Film className="w-8 h-8 text-indigo-600" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Tạo Video từ Hình Ảnh
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {images.length > 0 && !isGenerating && (
                            <button
                                onClick={() => setShowTimelineEditor(!showTimelineEditor)}
                                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-2"
                            >
                                {showTimelineEditor ? (
                                    <>
                                        <X className="w-4 h-4" />
                                        Đóng chỉnh sửa
                                    </>
                                ) : (
                                    <>
                                        <Edit className="w-4 h-4" />
                                        Chỉnh sửa timeline
                                    </>
                                )}
                            </button>
                        )}
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Quay lại
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Input Controls */}
                    <div className="space-y-6">
                        {/* Image Upload Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Hình Ảnh</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Chọn hình ảnh để tạo video (có thể chọn nhiều ảnh)
                                </p>
                            </div>
                            <div className="p-6">
                                <ImageUploader images={images} onImagesChange={setImages} />
                                {images.length > 0 && (
                                    <p className="mt-2 text-sm text-gray-500">
                                        Đã chọn {images.length} hình ảnh
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Timeline Editor */}
                        {showTimelineEditor && timelineImages.length > 0 && (
                            <ImageTimelineEditor
                                timelineImages={timelineImages}
                                onUpdate={handleUpdateTimeline}
                            />
                        )}

                        {/* Audio Upload Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Âm Thanh (Tùy chọn)</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Thêm nhạc nền / âm thanh cho video
                                </p>
                            </div>
                            <div className="p-6">
                                <AudioUploader audioFile={audioFile} onAudioChange={setAudioFile} />
                            </div>
                        </div>

                        {/* Aspect Ratio Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tỷ lệ khung hình</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Chọn tỷ lệ khung hình cho video
                                </p>
                            </div>
                            <div className="p-6">
                                <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Progress */}
                        {isGenerating && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{status}</span>
                                        <span className="text-sm text-gray-500">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div
                                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Đang xử lý...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleGenerateVideo}
                                disabled={isGenerating || timelineImages.length === 0}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-colors ${
                                    isGenerating || timelineImages.length === 0
                                        ? 'bg-indigo-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang tạo video...
                                    </>
                                ) : (
                                    <>
                                        <Film className="w-4 h-4" />
                                        Tạo Video
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={isGenerating}
                                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Làm mới
                            </button>
                        </div>

                        {/* Timeline Summary */}
                        {timelineImages.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Tổng quan timeline</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Số lượng hình:</span>
                                        <span className="font-medium">{timelineImages.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Thời lượng hình ảnh:</span>
                                        <span className="font-medium">
                                            {totalImageDuration.toFixed(1)}s
                                        </span>
                                    </div>
                                    {audioDuration && (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Thời lượng audio:</span>
                                                <span className="font-medium">{audioDuration.toFixed(1)}s</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-700 dark:text-gray-300">Tổng thời gian video:</span>
                                                <span className="text-indigo-600 dark:text-indigo-400">
                                                    {audioDuration.toFixed(1)}s
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {totalImageDuration < audioDuration ? (
                                                    <span>⏱️ Hình ảnh sẽ được lặp lại để khớp với thời lượng audio</span>
                                                ) : totalImageDuration > audioDuration ? (
                                                    <span>⏱️ Hình ảnh sẽ được cắt bớt để khớp với thời lượng audio</span>
                                                ) : (
                                                    <span>✅ Thời lượng hình ảnh khớp với audio</span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    {!audioDuration && (
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="text-gray-700 dark:text-gray-300">Tổng thời gian video:</span>
                                            <span className="text-indigo-600 dark:text-indigo-400">
                                                {totalImageDuration.toFixed(1)}s
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Preview */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Xem trước</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Video của bạn sẽ hiển thị ở đây sau khi tạo
                                </p>
                            </div>
                            <div className="p-6">
                                <VideoPreview videoUrl={videoUrl} aspectRatio={aspectRatio} />

                                {videoUrl && (
                                    <div className="mt-4">
                                        <button
                                            onClick={handleDownload}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-medium bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Tải Video
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}