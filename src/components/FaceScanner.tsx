"use client"

import { useEffect, useRef, useState } from "react"
import * as faceapi from "@vladmandic/face-api"
import { Button } from "@/components/ui/button"
import { Loader2, Camera, CheckCircle2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirebase } from "@/firebase"
import { ref, set } from "firebase/database"
import { format } from "date-fns"
import { useResolvedId } from "@/hooks/use-resolved-id"

interface FaceScannerProps {
  userId: string
  userName: string
  userPhotoUrl: string
  role: "Student" | "Staff"
}

export function FaceScanner({ userId, userName, userPhotoUrl, role }: FaceScannerProps) {
  const { database } = useFirebase()
  const { resolvedId } = useResolvedId()
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [isModelsLoaded, setIsModelsLoaded] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isMatched, setIsMatched] = useState(false)
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null)

  useEffect(() => {
    const loadModelsAndReference = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/"
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setIsModelsLoaded(true)

        if (userPhotoUrl) {
          const img = await faceapi.fetchImage(userPhotoUrl)
          const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
          if (detection) {
            setReferenceDescriptor(detection.descriptor)
          } else {
            toast({ variant: "destructive", title: "Setup Error", description: "Could not detect a face in your profile photo." })
          }
        }
      } catch (err) {
        console.error("Model load error", err)
      }
    }
    loadModelsAndReference()
  }, [userPhotoUrl])

  const startCamera = async () => {
    if (!navigator.mediaDevices || !referenceDescriptor) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsScanning(true)
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Please allow camera access." })
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
    }
    setIsScanning(false)
  }

  const handleVideoPlay = () => {
    if (!videoRef.current || !referenceDescriptor) return

    const interval = setInterval(async () => {
      if (!isScanning || isMatched || !videoRef.current) {
        clearInterval(interval)
        return
      }

      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor()
      if (detection) {
        const distance = faceapi.euclideanDistance(detection.descriptor, referenceDescriptor)
        if (distance < 0.6) {
          clearInterval(interval)
          handleMatchSuccess()
        }
      }
    }, 1000)
  }

  const handleMatchSuccess = async () => {
    setIsMatched(true)
    stopCamera()
    toast({ title: "Face Verified!", description: "Attendance recorded successfully." })
    
    if (database && resolvedId) {
      const dateStr = format(new Date(), "yyyy-MM-dd")
      const logRef = ref(database, `Institutes/${resolvedId}/face-attendance/${dateStr}/${role}/${userId}`)
      await set(logRef, {
        userName,
        userPhotoUrl,
        timestamp: new Date().toISOString(),
        verified: true
      })
      
      const legacyAttRef = ref(database, `Institutes/${resolvedId}/attendance/${role}/${dateStr}/${userId}`)
      await set(legacyAttRef, {
        status: "Present",
        remarks: "Face ID Verified"
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md mx-auto p-8 bg-white rounded-[32px] shadow-xl border border-zinc-100 font-public-sans text-black">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black tracking-tight text-black">Face Scan</h3>
        <p className="text-[14px] text-black font-medium tracking-widest">Position your face clearly</p>
      </div>

      <div className="relative w-full aspect-square bg-zinc-50 rounded-3xl overflow-hidden flex items-center justify-center border border-zinc-100 shadow-inner">
        {!isModelsLoaded ? (
          <div className="flex flex-col items-center text-primary">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <span className="text-[10px] font-black tracking-widest text-black">Loading AI...</span>
          </div>
        ) : isMatched ? (
          <div className="flex flex-col items-center text-emerald-500 animate-in zoom-in duration-500 p-4 w-full h-full relative">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center">
               <CheckCircle2 className="w-48 h-48 text-emerald-500" />
            </div>
            <div className="relative z-10 flex flex-col items-center w-full h-full justify-center">
              <div className="w-24 h-24 mb-3 rounded-full overflow-hidden border-4 border-emerald-100 shadow-md">
                <img src={userPhotoUrl} alt={userName} className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-black tracking-tight text-black mb-1 text-center leading-tight">{userName}</span>
              <span className="text-[10px] font-black tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-2">Verified {role}</span>
              <span className="text-[11px] font-bold text-black bg-zinc-50 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-inner border border-zinc-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {format(new Date(), "dd MMM yyyy, hh:mm a")}
              </span>
            </div>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              onPlay={handleVideoPlay}
              className={`w-full h-full object-cover transform scale-x-[-1] ${!isScanning ? 'hidden' : ''}`} 
            />
            {!isScanning && (
              <div className="flex flex-col items-center justify-center text-zinc-300">
                <Camera className="w-16 h-16 mb-4 opacity-50" />
                {!referenceDescriptor && <span className="text-[10px] text-rose-400 font-bold tracking-widest max-w-[200px] text-center">Missing Profile Photo</span>}
              </div>
            )}
          </>
        )}
      </div>

      {!isScanning && !isMatched && isModelsLoaded && (
        <Button 
          onClick={startCamera}
          disabled={!referenceDescriptor}
          className="w-full h-14 bg-primary text-white font-black text-[11px] tracking-widest rounded-2xl shadow-xl hover:opacity-90 transition-all border-none active:scale-95 disabled:bg-zinc-200"
        >
          <Camera className="w-4 h-4 mr-2" /> Start Scanner
        </Button>
      )}
    </div>
  )
}
