"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ScanFace, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  Clock
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, get, set } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const MODEL_URL = "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/"

type ScanStatus = "initializing" | "ready" | "scanning" | "matched" | "already_marked" | "no_descriptor" | "error"

export default function StaffFaceAttendancePage() {
  const router = useRouter()
  const { database } = useFirebase()
  const { resolvedId, staffId, isStaff } = useResolvedId()
  
  const [status, setStatus] = useState<ScanStatus>("initializing")
  const [profileData, setProfileData] = useState<any>(null)
  const [myDescriptor, setMyDescriptor] = useState<Float32Array | null>(null)
  
  // Camera & Face API
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceapiRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)
  
  // Load Dependencies
  useEffect(() => {
    let active = true

    const loadDeps = async () => {
      if (!isStaff || !staffId || !database || !resolvedId) return

      // Load face-api if absent
      if (!(window as any).faceapi) {
        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js"
        script.async = true
        script.onload = () => {
          faceapiRef.current = (window as any).faceapi
          initData()
        }
        document.body.appendChild(script)
      } else {
        faceapiRef.current = (window as any).faceapi
        initData()
      }
    }

    const initData = async () => {
      try {
        const fa = faceapiRef.current
        await Promise.all([
          fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])

        if (!active) return

        // Fetch my profile
        const profSnap = await get(ref(database!, `Institutes/${resolvedId}/employees/${staffId}`))
        if (profSnap.exists()) {
          setProfileData(profSnap.val())
        }

        // Fetch my stored descriptor
        const descSnap = await get(ref(database!, `Institutes/${resolvedId}/face-descriptors/${staffId}`))
        if (descSnap.exists() && descSnap.val().descriptor) {
          const descArr = Array.isArray(descSnap.val().descriptor) 
            ? descSnap.val().descriptor 
            : Object.values(descSnap.val().descriptor)
          setMyDescriptor(new Float32Array(descArr as number[]))
          
          if (active) setStatus("ready")
        } else {
          if (active) setStatus("no_descriptor")
        }

      } catch (err) {
        console.error("Init Error", err)
        if (active) setStatus("error")
      }
    }

    loadDeps()

    return () => {
      active = false
      stopCamera()
    }
  }, [database, resolvedId, staffId, isStaff])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStatus("scanning")
      
      // Wait for video load
      videoRef.current!.onloadeddata = () => {
        scanLoop()
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Camera Access Required" })
      setStatus("error")
    }
  }

  const logAttendance = async () => {
    if (!database || !resolvedId || !staffId || !profileData) return

    const now = new Date()
    const todayKey = format(now, "yyyy-MM-dd")

    const existingRef = ref(database, `Institutes/${resolvedId}/face-attendance-logs/${todayKey}/${staffId}`)
    const existingSnap = await get(existingRef)

    if (existingSnap.exists()) {
      setStatus("already_marked")
      stopCamera()
      return
    }

    // Mark Global Logs
    await set(existingRef, {
      userId: staffId,
      name: `${profileData.firstName} ${profileData.lastName}`,
      role: "staff",
      date: todayKey,
      time: format(now, "hh:mm a"),
      status: "present",
      method: "face",
      timestamp: now.toISOString(),
      identifier: profileData.employeeId || "Staff ID"
    })

    // Mark Payroll/Attendance Module
    await set(ref(database, `Institutes/${resolvedId}/attendance/Staff/${todayKey}/${staffId}`), {
      status: "Present",
      remarks: "Face ID Verified via Portal",
      updatedAt: Date.now()
    })

    setStatus("matched")
    stopCamera()
    toast({ title: "Attendance Marked!" })
  }

  const scanLoop = async () => {
    if (!videoRef.current || !faceapiRef.current || !myDescriptor || status === "matched" || status === "already_marked") return
    
    try {
      const fa = faceapiRef.current
      const detection = await fa.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor()

      if (detection) {
        const queryFloat = new Float32Array(detection.descriptor)
        const dist = fa.euclideanDistance(queryFloat, myDescriptor)
        
        if (dist < 0.55) {
          await logAttendance()
          return // Stop loop
        }
      }
    } catch (e) {}

    rafRef.current = requestAnimationFrame(scanLoop)
  }

  return (
    <main className="flex-1 p-8 animate-in fade-in duration-700 flex flex-col items-center justify-center w-full min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-xl">
            <Button variant="ghost" onClick={() => router.push('/staff/dashboard')} className="mb-6 hover:bg-zinc-100 rounded-xl h-10 px-4 text-[12px] font-bold text-black border border-zinc-200">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>

            <Card className="border-none shadow-2xl rounded-[40px] bg-white overflow-hidden p-8 sm:p-12 relative text-center">
              
              <AnimatePresence mode="wait">
                
                {status === "initializing" && (
                  <motion.div key="init" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 space-y-6">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black tracking-tight text-black">Initializing Module...</h3>
                       <p className="text-zinc-500 font-medium text-[14px]">Loading biometric models and verifying your profile.</p>
                    </div>
                  </motion.div>
                )}

                {status === "no_descriptor" && (
                  <motion.div key="no_desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 space-y-6">
                    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <XCircle className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black tracking-tight text-black">Biometric Profile Missing</h3>
                       <p className="text-zinc-500 font-medium text-[14px]">Your face data has not been registered yet. Please contact the administrator or HR to setup your neural descriptor.</p>
                    </div>
                  </motion.div>
                )}

                {status === "ready" && (
                  <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-10 space-y-10">
                    <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto shadow-inner relative">
                       <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                       <ScanFace className="w-12 h-12 relative z-10" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-3xl font-black tracking-tight text-black">Ready to Scan</h3>
                       <p className="text-zinc-500 font-medium text-[14px]">Ensure you are in a well-lit area and look directly into the camera.</p>
                    </div>
                    <Button onClick={startCamera} className="h-14 px-10 bg-primary text-white font-black text-[14px] tracking-widest rounded-2xl shadow-xl w-full sm:w-auto hover:scale-105 transition-all">
                      START SCANNER
                    </Button>
                  </motion.div>
                )}

                {status === "scanning" && (
                  <motion.div key="scan" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <div className="relative aspect-[4/3] rounded-[32px] overflow-hidden bg-black ring-8 ring-primary/20 shadow-2xl mb-8">
                       <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                       
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-48 h-48 rounded-full border-2 border-primary/50 border-dashed animate-[spin_10s_linear_infinite] shadow-[0_0_30px_rgba(37,99,235,0.3)_inset]" />
                         <div className="absolute left-0 right-0 h-[4px] bg-primary/60 shadow-[0_0_20px_#2563eb] animate-[scan_2.5s_ease-in-out_infinite]" />
                       </div>
                    </div>
                    <p className="text-[14px] font-bold text-zinc-500 tracking-widest uppercase animate-pulse">Running Neural Recognition...</p>
                  </motion.div>
                )}

                {status === "matched" && (
                  <motion.div key="matched" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-12 space-y-8">
                    <div className="relative mx-auto w-32 h-32">
                       <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                       <div className="w-32 h-32 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                         <CheckCircle2 className="w-16 h-16" />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-3xl font-black tracking-tight text-emerald-600">Identity Verified</h3>
                       <p className="text-zinc-600 font-bold text-[16px]">{profileData?.firstName} {profileData?.lastName}</p>
                       <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20">
                         <Clock className="w-5 h-5 text-emerald-600" />
                         <span className="text-emerald-600 font-black tracking-widest">{format(new Date(), "hh:mm a")}</span>
                       </div>
                       <p className="text-emerald-600/70 text-[12px] font-bold tracking-widest uppercase block mt-4">Attendance securely logged in Payroll module.</p>
                    </div>
                  </motion.div>
                )}

                {status === "already_marked" && (
                  <motion.div key="already" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-12 space-y-8">
                    <div className="w-32 h-32 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <ShieldCheck className="w-16 h-16" />
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-3xl font-black tracking-tight text-amber-600">Already Marked</h3>
                       <p className="text-zinc-600 font-bold text-[16px] max-w-xs mx-auto">You have already marked your attendance for today.</p>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

            </Card>
          </div>
    </main>
  )
}
