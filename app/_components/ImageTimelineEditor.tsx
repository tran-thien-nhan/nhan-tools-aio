// src/app/video-creator/components/ImageTimelineEditor.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { 
    GripVertical, 
    Trash2, 
    Plus, 
    Minus, 
    Clock,
    ZoomIn,
    ZoomOut,
    Scissors,
    Copy,
    Play,
    Pause,
    ChevronLeft,
    ChevronRight,
    Volume2,
    Image as ImageIcon
} from 'lucide-react';
import { TimelineImage } from './VideoCreator';

interface ImageTimelineEditorProps {
    timelineImages: TimelineImage[];
    onUpdate: (newTimeline: TimelineImage[]) => void;
    audioFile?: File | null;
    audioDuration?: number;
}

export default function ImageTimelineEditor({ 
    timelineImages, 
    onUpdate,
    audioFile,
    audioDuration = 0
}: ImageTimelineEditorProps) {
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const [zoom, setZoom] = useState(1);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedClip, setSelectedClip] = useState<number | null>(null);
    const [isResizing, setIsResizing] = useState<{index: number, edge: 'left' | 'right'} | null>(null);
    
    const timelineRef = useRef<HTMLDivElement>(null);
    const playheadRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>(null);

    const totalDuration = timelineImages.reduce((sum, img) => sum + img.duration, 0);
    const maxDuration = audioDuration || totalDuration;

    // Zoom controls
    const minZoom = 0.5;
    const maxZoom = 3;
    const pixelsPerSecond = 100 * zoom;

    const handleZoomIn = () => setZoom(Math.min(maxZoom, zoom + 0.25));
    const handleZoomOut = () => setZoom(Math.max(minZoom, zoom - 0.25));

    // Scroll controls
    const handleScrollLeft = () => {
        if (timelineRef.current) {
            timelineRef.current.scrollLeft -= 100;
        }
    };

    const handleScrollRight = () => {
        if (timelineRef.current) {
            timelineRef.current.scrollLeft += 100;
        }
    };

    // Playback controls
    useEffect(() => {
        if (isPlaying) {
            const startTime = performance.now() - currentTime * 1000;
            
            const animate = (now: number) => {
                const elapsed = (now - startTime) / 1000;
                if (elapsed < maxDuration) {
                    setCurrentTime(elapsed);
                    animationRef.current = requestAnimationFrame(animate);
                    
                    // Auto-scroll playhead into view
                    if (playheadRef.current && timelineRef.current) {
                        const playheadX = elapsed * pixelsPerSecond;
                        const containerLeft = timelineRef.current.scrollLeft;
                        const containerRight = containerLeft + timelineRef.current.clientWidth;
                        
                        if (playheadX < containerLeft || playheadX > containerRight) {
                            timelineRef.current.scrollLeft = playheadX - 200;
                        }
                    }
                } else {
                    setIsPlaying(false);
                    setCurrentTime(maxDuration);
                }
            };
            
            animationRef.current = requestAnimationFrame(animate);
        } else if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, maxDuration, pixelsPerSecond]);

    const handlePlayPause = () => setIsPlaying(!isPlaying);
    const handleStop = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    // Clip selection
    const handleClipClick = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedClip(index);
    };

    // Resize clip
    const handleResizeStart = (index: number, edge: 'left' | 'right', e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing({ index, edge });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !timelineRef.current) return;

            const { index, edge } = isResizing;
            const rect = timelineRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left + timelineRef.current.scrollLeft;
            const newTime = mouseX / pixelsPerSecond;

            const newTimeline = [...timelineImages];
            const clip = newTimeline[index];
            
            if (edge === 'right') {
                // Resize right edge
                const minDuration = 0.5;
                const maxDuration = 10;
                const prevClipsTotal = newTimeline.slice(0, index).reduce((sum, c) => sum + c.duration, 0);
                const newDuration = Math.min(maxDuration, Math.max(minDuration, newTime - prevClipsTotal));
                clip.duration = newDuration;
            } else {
                // Resize left edge - adjust both current and previous clip
                if (index > 0) {
                    const prevClip = newTimeline[index - 1];
                    const prevClipEnd = newTimeline.slice(0, index).reduce((sum, c) => sum + c.duration, 0) - prevClip.duration;
                    const newPrevDuration = Math.max(0.5, Math.min(10, newTime - prevClipEnd));
                    
                    // Adjust durations
                    const durationChange = newPrevDuration - prevClip.duration;
                    prevClip.duration = newPrevDuration;
                    clip.duration = Math.max(0.5, clip.duration - durationChange);
                }
            }

            onUpdate(newTimeline);
        };

        const handleMouseUp = () => {
            setIsResizing(null);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, timelineImages, pixelsPerSecond, onUpdate]);

    // Split clip
    const handleSplit = (index: number) => {
        if (!selectedClip) return;
        
        const clip = timelineImages[index];
        const splitTime = currentTime - timelineImages.slice(0, index).reduce((sum, c) => sum + c.duration, 0);
        
        if (splitTime > 0.5 && splitTime < clip.duration - 0.5) {
            const newTimeline = [...timelineImages];
            const clip1 = { ...clip, duration: splitTime };
            const clip2 = { 
                ...clip, 
                id: `img-${Date.now()}-${Math.random()}`,
                duration: clip.duration - splitTime,
                order: index + 1
            };
            
            newTimeline.splice(index, 1, clip1);
            newTimeline.splice(index + 1, 0, clip2);
            
            // Update orders
            const updatedTimeline = newTimeline.map((item, idx) => ({
                ...item,
                order: idx
            }));
            
            onUpdate(updatedTimeline);
        }
    };

    // Duplicate clip
    const handleDuplicate = (index: number) => {
        const clip = timelineImages[index];
        const newClip = {
            ...clip,
            id: `img-${Date.now()}-${Math.random()}`,
            order: timelineImages.length
        };
        
        const newTimeline = [...timelineImages, newClip];
        onUpdate(newTimeline);
    };

    // Delete clip
    const handleDelete = (index: number) => {
        if (timelineImages.length <= 1) {
            alert('Không thể xóa clip cuối cùng');
            return;
        }
        
        const newTimeline = timelineImages.filter((_, i) => i !== index);
        const updatedTimeline = newTimeline.map((item, idx) => ({
            ...item,
            order: idx
        }));
        
        onUpdate(updatedTimeline);
        setSelectedClip(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Toolbar */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleZoomOut}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Thu nhỏ"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Phóng to"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleScrollLeft}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePlayPause}
                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleStop}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <Clock className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={handleScrollRight}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                        {currentTime.toFixed(1)}s / {maxDuration.toFixed(1)}s
                    </span>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative p-4">
                {/* Ruler */}
                <div className="relative h-8 mb-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="absolute left-0 right-0 flex">
                        {Array.from({ length: Math.ceil(maxDuration) + 1 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute border-l border-gray-300 dark:border-gray-600"
                                style={{ left: i * pixelsPerSecond }}
                            >
                                <span className="absolute top-0 left-1 text-xs text-gray-500 -translate-x-1/2">
                                    {i}s
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline tracks */}
                <div 
                    ref={timelineRef}
                    className="relative overflow-x-auto scroll-smooth"
                    style={{ maxHeight: '300px' }}
                    onClick={() => setSelectedClip(null)}
                >
                    <div 
                        className="relative h-40 bg-gray-100 dark:bg-gray-700/30 rounded-lg"
                        style={{ width: Math.max(maxDuration * pixelsPerSecond, 800) }}
                    >
                        {/* Audio waveform (if audio exists) */}
                        {audioFile && (
                            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 pointer-events-none">
                                <div className="flex items-center justify-center h-full">
                                    <Volume2 className="w-5 h-5 text-indigo-400" />
                                    <span className="text-sm text-indigo-600 dark:text-indigo-400 ml-2">
                                        Audio track
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Video clips */}
                        <div className="absolute inset-x-0 top-16 bottom-0">
                            {timelineImages.map((image, index) => {
                                const startTime = timelineImages
                                    .slice(0, index)
                                    .reduce((sum, img) => sum + img.duration, 0);
                                const left = startTime * pixelsPerSecond;
                                const width = image.duration * pixelsPerSecond;
                                const isSelected = selectedClip === index;

                                return (
                                    <div
                                        key={image.id}
                                        className={`absolute h-20 rounded-lg transition-all ${
                                            isSelected 
                                                ? 'ring-2 ring-indigo-500 shadow-lg' 
                                                : 'hover:ring-2 hover:ring-indigo-300'
                                        }`}
                                        style={{
                                            left,
                                            width,
                                            top: '8px',
                                            cursor: draggedItem === index ? 'grabbing' : 'grab'
                                        }}
                                    >
                                        {/* Clip content */}
                                        <div
                                            draggable
                                            onDragStart={() => setDraggedItem(index)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDragEnd={() => setDraggedItem(null)}
                                            onClick={(e) => handleClipClick(index, e)}
                                            className="relative w-full h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg overflow-hidden group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <img
                                                    src={URL.createObjectURL(image.file)}
                                                    alt=""
                                                    className="w-full h-full object-cover opacity-50"
                                                />
                                            </div>
                                            
                                            {/* Clip info */}
                                            <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-xs p-1 truncate">
                                                {image.file.name}
                                            </div>
                                            
                                            {/* Duration indicator */}
                                            <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                                                {image.duration.toFixed(1)}s
                                            </div>

                                            {/* Resize handles */}
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/50"
                                                onMouseDown={(e) => handleResizeStart(index, 'left', e)}
                                            />
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/50"
                                                onMouseDown={(e) => handleResizeStart(index, 'right', e)}
                                            />

                                            {/* Drag handle */}
                                            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <GripVertical className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Playhead */}
                        <div
                            ref={playheadRef}
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                            style={{ left: currentTime * pixelsPerSecond }}
                        >
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Selected clip controls */}
                {selectedClip !== null && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Clip {selectedClip + 1}: {timelineImages[selectedClip].file.name}
                        </span>
                        
                        <div className="flex-1" />
                        
                        <button
                            onClick={() => handleSplit(selectedClip)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Cắt clip"
                        >
                            <Scissors className="w-4 h-4" />
                        </button>
                        
                        <button
                            onClick={() => handleDuplicate(selectedClip)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Nhân bản"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        
                        <button
                            onClick={() => handleDelete(selectedClip)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                            title="Xóa"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                    <span className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{timelineImages.length}</span> clips
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                        Tổng: <span className="font-medium text-indigo-600">{totalDuration.toFixed(1)}s</span>
                    </span>
                    {audioFile && (
                        <span className="text-gray-600 dark:text-gray-400">
                            Audio: <span className="font-medium text-purple-600">{maxDuration.toFixed(1)}s</span>
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                    <span>Kéo thả để sắp xếp</span>
                    <span>•</span>
                    <span>Kéo cạnh để điều chỉnh thời gian</span>
                    <span>•</span>
                    <span>Click clip để chọn</span>
                </div>
            </div>
        </div>
    );
}