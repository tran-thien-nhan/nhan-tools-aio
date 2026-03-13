// src/lib/video-generator.ts
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg() {
    if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        await ffmpeg.load();
    }
    return ffmpeg;
}

interface GenerateVideoParams {
    images: File[];
    durations?: number[]; // Mảng thời gian cho từng hình (giây)
    audioFile: File | null;
    aspectRatio: '9:16' | '16:9';
    audioDuration?: number; // Thời lượng audio thực tế (giây)
    onProgress?: (progress: number, status?: string) => void;
}

interface GenerateVideoResult {
    url: string;
}

// Helper function to safely convert Uint8Array to Blob
function uint8ArrayToBlob(uint8Array: Uint8Array, mimeType: string): Blob {
    const buffer = new ArrayBuffer(uint8Array.length);
    const view = new Uint8Array(buffer);
    view.set(uint8Array);
    return new Blob([buffer], { type: mimeType });
}

export async function generateVideo({
    images,
    durations,
    audioFile,
    aspectRatio,
    audioDuration,
    onProgress,
}: GenerateVideoParams): Promise<GenerateVideoResult> {
    try {
        const ffmpeg = await getFFmpeg();

        onProgress?.(10, 'Đang xử lý hình ảnh...');

        // Xác định kích thước video
        const dimensions = aspectRatio === '9:16'
            ? { width: 1080, height: 1920 }
            : { width: 1920, height: 1080 };

        // Upload images to FFmpeg
        for (let i = 0; i < images.length; i++) {
            const imageData = await fetchFile(images[i]);
            await ffmpeg.writeFile(`image${i}.jpg`, imageData);
            onProgress?.(10 + (i / images.length) * 15, `Đang xử lý ảnh ${i + 1}/${images.length}`);
        }

        onProgress?.(25, 'Đang xử lý thông số video...');

        let imageSequence: Array<{ index: number, duration: number }> = [];
        let targetDuration: number;

        // Sử dụng durations nếu được cung cấp
        const imageDurations = durations && durations.length === images.length
            ? durations
            : images.map(() => 2); // Mặc định 2 giây nếu không có durations

        if (audioFile && audioDuration) {
            // Có audio: target duration là thời lượng audio
            targetDuration = audioDuration;
            onProgress?.(30, `Thời lượng âm thanh: ${targetDuration.toFixed(2)} giây`);

            // Tính tổng thời lượng hình ảnh gốc
            const totalOriginalDuration = imageDurations.reduce((sum, dur) => sum + dur, 0);

            if (totalOriginalDuration < targetDuration) {
                // Trường hợp 1: Thời lượng hình ảnh < thời lượng audio -> Lặp lại hình ảnh
                onProgress?.(35, `Thời lượng hình ảnh (${totalOriginalDuration.toFixed(2)}s) < thời lượng audio, sẽ lặp lại hình ảnh...`);
                
                let currentTime = 0;
                
                // Lặp lại các hình cho đến khi đạt targetDuration
                while (currentTime < targetDuration) {
                    for (let i = 0; i < images.length; i++) {
                        if (currentTime >= targetDuration) break;
                        
                        const remainingTime = targetDuration - currentTime;
                        const originalDuration = imageDurations[i];
                        
                        // Nếu đây là hình cuối cùng
                        if (currentTime + originalDuration >= targetDuration) {
                            // Kéo dài hình cuối để khớp với thời gian còn lại
                            imageSequence.push({
                                index: i,
                                duration: remainingTime
                            });
                            currentTime += remainingTime;
                        } else {
                            // Thêm hình với duration gốc
                            imageSequence.push({
                                index: i,
                                duration: originalDuration
                            });
                            currentTime += originalDuration;
                        }
                        
                        if (currentTime >= targetDuration) break;
                    }
                }
            } else {
                // Trường hợp 2: Thời lượng hình ảnh >= thời lượng audio -> Cắt bớt
                onProgress?.(35, `Thời lượng hình ảnh (${totalOriginalDuration.toFixed(2)}s) >= thời lượng audio, sẽ cắt bớt hình ảnh...`);
                
                let currentTime = 0;
                
                for (let i = 0; i < images.length; i++) {
                    if (currentTime >= targetDuration) break;
                    
                    const remainingTime = targetDuration - currentTime;
                    const originalDuration = imageDurations[i];
                    
                    if (currentTime + originalDuration >= targetDuration) {
                        // Đây là hình cuối cùng, kéo dài nó để khớp với thời gian còn lại
                        imageSequence.push({
                            index: i,
                            duration: remainingTime
                        });
                        currentTime += remainingTime;
                    } else {
                        // Thêm hình với duration gốc
                        imageSequence.push({
                            index: i,
                            duration: originalDuration
                        });
                        currentTime += originalDuration;
                    }
                }
            }

            // Upload audio file
            const audioData = await fetchFile(audioFile);
            await ffmpeg.writeFile('audio.mp3', audioData);

            onProgress?.(40, `Đã tạo sequence với ${imageSequence.length} khung hình, thời gian: ${targetDuration.toFixed(2)}s`);
        } else {
            // Không có audio: tạo video với durations gốc
            targetDuration = imageDurations.reduce((sum, dur) => sum + dur, 0);
            
            for (let i = 0; i < images.length; i++) {
                imageSequence.push({
                    index: i,
                    duration: imageDurations[i]
                });
            }
            onProgress?.(40, `Không có audio, tạo video với ${imageSequence.length} khung hình, thời gian: ${targetDuration.toFixed(2)}s`);
        }

        // Tạo concat file cho FFmpeg
        let concatContent = '';
        for (let i = 0; i < imageSequence.length; i++) {
            const { index, duration } = imageSequence[i];
            concatContent += `file 'image${index}.jpg'\n`;
            concatContent += `duration ${duration.toFixed(3)}\n`;
        }

        // FFmpeg concat yêu cầu file cuối cùng không có duration
        if (imageSequence.length > 0) {
            const lastIndex = imageSequence[imageSequence.length - 1].index;
            concatContent += `file 'image${lastIndex}.jpg'`;
        }

        // Ghi concat file
        await ffmpeg.writeFile('concat.txt', concatContent);

        onProgress?.(50, 'Đang tạo video từ hình ảnh...');

        // Log để debug
        console.log('Concat content:', concatContent);
        console.log('Total video duration:', targetDuration);
        console.log('Number of images in sequence:', imageSequence.length);

        // Tạo video từ danh sách hình ảnh
        await ffmpeg.exec([
            '-f', 'concat',
            '-safe', '0',
            '-i', 'concat.txt',
            '-vf', `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=1,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2,fps=30`,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-pix_fmt', 'yuv420p',
            '-t', targetDuration.toString(), // QUAN TRỌNG: Giới hạn thời gian video
            '-y',
            'video_no_audio.mp4'
        ]);

        onProgress?.(70, 'Đã tạo xong video, đang ghép âm thanh...');

        // Ghép âm thanh nếu có
        if (audioFile) {
            // QUAN TRỌNG: Không dùng -shortest, mà dùng -t để đảm bảo audio phát hết
            await ffmpeg.exec([
                '-i', 'video_no_audio.mp4',
                '-i', 'audio.mp3',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-t', targetDuration.toString(), // Đảm bảo video có độ dài bằng audio
                '-y',
                'final_output.mp4'
            ]);
        } else {
            await ffmpeg.exec(['-i', 'video_no_audio.mp4', '-c', 'copy', '-y', 'final_output.mp4']);
        }

        onProgress?.(90, 'Đang hoàn thiện video...');

        // Đọc file kết quả
        const data = await ffmpeg.readFile('final_output.mp4');

        // Chuyển đổi dữ liệu an toàn
        let uint8Array: Uint8Array;
        if (data instanceof Uint8Array) {
            uint8Array = data;
        } else if (typeof data === 'string') {
            uint8Array = new TextEncoder().encode(data);
        } else {
            uint8Array = new Uint8Array(data as ArrayBuffer);
        }

        const blob = uint8ArrayToBlob(uint8Array, 'video/mp4');
        const url = URL.createObjectURL(blob);

        onProgress?.(100, 'Hoàn thành!');

        return { url };
    } catch (error) {
        console.error('Error generating video:', error);
        throw new Error('Không thể tạo video. Vui lòng thử lại.');
    }
}