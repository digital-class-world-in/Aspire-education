import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import { useFirebase } from "@/firebase";
import { doc, getDoc, setDoc, query, collection, where, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CameraScannerProps {
  userId: string;
}

export function CameraScanner({ userId }: CameraScannerProps) {
  const { firestore } = useFirebase();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [userData, setUserData] = useState<any>(null); // from users/

  useEffect(() => {
    const init = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        if (firestore) {
          const userDoc = await getDoc(doc(firestore, "users", userId));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            toast({ variant: "destructive", title: "Error", description: "User not found in Firestore." });
          }
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Initialization error:", err);
        setIsLoading(false);
      }
    };
    init();
  }, [firestore, userId]);

  const startCamera = async () => {
    if (!navigator.mediaDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Camera access denied." });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    setIsScanning(false);
  };

  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current || !userData?.faceDescriptor) return;

    // Convert stored array back to Float32Array
    const referenceDescriptor = new Float32Array(userData.faceDescriptor);

    const displaySize = { 
      width: videoRef.current.videoWidth, 
      height: videoRef.current.videoHeight 
    };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    const interval = setInterval(async () => {
      if (!isScanning || isMatched || !videoRef.current || !canvasRef.current) {
        clearInterval(interval);
        return;
      }

      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                    .withFaceLandmarks()
                                    .withFaceDescriptor();

      if (detection) {
        // Draw bounding box
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetection);
        }

        const distance = faceapi.euclideanDistance(detection.descriptor, referenceDescriptor);
        if (distance < 0.5) {
          clearInterval(interval);
          await markAttendance();
        }
      } else {
        // Clear canvas if no face
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }, 500);
  };

  const markAttendance = async () => {
    setIsMatched(true);
    stopCamera();

    if (!firestore || !userData) return;

    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      
      // Prevent duplicates
      const attQuery = query(
        collection(firestore, "attendance"),
        where("userId", "==", userId),
        where("date", "==", dateStr)
      );
      
      const snaps = await getDocs(attQuery);
      if (!snaps.empty) {
        toast({ title: "Already Marked", description: "Your attendance was already marked today." });
        return;
      }

      const timeStr = format(new Date(), "HH:mm:ss");
      const recordId = `${userId}_${dateStr}`;
      
      await setDoc(doc(firestore, "attendance", recordId), {
        id: recordId,
        userId: userId,
        name: userData.name,
        role: userData.role,
        date: dateStr,
        time: timeStr,
        status: "Present",
        photoURL: userData.photoURL || ""
      });

      toast({ title: "Attendance Marked", description: "Successfully logged your attendance." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to save attendance." });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col items-center max-w-md mx-auto p-6 bg-white rounded-3xl shadow-lg border border-zinc-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black tracking-tight text-black">Face Attendance</h2>
        <p className="text-[14px] text-black font-bold tracking-widest mt-1">Look straight into the camera</p>
      </div>

      <div className="relative w-full aspect-square bg-zinc-50 rounded-2xl overflow-hidden border-2 border-zinc-100 shadow-inner flex items-center justify-center">
        {isMatched && userData ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-emerald-500 animate-in zoom-in p-4 bg-emerald-50/50">
            <CheckCircle2 className="w-16 h-16 mb-4 drop-shadow-sm" />
            <h3 className="text-2xl font-black text-black tracking-tight mb-2 text-center">{userData.name}</h3>
            <div className="flex flex-col items-center gap-1 bg-white p-4 rounded-xl shadow-sm border border-emerald-100 w-full">
               <span className="text-[10px] font-black tracking-widest text-black">Status</span>
               <span className="text-[14px] font-bold text-emerald-600 tracking-widest">Present</span>
               <div className="w-full h-px bg-zinc-100 my-2"></div>
               <span className="text-[10px] font-black tracking-widest text-black">Recorded At</span>
               <span className="text-[14px] font-bold text-black">{format(new Date(), "dd MMM yyyy, hh:mm a")}</span>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              onPlay={handleVideoPlay}
              className={`absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1] ${!isScanning ? 'hidden' : ''}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none ${!isScanning ? 'hidden' : ''}`}
            />
            {!isScanning && (
              <div className="flex flex-col items-center text-zinc-300">
                <Camera className="w-16 h-16 mb-2 opacity-50" />
                {!userData?.faceDescriptor ? (
                  <span className="text-[14px] text-rose-400 font-bold max-w-[200px] text-center">Missing Face Data in Firestore</span>
                ) : (
                  <span className="text-[14px] text-black font-bold">Camera Paused</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {!isScanning && !isMatched && (
        <Button 
          onClick={startCamera} 
          disabled={!userData?.faceDescriptor}
          className="w-full mt-6 h-14 bg-primary text-white font-black tracking-widest rounded-xl hover:opacity-90"
        >
          <Camera className="w-4 h-4 mr-2" /> Start Recognition
        </Button>
      )}
    </div>
  );
}
