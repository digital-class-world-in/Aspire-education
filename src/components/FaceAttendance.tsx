// components/FaceAttendance.tsx
'use client';

import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, set, get, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

interface User {
    id: string;
    name: string;
    role: 'student' | 'staff';
    photoURL: string;
    descriptor: number[];
}

interface DetectionResult {
    name: string;
    role: string;
    confidence: number;
}

const FaceAttendance: React.FC<{ instituteId: string }> = ({ instituteId }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [borderColor, setBorderColor] = useState('#e5e7eb');

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessing = useRef(false);

    // Load Models
    useEffect(() => {
        const load = async () => {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
        };
        load();
    }, []);

    // Load All Users (Realtime)
    useEffect(() => {
        if (!instituteId) return;
        const usersRef = ref(db, `Institutes/${instituteId}/users`);
        const unsubscribe = onValue(usersRef, (snap) => {
            const data = snap.val();
            const users: User[] = data
                ? Object.entries(data).map(([id, u]: any) => ({ id, ...u }))
                : [];
            setAllUsers(users);
        });
        return () => unsubscribe();
    }, [instituteId]);

    // Start Camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
            setStatusMessage('');
        } catch {
            setStatusMessage('Camera permission denied');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsScanning(false);
        setDetection(null);
    };

    // Find Best Match
    const findBestMatch = (descriptor: Float32Array) => {
        let best: User | null = null;
        let minDist = Infinity;

        allUsers.forEach((user) => {
            if (!user.descriptor?.length) return;
            const userDesc = new Float32Array(user.descriptor);
            const dist = faceapi.euclideanDistance(descriptor, userDesc);
            if (dist < minDist) {
                minDist = dist;
                best = user;
            }
        });

        return { user: best, distance: minDist };
    };

    // Mark Attendance (Prevents duplicates)
    const markAttendance = async (user: User) => {
        const today = new Date().toISOString().split('T')[0];
        const attRef = ref(db, `attendance/${instituteId}/${today}/${user.id}`);

        const snap = await get(attRef);
        if (snap.exists()) {
            setStatusMessage('Already Marked Today');
            return;
        }

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        await set(attRef, {
            userId: user.id,
            name: user.name,
            role: user.role,
            date: today,
            time,
            method: 'face',
            status: 'present',
        });

        setStatusMessage('Attendance Marked Successfully');
    };

    // Auto Scan Every 2.5s
    const processFrame = async () => {
        if (!modelsLoaded || !videoRef.current || isProcessing.current || allUsers.length === 0) return;
        isProcessing.current = true;

        try {
            const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416 });
            const results = await faceapi
                .detectAllFaces(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptors();

            const canvas = canvasRef.current;
            if (canvas && videoRef.current) {
                const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
                faceapi.matchDimensions(canvas, displaySize);
                const resized = faceapi.resizeResults(results, displaySize);
                faceapi.draw.drawDetections(canvas, resized);
            }

            if (results.length === 0) {
                setDetection(null);
                setBorderColor('#e5e7eb');
                setStatusMessage('');
                isProcessing.current = false;
                return;
            }

            const { descriptor } = results[0];
            const { user, distance } = findBestMatch(descriptor);

            if (user && distance < 0.6) {
                const confidence = Math.max(10, Math.round(100 - distance * 170));
                setDetection({ name: user.name, role: user.role, confidence });
                setBorderColor('#10b981');
                setStatusMessage('');

                await markAttendance(user);
            } else {
                setDetection(null);
                setBorderColor('#ef4444');
                setStatusMessage('Face Not Recognized');
            }
        } catch (e) {
            console.error(e);
        }

        isProcessing.current = false;
    };

    // Start Auto Scan on Video Play
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(processFrame, 2500);
            setIsScanning(true);
        };

        video.addEventListener('play', onPlay);
        return () => {
            video.removeEventListener('play', onPlay);
            stopCamera();
        };
    }, [modelsLoaded, allUsers]);

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
                <h2 className="text-3xl font-bold">Face Attendance</h2>
                <p className="text-blue-100 mt-1">Auto-scan every 2.5 seconds • TinyFaceDetector</p>
            </div>

            <div className="relative">
                {!modelsLoaded ? (
                    <div className="h-[480px] flex items-center justify-center bg-gray-50 text-xl">
                        Loading AI Models...
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full"
                            width="640"
                            height="480"
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        />

                        {/* Live Overlay */}
                        {detection && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-8 py-4 rounded-2xl flex items-center gap-6 shadow-2xl">
                                <div>
                                    <div className="text-2xl font-bold">{detection.name}</div>
                                    <div className="text-[14px] opacity-75">
                                        {detection.role.toUpperCase()} • {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-4xl text-green-400">✓</div>
                                <div className="bg-green-500/20 px-4 py-1 rounded-xl text-[14px] font-medium">
                                    {detection.confidence}% Match
                                </div>
                            </div>
                        )}

                        {/* Status Messages */}
                        {statusMessage && (
                            <div
                                className={`absolute top-6 left-1/2 -translate-x-1/2 px-8 py-3 rounded-2xl text-[14px] font-medium shadow-xl ${statusMessage.includes('Success') || statusMessage.includes('Marked')
                                        ? 'bg-green-600 text-white'
                                        : 'bg-red-600 text-white'
                                    }`}
                            >
                                {statusMessage}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Camera Border Indicator */}
            <div
                className="h-2 transition-all duration-300"
                style={{ backgroundColor: borderColor }}
            />

            <div className="p-6 flex gap-4">
                <button
                    onClick={startCamera}
                    disabled={!modelsLoaded}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-semibold text-lg transition disabled:opacity-50"
                >
                    {isScanning ? 'Scanning Active' : 'Start Camera & Auto-Scan'}
                </button>

                {isScanning && (
                    <button
                        onClick={stopCamera}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-semibold text-lg transition"
                    >
                        Stop Camera
                    </button>
                )}
            </div>

            <p className="text-center text-[14px] text-black pb-6">
                Position your face in the center • Works in low light
            </p>
        </div>
    );
};

export default FaceAttendance;
