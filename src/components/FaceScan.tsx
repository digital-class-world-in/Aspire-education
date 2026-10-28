"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, ScanFace, CheckCircle2, XCircle, UserX, UserCheck, ShieldCheck } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirebase } from "@/firebase"
import { ref, get, set } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface EnrolledFace {
  userId: string
  role: string
  identifier: string
  name: string
  descriptor: Float32Array
}

export function FaceScan() {
  const { database } = useFirebase()
  const { resolvedId, branchId } = useResolvedId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [faceapi, setFaceapi] = useState<any>(null)
  const [isModelsLoaded, setIsModelsLoaded] = useState(false)
  const [isDbLoaded, setIsDbLoaded] = useState(false)
  const [enrolledFaces, setEnrolledFaces] = useState<EnrolledFace[]>([])
  
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [matchStatus, setMatchStatus] = useState<"idle" | "scanning" | "matched" | "unrecognized">("idle")
  const [matchedUser, setMatchedUser] = useState<EnrolledFace | null>(null)
  
  const isScanningRef = useRef(false)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loadApi = async () => {
      if ((window as any).faceapi) {
        setFaceapi((window as any).faceapi)
        return
      }
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js"
      script.async = true
      script.onload = () => setFaceapi((window as any).faceapi)
      document.body.appendChild(script)
    }
    loadApi()
  }, [])

  useEffect(() => {
    if (!faceapi) return
    const loadModels = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/"
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setIsModelsLoaded(true)
      } catch (err) {
        setCameraError("Failed to load AI models.")
      }
    }
    loadModels()
    return () => stopCamera()
  }, [faceapi])

  useEffect(() => {
    if (!database || !resolvedId) return
    const fetchFaces = async () => {
      try {
        const snapshot = await get(ref(database, `Institutes/${resolvedId}/face-descriptors`))
        const data = snapshot.val()
        if (data) {
          const faces: EnrolledFace[] = []
          Object.keys(data).forEach(uid => {
             const user = data[uid]
             if (user.descriptor) {
                const descriptorArray = Array.isArray(user.descriptor) ? user.descriptor : Object.values(user.descriptor)
                faces.push({
                   userId: uid,
                   role: user.role || "Student",
                   identifier: user.identifier || "N/A",
                   name: user.name || "Unknown",
                   descriptor: new Float32Array(descriptorArray as number[])
                })
             }
          })
          setEnrolledFaces(faces)
        }
        setIsDbLoaded(true)
      } catch (err) {
        toast({ variant: "destructive", title: "Sync Error" })
      }
    }
    fetchFaces()
  }, [database, resolvedId])

  const startCamera = async () => {
    setCameraError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      if (videoRef.current) {
         videoRef.current.srcObject = stream
         setIsCameraActive(true)
         setMatchStatus("scanning")
      }
    } catch (err) {
      setCameraError("Camera access denied.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
    }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    setIsCameraActive(false)
    setMatchStatus("idle")
    isScanningRef.current = false
  }

  const findBestMatch = (descriptor: Float32Array) => {
    if (!faceapi) return null
    let bestMatch = null
    let minDistance = 0.55 // Strict threshold
    enrolledFaces.forEach(face => {
      const distance = faceapi.euclideanDistance(descriptor, face.descriptor)
      if (distance < minDistance) {
        minDistance = distance
        bestMatch = face
      }
    })
    return bestMatch
  }

  const markAttendance = async (user: EnrolledFace) => {
    if (!database || !resolvedId) return
    const dateStr = format(new Date(), "yyyy-MM-dd")
    const timeStr = format(new Date(), "hh:mm a")
    try {
      const logPath = `Institutes/${resolvedId}/face-attendance-logs/${dateStr}/${user.userId}`
      const existingLog = await get(ref(database, logPath))
      if (existingLog.exists()) {
         toast({ title: "Session Active", description: `${user.name} already verified today.` })
         return
      }

      await set(ref(database, logPath), {
         name: user.name,
         identifier: user.identifier,
         role: user.role,
         timestamp: new Date().toISOString(),
         time: timeStr,
         branchId: branchId || "main"
      })

      let standardPath = user.role === "Staff" 
        ? `Institutes/${resolvedId}/attendance/Staff/${dateStr}/${user.userId}`
        : `Institutes/${resolvedId}/attendance/Student_Direct/${dateStr}/${user.userId}`

      await set(ref(database, standardPath), {
         status: "Present",
         remarks: "Biometric Verified",
         updatedAt: Date.now()
      })
      toast({ title: "Authorized", description: `Identity Verified: ${user.name}` })
    } catch (err) {
       toast({ variant: "destructive", title: "Sync Failed" })
    }
  }

  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded || !isDbLoaded || !faceapi) return
    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight }
    faceapi.matchDimensions(canvasRef.current, displaySize)
    
    scanIntervalRef.current = setInterval(async () => {
      if (isScanningRef.current || (matchStatus as any) === "matched") return
      if (!videoRef.current) return
      isScanningRef.current = true
      try {
        const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor()
        const canvas = canvasRef.current
        if (canvas && detection) {
           const resized = faceapi.resizeResults(detection, displaySize)
           canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
           faceapi.draw.drawDetections(canvas, resized)
           const match = findBestMatch(detection.descriptor)
           if (match) {
              setMatchStatus("matched")
              setMatchedUser(match as EnrolledFace)
              await markAttendance(match as EnrolledFace)
              setTimeout(() => {
                 setMatchStatus("scanning")
                 setMatchedUser(null)
                 canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
              }, 4000)
           } else {
              setMatchStatus("unrecognized")
              setTimeout(() => { if (matchStatus !== "matched") setMatchStatus("scanning") }, 2000)
           }
        } else {
          canvas?.getContext('2d')?.clearRect(0, 0, canvas?.width, canvas?.height)
        }
      } catch (err) {} finally { isScanningRef.current = false }
    }, 200)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 font-public-sans">
      <Card className="rounded-[40px] border-none shadow-2xl bg-white overflow-hidden">
         {/* Header */}
         <div className="bg-zinc-950 p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10 flex flex-col items-center">
               <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                  <ScanFace className="w-8 h-8 text-primary" />
               </div>
               <h2 className="text-2xl font-black text-white tracking-tight">AI Attendance Scanner</h2>
               <p className="text-black font-medium text-[14px] mt-2">Position face in frame for automatic detection.</p>
            </div>
         </div>

         {/* Status Bar */}
         <div className="bg-zinc-50 border-y border-zinc-100 p-4 flex justify-between items-center px-10">
            <div className="flex items-center gap-4">
               <StatusBadge active={isDbLoaded} label={`DB Sync (${enrolledFaces.length})`} />
               <StatusBadge active={isModelsLoaded} label="Neural Nets Ready" />
            </div>
            {isCameraActive && (
               <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-primary animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" /> System Active
               </div>
            )}
         </div>

         {/* Scan Area */}
         <div className="p-10 bg-white">
            <div className={cn(
              "relative w-full max-w-2xl mx-auto aspect-[4/3] rounded-[40px] overflow-hidden shadow-2xl border-4 transition-all duration-500",
              matchStatus === "matched" ? "border-emerald-500 shadow-emerald-500/20 scale-[1.02]" : 
              matchStatus === "unrecognized" ? "border-rose-500" : "border-zinc-100"
            )}>
               {!isCameraActive ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-black">
                    <ScanFace className="w-20 h-20 mb-4 opacity-10" />
                    <p className="text-[10px] font-black tracking-widest">Scanner Standby</p>
                 </div>
               ) : (
                 <>
                   <video ref={videoRef} autoPlay muted playsInline onPlay={handleVideoPlay} className="w-full h-full object-cover transform scale-x-[-1]" />
                   <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none transform scale-x-[-1]" />
                 </>
               )}

               {matchStatus === "matched" && matchedUser && (
                  <div className="absolute inset-x-6 bottom-6 bg-white/95 backdrop-blur-xl rounded-3xl p-6 flex items-center justify-between shadow-2xl shadow-black/20 border border-emerald-100 animate-in slide-in-from-bottom-8 duration-500">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                           <UserCheck className="w-7 h-7" />
                        </div>
                        <div>
                           <h4 className="text-xl font-black text-black tracking-tight leading-none mb-1.5">{matchedUser.name}</h4>
                           <p className="text-[14px] text-black font-bold tracking-widest">{matchedUser.role} • {matchedUser.identifier}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-4 py-1.5 rounded-full tracking-widest">Marked Present</span>
                        <p className="text-[14px] font-bold text-black mt-2.5">{format(new Date(), "hh:mm a")}</p>
                     </div>
                  </div>
               )}

               {matchStatus === "unrecognized" && (
                  <div className="absolute inset-x-6 bottom-6 bg-rose-500/90 backdrop-blur-md text-white rounded-3xl p-6 flex items-center gap-5 shadow-2xl animate-in slide-in-from-bottom-8">
                     <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <UserX className="w-7 h-7" />
                     </div>
                     <div>
                        <h4 className="text-[14px] font-black tracking-widest mb-1">Access Rejected</h4>
                        <p className="text-[14px] font-medium text-rose-100">Face not recognized in system database.</p>
                     </div>
                  </div>
               )}
            </div>

            <div className="mt-10 flex flex-col items-center gap-6">
               {!isCameraActive ? (
                 <Button onClick={startCamera} disabled={!isModelsLoaded || !isDbLoaded} className="h-16 px-16 rounded-3xl bg-primary text-white font-black text-[14px] tracking-[0.2em] shadow-2xl hover:opacity-90 active:scale-95 transition-all border-none">
                   Start Neural Scan
                 </Button>
               ) : (
                 <Button onClick={stopCamera} variant="outline" className="h-16 px-16 rounded-3xl bg-white border-zinc-200 text-black font-black text-[14px] tracking-[0.2em] hover:bg-zinc-50 transition-all border-none">
                   Halt Scanner
                 </Button>
               )}
               
               <div className="flex items-center gap-3 text-zinc-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[9px] font-black tracking-[0.3em]">Encrypted Session Token</span>
               </div>
            </div>
         </div>
      </Card>
    </div>
  )
}

function StatusBadge({ active, label }: { active: boolean, label: string }) {
  return (
    <span className={cn(
      "flex items-center gap-2 text-[9px] font-black  tracking-widest px-4 py-1.5 rounded-full",
      active ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
    )}>
      {active ? <CheckCircle2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </span>
  )
}
