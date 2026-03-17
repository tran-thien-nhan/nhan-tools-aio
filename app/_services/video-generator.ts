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
    const safeArray = new Uint8Array(uint8Array);
    return new Blob([safeArray], { type: mimeType });
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
        console.log(`Uploading ${images.length} images...`);
        for (let i = 0; i < images.length; i++) {
            const imageData = await fetchFile(images[i]);
            await ffmpeg.writeFile(`image${i}.jpg`, imageData);
            console.log(`Uploaded image${i}.jpg`);
            onProgress?.(10 + (i / images.length) * 15, `Đang xử lý ảnh ${i + 1}/${images.length}`);
        }

        onProgress?.(25, 'Đang xử lý thông số video...');

        // Xây dựng imageSequence dựa trên audio duration
        let imageSequence: Array<{ index: number, duration: number }> = [];
        let targetDuration: number;

        // Sử dụng durations nếu được cung cấp
        const imageDurations = durations && durations.length === images.length
            ? durations
            : images.map(() => 2); // Mặc định 2 giây nếu không có durations

        console.log('Image durations:', imageDurations);

        if (audioFile && audioDuration) {
            // Có audio: target duration là thời lượng audio
            targetDuration = audioDuration;
            console.log(`Audio duration: ${targetDuration}s`);

            // Tính tổng thời lượng hình ảnh gốc
            const totalOriginalDuration = imageDurations.reduce((sum, dur) => sum + dur, 0);
            console.log(`Total original duration: ${totalOriginalDuration}s`);

            if (totalOriginalDuration < targetDuration) {
                // Trường hợp 1: Thời lượng hình ảnh < thời lượng audio -> Lặp lại hình ảnh
                console.log('Image duration < audio duration, will repeat images');
                
                let currentTime = 0;
                
                // Lặp lại các hình cho đến khi đạt targetDuration
                while (currentTime < targetDuration) {
                    for (let i = 0; i < images.length; i++) {
                        if (currentTime >= targetDuration) break;
                        
                        const remainingTime = targetDuration - currentTime;
                        const originalDuration = imageDurations[i];
                        
                        if (currentTime + originalDuration >= targetDuration) {
                            // Kéo dài hình cuối để khớp với thời gian còn lại
                            imageSequence.push({
                                index: i,
                                duration: remainingTime
                            });
                            console.log(`  Add image ${i} (final) with duration: ${remainingTime.toFixed(2)}s`);
                            currentTime += remainingTime;
                        } else {
                            // Thêm hình với duration gốc
                            imageSequence.push({
                                index: i,
                                duration: originalDuration
                            });
                            console.log(`  Add image ${i} with duration: ${originalDuration}s`);
                            currentTime += originalDuration;
                        }
                    }
                }
            } else {
                // Trường hợp 2: Thời lượng hình ảnh >= thời lượng audio -> Cắt bớt
                console.log('Image duration >= audio duration, will trim last image');
                
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
                        console.log(`  Add image ${i} (trimmed) with duration: ${remainingTime.toFixed(2)}s`);
                        currentTime += remainingTime;
                    } else {
                        // Thêm hình với duration gốc
                        imageSequence.push({
                            index: i,
                            duration: originalDuration
                        });
                        console.log(`  Add image ${i} with duration: ${originalDuration}s`);
                        currentTime += originalDuration;
                    }
                }
            }

            // Upload audio file
            const audioData = await fetchFile(audioFile);
            await ffmpeg.writeFile('audio.mp3', audioData);
            console.log('Uploaded audio file');
        } else {
            // Không có audio: tạo video với durations gốc
            console.log('No audio, creating video with original durations');
            
            for (let i = 0; i < images.length; i++) {
                imageSequence.push({
                    index: i,
                    duration: imageDurations[i]
                });
                console.log(`  Add image ${i} with duration: ${imageDurations[i]}s`);
            }
            targetDuration = imageDurations.reduce((sum, dur) => sum + dur, 0);
        }

        console.log(`\n=== IMAGE SEQUENCE ===`);
        console.log(`Total frames: ${imageSequence.length}`);
        console.log(`Target duration: ${targetDuration.toFixed(2)}s`);
        imageSequence.forEach((item, idx) => {
            console.log(`  ${idx + 1}. Image ${item.index} - ${item.duration.toFixed(2)}s`);
        });

        onProgress?.(40, `Đang tạo video với ${imageSequence.length} khung hình...`);

        // Tạo video cho từng ảnh trong sequence
        const partFiles = [];
        for (let i = 0; i < imageSequence.length; i++) {
            const { index, duration } = imageSequence[i];
            const partName = `part${i}.mp4`;
            partFiles.push(partName);
            
            console.log(`Creating part ${i} from image${index}.jpg with duration ${duration}s...`);
            
            // Tạo video từ 1 ảnh với thời lượng xác định
            await ffmpeg.exec([
                '-loop', '1',
                '-i', `image${index}.jpg`,
                '-vf', `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=1,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,format=yuv420p`,
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-t', duration.toString(),
                '-pix_fmt', 'yuv420p',
                '-y',
                partName
            ]);
            
            console.log(`Created ${partName}`);
            onProgress?.(40 + (i / imageSequence.length) * 30, `Đang xử lý khung hình ${i + 1}/${imageSequence.length}`);
        }

        onProgress?.(70, 'Đang ghép các đoạn video...');

        // Tạo file concat list
        let concatList = '';
        for (const partFile of partFiles) {
            concatList += `file '${partFile}'\n`;
        }
        await ffmpeg.writeFile('concat_list.txt', concatList);
        console.log('Concat list:', concatList);

        // Ghép các part lại với nhau
        await ffmpeg.exec([
            '-f', 'concat',
            '-safe', '0',
            '-i', 'concat_list.txt',
            '-c', 'copy',
            '-y',
            'video_no_audio.mp4'
        ]);

        console.log('Merged all parts into video_no_audio.mp4');

        onProgress?.(80, 'Đang xử lý âm thanh...');

        // Xử lý âm thanh nếu có
        if (audioFile) {
            console.log('Adding audio...');
            
            // Ghép âm thanh với video
            await ffmpeg.exec([
                '-i', 'video_no_audio.mp4',
                '-i', 'audio.mp3',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-t', targetDuration.toString(),
                '-y',
                'final_output.mp4'
            ]);
            
            console.log('Added audio');
        } else {
            // Không có audio, copy video
            await ffmpeg.exec(['-i', 'video_no_audio.mp4', '-c', 'copy', '-y', 'final_output.mp4']);
        }

        onProgress?.(90, 'Đang hoàn thiện video...');

        // Đọc file kết quả
        const data = await ffmpeg.readFile('final_output.mp4');
        console.log('Final video size:', data.length, 'bytes');

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