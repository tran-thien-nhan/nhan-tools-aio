// src/app/video-creator/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import VideoCreator from '../_components/VideoCreator';

export default function VideoCreatorPage() {
    const router = useRouter();

    return <VideoCreator onBack={() => router.push('/')} />;
}