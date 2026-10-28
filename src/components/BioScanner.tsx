"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScanFace, CheckCircle2, XCircle, Loader2, AlertCircle, Camera } from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, get, set, update, push } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useFaceApi } from "@/hooks/useFaceApi"

export interface BioScannerProps {
  role: "Student" | "Staff"
  userId: string
  userName: string
  groupId?: string // course name or dept
  onSuccess?: () => void
}

export function BioScanner({ role, userId, userName, groupId, onSuccess }: BioScannerProps) {
  const { database } = useFirebase()
  const { resolvedId } = useResolvedId()
  const { faceapi, isLoaded: modelsLoaded, error: modelsError } = useFaceApi()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState("")
  
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null)
  const [isConfiguring, setIsConfiguring] = useState(true)
  const [setupError, setSetupError] = useState("")
  
  const [scanStatus, setScanStatus] = useState<"scanning" | "matched" | "unrecognized" | "saving">("scanning")
  const [isScanComplete, setIsScanComplete] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  
  const scanIntervalId = useRef<any>(null)

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  // 1. Fetch reference descriptor
  useEffect(() => {
    if (!database || !resolvedId || !userId) return
    const fetchDescriptor = async () => {
      try {
        const snap = await get(ref(database, `Institutes/${resolvedId}/face-descriptors/${userId}`))
        if (snap.exists() && snap.val().descriptor) {
          setReferenceDescriptor(new Float32Array(snap.val().descriptor))
          setProfileData(snap.val())
        } else {
          setSetupError("Biometric profile not enrolled. Please configure your Face ID first.")
        }
      } catch (err) {
        setSetupError("Failed to load biometric profile.")
      } finally {
        setIsConfiguring(false)
      }
    }
    fetchDescriptor()
  }, [database, resolvedId, userId])

  // 2. Start Camera
  const startCamera = async () => {
    setCameraError("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not supported on this browser/device.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (err) {
      setCameraError("Camera permission denied. Please allow camera access.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
    }
    setIsCameraActive(false)
    if (scanIntervalId.current) clearInterval(scanIntervalId.current)
  }

  // 3. Auto-start camera when models & descriptors are ready
  useEffect(() => {
    if (modelsLoaded && referenceDescriptor && !setupError && !isScanComplete) {
      startCamera()
    }
    return () => stopCamera()
  }, [modelsLoaded, referenceDescriptor, setupError, isScanComplete])

  // 4. Verification Loop
  useEffect(() => {
    if (isCameraActive && modelsLoaded && referenceDescriptor && scanStatus === "scanning") {
      scanIntervalId.current = setInterval(async () => {
        if (!videoRef.current || scanStatus !== "scanning") return
        
        try {
          const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor()
          
          if (detection) {
            const distance = faceapi.euclideanDistance(referenceDescriptor, detection.descriptor)
            // 0.6 is typical threshold. Lower is stricter.
            if (distance < 0.55) {
              clearInterval(scanIntervalId.current)
              handleSuccessfulMatch()
            } else {
              setScanStatus("unrecognized")
              // Reset to scanning after 2 seconds
              setTimeout(() => { if (!isScanComplete) setScanStatus("scanning") }, 2000)
            }
          }
        } catch (err) {
          console.error("Face detection error during loop", err)
        }
      }, 1000) // Scan every second
    }

    return () => {
      if (scanIntervalId.current) clearInterval(scanIntervalId.current)
    }
  }, [isCameraActive, modelsLoaded, referenceDescriptor, scanStatus, isScanComplete])

  const handleSuccessfulMatch = async () => {
    setScanStatus("saving")
    stopCamera()
    
    if (!database || !resolvedId) return
    
    try {
      // Mark Attendance
      const batchKey = groupId || "General"
      const path = `Institutes/${resolvedId}/attendance/${role}/${today}/${batchKey}/${userId}`
      
      const payload = {
        studentName: userName, // works for both staff/student generically
        status: "Present",
        remarks: "BioScan Auto",
        updatedAt: new Date().toISOString()
      }
      
      const logRef = push(ref(database, `Institutes/${resolvedId}/face-attendance-logs/${today}`))
      const logPayload = {
        userId,
        name: profileData?.name || userName,
        identifier: profileData?.identifier || "Unknown",
        role,
        time: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        branchId: profileData?.branchId || "main"
      }

      await Promise.all([
        set(ref(database, path), payload),
        set(logRef, logPayload)
      ])

      setIsScanComplete(true)
      setScanStatus("matched")
      if (onSuccess) onSuccess()
    } catch (err) {
      setSetupError("Failed to save attendance record.")
      setScanStatus("scanning")
      startCamera()
    }
  }

  if (isConfiguring || !modelsLoaded) {
    return (
      <Card className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center text-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div>
            <h3 className="font-black text-black tracking-tight">Initializing BioScan</h3>
            <p className="text-[14px] font-bold text-black tracking-widest mt-1">Loading AI Models...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (setupError || modelsError) {
    return (
      <Card className="rounded-[32px] border border-rose-100 shadow-sm bg-rose-50 overflow-hidden p-8 flex flex-col items-center justify-center min-h-[300px]">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-4" />
        <h3 className="font-black text-rose-700 tracking-tight mb-2">BioScan Unavailable</h3>
        <p className="text-[14px] font-bold text-rose-600/80 mb-6 max-w-sm text-center">{setupError || String(modelsError)}</p>
        {!referenceDescriptor && !modelsError && (
           <Button onClick={() => window.location.href=`/${role.toLowerCase()}/attendance/setup`} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black tracking-widest text-[10px] h-12 shadow-lg transition-all active:scale-95">Configure Face ID Now</Button>
        )}
      </Card>
    )
  }

  if (isScanComplete) {
    return (
      <Card className="rounded-[32px] border-none shadow-lg bg-emerald-500 overflow-hidden p-10 flex flex-col items-center justify-center text-white relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
        <CheckCircle2 className="w-16 h-16 mb-4 drop-shadow-md" />
        <h3 className="text-2xl font-black tracking-tight mb-2 drop-shadow-md">Access Granted</h3>
        <p className="font-bold text-emerald-100 tracking-widest text-[14px]">Attendance Marked for {today}</p>
      </Card>
    )
  }

  return (
    <Card className="rounded-[32px] border-none shadow-xl bg-zinc-950 overflow-hidden p-0 relative">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <ScanFace className="w-5 h-5 text-emerald-400" />
        <span className="text-[10px] font-black tracking-widest text-zinc-300">BioScan Active</span>
      </div>

      <div className="relative w-full aspect-video md:aspect-[21/9] bg-zinc-900 overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-8 text-center">
            <XCircle className="w-10 h-10 text-rose-500 mb-4" />
            <p className="text-[14px] font-bold text-black mb-4">{cameraError}</p>
            <Button onClick={startCamera} className="bg-white text-black hover:bg-zinc-200 rounded-xl font-black text-[10px] tracking-widest border-none">Retry Camera</Button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            {/* Scanner Overlay UI */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className={cn("w-48 h-48 md:w-64 md:h-64 border-4 border-dashed rounded-[40px] transition-all duration-500", 
                 scanStatus === "scanning" ? "border-emerald-400/50 animate-[spin_8s_linear_infinite]" : 
                 scanStatus === "unrecognized" ? "border-rose-500/80 scale-105" : "border-emerald-400 scale-95"
               )} />
            </div>

            {scanStatus === "unrecognized" && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-full font-black text-[11px] tracking-widest shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                Face Not Recognized
              </div>
            )}
            {scanStatus === "scanning" && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-md text-emerald-400 px-6 py-3 rounded-full font-black text-[10px] tracking-widest animate-pulse border border-zinc-800">
                Align Face Continuously
              </div>
            )}
            {scanStatus === "saving" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                <div className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black text-[11px] tracking-widest">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Marking Register...
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
