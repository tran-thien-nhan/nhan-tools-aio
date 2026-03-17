// app/_components/ThumbnailCreator.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Sun, Moon, RotateCcw, RotateCw, Image as ImageIcon, Type } from 'lucide-react';
import { ThumbnailPreview } from './ThumbnailPreview';

// Các tỷ lệ khung hình phổ biến
export const ASPECT_RATIOS = [
    { value: '9:16', ratio: 'aspect-[9/16]', label: 'TikTok/Reels (9:16)' },
    { value: '16:9', ratio: 'aspect-video', label: 'YouTube (16:9)' },
    { value: '1:1', ratio: 'aspect-square', label: 'Instagram (1:1)' },
];

// Danh sách font chữ
export const FONTS = [
    { value: 'Arial', label: 'Arial', family: 'Arial, sans-serif' },
    { value: 'Helvetica', label: 'Helvetica', family: 'Helvetica, Arial, sans-serif' },
    { value: 'Times New Roman', label: 'Times New Roman', family: '"Times New Roman", Times, serif' },
    { value: 'Georgia', label: 'Georgia', family: 'Georgia, serif' },
    { value: 'Verdana', label: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
    { value: 'Courier New', label: 'Courier New', family: '"Courier New", Courier, monospace' },
    { value: 'Impact', label: 'Impact', family: 'Impact, Haettenschweiler, sans-serif' },
    { value: 'Comic Sans MS', label: 'Comic Sans MS', family: '"Comic Sans MS", cursive, sans-serif' },
    { value: 'Trebuchet MS', label: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif' },
    { value: 'Arial Black', label: 'Arial Black', family: '"Arial Black", Gadget, sans-serif' },
];

// Interface cho history state
interface HistoryState {
    backgroundImage: string | null;
    overlayColor: string;
    overlayOpacity: number;
    text: string;
    textColor: string;
    fontSize: number;
    fontFamily: typeof FONTS[0];
    aspectRatio: typeof ASPECT_RATIOS[0];
}

const ThumbnailCreator: React.FC = () => {
    // State cơ bản
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [overlayColor, setOverlayColor] = useState('#000000');
    const [overlayOpacity, setOverlayOpacity] = useState(0.5);
    const [text, setText] = useState('Nhập tiêu đề của bạn');
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [fontSize, setFontSize] = useState(48);
    const [fontFamily, setFontFamily] = useState(FONTS[0]);
    const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
    const [darkMode, setDarkMode] = useState(false);

    // History states
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Lưu state hiện tại vào history
    const saveToHistory = () => {
        const currentState: HistoryState = {
            backgroundImage,
            overlayColor,
            overlayOpacity,
            text,
            textColor,
            fontSize,
            fontFamily,
            aspectRatio,
        };

        const newHistory = history.slice(0, currentHistoryIndex + 1);
        newHistory.push(currentState);
        setHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
    };

    // Khôi phục state từ history
    const restoreFromHistory = (index: number) => {
        if (index >= 0 && index < history.length) {
            const state = history[index];
            setBackgroundImage(state.backgroundImage);
            setOverlayColor(state.overlayColor);
            setOverlayOpacity(state.overlayOpacity);
            setText(state.text);
            setTextColor(state.textColor);
            setFontSize(state.fontSize);
            setFontFamily(state.fontFamily);
            setAspectRatio(state.aspectRatio);
            setCurrentHistoryIndex(index);
        }
    };

    // Undo
    const handleUndo = () => {
        if (currentHistoryIndex > 0) {
            restoreFromHistory(currentHistoryIndex - 1);
        }
    };

    // Redo
    const handleRedo = () => {
        if (currentHistoryIndex < history.length - 1) {
            restoreFromHistory(currentHistoryIndex + 1);
        }
    };

    // Upload ảnh nền
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setBackgroundImage(e.target?.result as string);
                saveToHistory();
            };
            reader.readAsDataURL(file);
        }
    };

    // Handler cho các thay đổi
    const handleOverlayColorChange = (color: string) => {
        setOverlayColor(color);
        saveToHistory();
    };

    const handleOverlayOpacityChange = (opacity: number) => {
        setOverlayOpacity(opacity);
        saveToHistory();
    };

    const handleTextChange = (newText: string) => {
        setText(newText);
        saveToHistory();
    };

    const handleTextColorChange = (color: string) => {
        setTextColor(color);
        saveToHistory();
    };

    const handleFontSizeChange = (size: number) => {
        setFontSize(size);
        saveToHistory();
    };

    const handleFontFamilyChange = (font: typeof FONTS[0]) => {
        setFontFamily(font);
        saveToHistory();
    };

    const handleAspectRatioChange = (ratio: typeof ASPECT_RATIOS[0]) => {
        setAspectRatio(ratio);
        saveToHistory();
    };

    // Hàm chuyển đổi màu sắc về dạng hex đơn giản
    const ensureHexColor = (color: string): string => {
        // Nếu là màu hex hợp lệ (3 hoặc 6 ký tự), giữ nguyên
        if (/^#[0-9A-F]{6}$/i.test(color) || /^#[0-9A-F]{3}$/i.test(color)) {
            return color;
        }
        // Mặc định trả về đen hoặc trắng
        return '#000000';
    };

    // Tải thumbnail - SỬA LỖI
    const downloadThumbnail = async () => {
        if (!canvasRef.current) return;

        try {
            // Sử dụng html2canvas-pro thay vì html2canvas
            const html2canvas = (await import('html2canvas-pro')).default;

            const canvas = await html2canvas(canvasRef.current, {
                scale: window.devicePixelRatio || 3,  // nét hơn trên màn retina/hi-dpi
                backgroundColor: null,                // để trong suốt nếu overlay cần
                allowTaint: true,
                useCORS: true,
                logging: false,
                windowWidth: canvasRef.current.offsetWidth,
                windowHeight: canvasRef.current.offsetHeight,
            });

            const link = document.createElement('a');
            link.download = `thumbnail-${aspectRatio.value.replace(':', 'x')}.png`;  // đẹp hơn: 9x16 thay 9:16
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (error) {
            console.error('Lỗi khi tải thumbnail với html2canvas-pro:', error);
            alert('Có lỗi xảy ra khi tạo ảnh. Hãy thử:\n- Tắt dark mode\n- Kiểm tra ảnh nền có CORS không\n- Refresh trang và thử lại');
        }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-b ${darkMode ? 'from-gray-900 to-gray-800' : 'from-gray-50 to-gray-100'} p-6`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <ImageIcon className="w-8 h-8 text-indigo-600" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Tạo Thumbnail Đơn Giản
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Undo/Redo */}
                        <div className="flex items-center gap-1 mr-2">
                            <button
                                onClick={handleUndo}
                                disabled={currentHistoryIndex <= 0}
                                className={`p-2 rounded-lg transition-colors ${currentHistoryIndex <= 0
                                    ? 'opacity-50 cursor-not-allowed'
                                    : darkMode
                                        ? 'hover:bg-gray-700 text-gray-300 bg-gray-800 border border-gray-700'
                                        : 'hover:bg-gray-100 text-gray-600 bg-white border border-gray-200'
                                    }`}
                                title="Undo (Ctrl+Z)"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={currentHistoryIndex >= history.length - 1}
                                className={`p-2 rounded-lg transition-colors ${currentHistoryIndex >= history.length - 1
                                    ? 'opacity-50 cursor-not-allowed'
                                    : darkMode
                                        ? 'hover:bg-gray-700 text-gray-300 bg-gray-800 border border-gray-700'
                                        : 'hover:bg-gray-100 text-gray-600 bg-white border border-gray-200'
                                    }`}
                                title="Redo (Ctrl+Y)"
                            >
                                <RotateCw className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-200'} shadow-sm`}
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Grid 2 cột */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left Column - Input Controls */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Aspect Ratio Card */}
                        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700`}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tỷ lệ khung hình</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Chọn tỷ lệ cho thumbnail
                                </p>
                            </div>
                            <div className="p-6">
                                <select
                                    value={aspectRatio.value}
                                    onChange={(e) => {
                                        const selected = ASPECT_RATIOS.find(r => r.value === e.target.value);
                                        if (selected) handleAspectRatioChange(selected);
                                    }}
                                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                >
                                    {ASPECT_RATIOS.map(ratio => (
                                        <option key={ratio.value} value={ratio.value}>
                                            {ratio.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Upload Image Card */}
                        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700`}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ảnh nền</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Chọn ảnh nền cho thumbnail
                                </p>
                            </div>
                            <div className="p-6">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full p-6 border-2 border-dashed rounded-lg hover:border-indigo-500 transition-colors flex flex-col items-center gap-3"
                                >
                                    <Upload className={`w-8 h-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {backgroundImage ? 'Đổi ảnh khác' : 'Chọn ảnh nền'}
                                    </span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                {backgroundImage && (
                                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                        ✓ Đã chọn ảnh nền
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Overlay Card */}
                        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700`}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Lớp phủ</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Tùy chỉnh lớp phủ màu
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Màu sắc
                                    </label>
                                    <input
                                        type="color"
                                        value={overlayColor}
                                        onChange={(e) => handleOverlayColorChange(e.target.value)}
                                        className="w-full h-10 rounded cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Độ mờ: {Math.round(overlayOpacity * 100)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={overlayOpacity}
                                        onChange={(e) => handleOverlayOpacityChange(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Text Card */}
                        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700`}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tiêu đề</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Nhập nội dung tiêu đề
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Nội dung
                                    </label>
                                    <textarea
                                        value={text}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                        rows={3}
                                        className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                        placeholder="Nhập tiêu đề..."
                                    />
                                </div>

                                {/* Font Family Selector */}
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Type className="w-4 h-4 inline mr-1" />
                                        Font chữ
                                    </label>
                                    <select
                                        value={fontFamily.value}
                                        onChange={(e) => {
                                            const selected = FONTS.find(f => f.value === e.target.value);
                                            if (selected) handleFontFamilyChange(selected);
                                        }}
                                        className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                        style={{ fontFamily: fontFamily.family }}
                                    >
                                        {FONTS.map(font => (
                                            <option
                                                key={font.value}
                                                value={font.value}
                                                style={{ fontFamily: font.family }}
                                            >
                                                {font.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Màu chữ
                                    </label>
                                    <input
                                        type="color"
                                        value={textColor}
                                        onChange={(e) => handleTextColorChange(e.target.value)}
                                        className="w-full h-10 rounded cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Cỡ chữ: {fontSize}px
                                    </label>
                                    <input
                                        type="range"
                                        min="24"
                                        max="96"
                                        value={fontSize}
                                        onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Preview font */}
                                <div className={`mt-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Xem trước font:</p>
                                    <p
                                        className="text-lg"
                                        style={{
                                            fontFamily: fontFamily.family,
                                            color: darkMode ? '#fff' : '#000'
                                        }}
                                    >
                                        {fontFamily.label}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={downloadThumbnail}
                                disabled={!backgroundImage}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-colors ${!backgroundImage
                                    ? 'bg-indigo-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                            >
                                <Download className="w-4 h-4" />
                                Tải thumbnail
                            </button>
                            <button
                                onClick={() => {
                                    setBackgroundImage(null);
                                    setOverlayColor('#000000');
                                    setOverlayOpacity(0.5);
                                    setText('Nhập tiêu đề của bạn');
                                    setTextColor('#FFFFFF');
                                    setFontSize(48);
                                    setFontFamily(FONTS[0]);
                                    setAspectRatio(ASPECT_RATIOS[0]);
                                    setHistory([]);
                                    setCurrentHistoryIndex(-1);
                                }}
                                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                            >
                                Làm mới
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Preview */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6`}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Xem trước</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Thumbnail của bạn sẽ hiển thị ở đây
                                </p>
                            </div>
                            <div className="p-8 flex items-center justify-center">
                                <ThumbnailPreview
                                    canvasRef={canvasRef}
                                    aspectRatio={aspectRatio}
                                    backgroundImage={backgroundImage}
                                    overlayColor={overlayColor}
                                    overlayOpacity={overlayOpacity}
                                    text={text}
                                    textColor={textColor}
                                    fontSize={fontSize}
                                    fontFamily={fontFamily}
                                    darkMode={darkMode}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThumbnailCreator;