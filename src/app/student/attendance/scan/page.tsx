"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ScanFace, Loader2, CheckCircle2, ShieldCheck,
  XCircle, AlertCircle, User, Fingerprint,
  ArrowLeft, RefreshCw, CameraOff
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, set, get } from "firebase/database"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { useRouter } from "next/navigation"

const MODEL_URL = "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/"
const GLASS = "backdrop-blur-xl bg-white/5 border border-white/10"
const GLASS_CARD = "backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-3xl"
const MATCH_THRESHOLD = 0.55

type AppPhase = "booting" | "active" | "matched" | "already" | "error" | "camera_error" | "no_profile"

interface StudentData {
  id: string
  studentName: string
  fatherName: string
  studentPhotoUrl: string
  course: string
  section: string
  batch: string
  rollNo: string
  mobile: string
}

export default function StudentFaceScanPage() {
  const { database } = useFirebase()
  const { resolvedId, staffId: studentId } = useResolvedId()
  const router = useRouter()

  const [phase, setPhase] = useState<AppPhase>("booting")
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [student, setStudent] = useState<StudentData | null>(null)
  const [studentDesc, setStudentDesc] = useState<number[] | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"pending" | "syncing" | "success" | "error">("pending")
  
  const [statusText, setStatusText] = useState("Initializing neural engine...")
  const [errorText, setErrorText] = useState("")
  const [showMismatchError, setShowMismatchError] = useState(false)

  const faceapi = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const scanActiveRef = useRef(false)
  const mismatchStartTimeRef = useRef<number | null>(null)

  // ─── 1. BOOT ENGINE ───
  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      if (!(window as any).faceapi) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js"
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Script load failed"))
          document.body.appendChild(script)
        })
      }
      if (cancelled) return
      faceapi.current = (window as any).faceapi
      const fa = faceapi.current
      await Promise.all([
        fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      if (cancelled) return
      setModelsLoaded(true)
      setPhase("active")
    }
    boot().catch(() => {
      if (!cancelled) {
        setErrorText("Failed to initialize biometric models.")
        setPhase("error")
      }
    })
    return () => { cancelled = true }
  }, [])

  // ─── 2. DATA FETCHING ───
  useEffect(() => {
    if (!database || !resolvedId || !studentId || phase !== "active") return
    const fetchStudent = async () => {
      try {
        let snap = await get(ref(database, `Institutes/${resolvedId}/admissions/${studentId}`))
        let data = snap.val()
        if (!data) {
          snap = await get(ref(database, `Institutes/${resolvedId}/students/${studentId}`))
          data = snap.val()
        }
        if (data) setStudent({ ...data, id: studentId })
        else { setErrorText("Student profile not found."); setPhase("error"); }
      } catch (e) { setErrorText("Database connection failed."); setPhase("error"); }
    }
    fetchStudent()
  }, [database, resolvedId, studentId, phase])

  // ─── 3. SYNC & CAMERA ───
  useEffect(() => {
    if (phase !== "active" || !student || !database || !resolvedId || !faceapi.current) return
    let cancelled = false

    const startCamera = async () => {
      setStatusText("Connecting to camera device...")
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadeddata = () => { if (!cancelled) setCameraActive(true); }
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrorText(e.name === "NotAllowedError" ? "Camera access denied." : "Webcam device not detected.")
          setPhase("camera_error")
        }
      }
    }

    const syncBiometrics = async () => {
      setSyncStatus("syncing")
      setStatusText("Verifying biometric signature from portal...")
      try {
        const snap = await get(ref(database, `Institutes/${resolvedId}/face-descriptors/${student.id}`))
        const existing = snap.val()
        if (existing?.descriptor) {
          const desc = Array.isArray(existing.descriptor) ? existing.descriptor : Object.values(existing.descriptor) as number[]
          if (!cancelled) { setStudentDesc(desc); setSyncStatus("success"); }
          return
        }

        // NO SETUP FOUND? Fallback to portal photo
        const photoUrl = student?.studentPhotoUrl || (student as any)?.photoUrl || (student as any)?.profilePicture || (student as any)?.image
        if (!photoUrl) {
          if (!cancelled) {
            setSyncStatus("error")
            setErrorText("No profile photo found in your portal.")
            setPhase("no_profile")
          }
          return
        }

        setStatusText("Fetching face data from Firebase storage...")
        const img = new Image(); img.crossOrigin = "anonymous"; img.src = photoUrl
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("CORS")) })
        const det = await faceapi.current.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        if (det && !cancelled) {
          const generatedDesc = Array.from(det.descriptor) as number[]
          setStudentDesc(generatedDesc)
          await set(ref(database, `Institutes/${resolvedId}/face-descriptors/${student.id}`), {
            descriptor: generatedDesc, name: student.studentName, role: "Student", updatedAt: Date.now(), imageUrl: photoUrl,
          })
          setSyncStatus("success")
        } else if (!cancelled) {
          setSyncStatus("error")
          setErrorText("Could not detect a face in your portal photo.")
          setPhase("no_profile")
        }
      } catch (e) { if (!cancelled) { setSyncStatus("error"); setErrorText("Biometric sync failed."); setPhase("no_profile"); } }
    }

    syncBiometrics(); startCamera()
    return () => { cancelled = true }
  }, [phase, student, database, resolvedId])

  // ─── 4. SCANNING LOOP ───
  useEffect(() => {
    if (phase !== "active" || !cameraActive || !studentDesc || !videoRef.current || !faceapi.current || showMismatchError) return
    const fa = faceapi.current; scanActiveRef.current = true
    setStatusText("Face signature active. Verifying portal match...")
    const scan = async () => {
      if (!scanActiveRef.current || !videoRef.current) return
      try {
        const detection = await fa.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor()
        if (detection) {
          const query = new Float32Array(detection.descriptor); const stored = new Float32Array(studentDesc)
          const distance = fa.euclideanDistance(query, stored)
          
          if (distance < MATCH_THRESHOLD) {
            scanActiveRef.current = false
            mismatchStartTimeRef.current = null
            const now = new Date(); const todayKey = format(now, "yyyy-MM-dd")
            const batchKey = student?.batch || "Regular Batch"
            const attRef = ref(database, `Institutes/${resolvedId}/attendance/Student/${todayKey}/${batchKey}/${studentId}`)
            const snap = await get(attRef)
            if (snap.exists() && snap.val().status === "Present") { setPhase("already") }
            else {
              setPhase("matched")
              await set(attRef, { status: "Present", remarks: "Face ID Verified", time: format(now, "hh:mm a"), updatedAt: Date.now() })
              const photoUrl = student?.studentPhotoUrl || (student as any)?.photoUrl || (student as any)?.profilePicture || (student as any)?.image || ""
              
              await set(ref(database, `Institutes/${resolvedId}/face-attendance-logs/${todayKey}/${studentId}`), {
                userId: studentId, name: student?.studentName, role: "Student", date: todayKey, time: format(now, "hh:mm a"),
                status: "present", method: "face", timestamp: now.toISOString(), identifier: "Student ID",
                photoUrl: photoUrl
              })
            }
            return
          } else {
            // Face detected but NOT matched
            if (mismatchStartTimeRef.current === null) {
              mismatchStartTimeRef.current = Date.now()
            } else if (Date.now() - mismatchStartTimeRef.current > 5000) {
              setShowMismatchError(true)
              scanActiveRef.current = false
              return
            }
          }
        } else {
          // No face detected, reset mismatch timer
          mismatchStartTimeRef.current = null
        }
      } catch (e) {}
      if (scanActiveRef.current) rafRef.current = requestAnimationFrame(scan)
    }
    scan()
    return () => { scanActiveRef.current = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [phase, cameraActive, studentDesc, showMismatchError])

  const stopCamera = useCallback(() => {
    scanActiveRef.current = false; if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setCameraActive(false)
  }, [])
  useEffect(() => { return () => stopCamera() }, [stopCamera])

  return (
    <div className="min-h-screen bg-[#020817] text-white font-public-sans relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div className={cn("sticky top-0 z-50 border-b border-white/5 shadow-2xl", GLASS)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
             <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]"><ScanFace className="w-5 h-5" /></div>
             <div><h1 className="text-[14px] sm:text-[15px] font-bold tracking-tight">Identity Engine</h1><p className="text-[10px] text-violet-400 font-bold uppercase tracking-[0.2em]">{phase.toUpperCase()}</p></div>
          </div>
          <div className="text-[12px] text-white/30 hidden sm:block font-bold">{format(new Date(), "dd MMMM yyyy")}</div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10 min-h-[calc(100vh-80px)] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {phase === "booting" && (
             <motion.div key="booting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-md mx-auto text-center w-full">
                <div className="mb-10 relative inline-block"><div className="w-24 h-24 rounded-[32px] bg-violet-600/10 border border-violet-500/20 flex items-center justify-center"><Fingerprint className="w-12 h-12 text-violet-400" /></div></div>
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-6" /><h2 className="text-xl font-bold tracking-tight mb-2">Engaging Bio-signature AI</h2><p className="text-[13px] text-white/40 leading-relaxed font-medium">Synchronizing portal records for secure identity verification.</p>
             </motion.div>
          )}

          {phase === "active" && (
            <motion.div key="active" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto w-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><ScanFace className="w-6 h-6 text-violet-400" /></div>
                <div><h2 className="text-2xl font-black tracking-tight">{student?.studentName || "Identity Verification"}</h2><p className="text-[13px] text-white/40 font-bold uppercase tracking-widest mt-1">Portal Bio-Scan Active</p></div>
              </div>
              <div className={cn("p-4 sm:p-5 rounded-[40px] relative overflow-hidden shadow-2xl", GLASS_CARD)}>
                <div className="relative aspect-[4/3] rounded-[30px] overflow-hidden bg-black/40 ring-1 ring-white/10">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1] opacity-90" />
                  <div className="absolute inset-x-6 bottom-6 z-20">
                     <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                        {!cameraActive || syncStatus === "syncing" ? <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0"><RefreshCw className="w-5 h-5 text-violet-400 animate-spin" /></div> : <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", studentDesc ? "bg-emerald-600/20 text-emerald-400" : "bg-blue-600/20 text-blue-400")}>{studentDesc ? <ShieldCheck className="w-5 h-5 animate-pulse" /> : <Fingerprint className="w-5 h-5" />}</div>}
                        <div className="flex-1 overflow-hidden"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">System Status</p><p className="text-[12px] sm:text-[13px] font-bold text-white/80 truncate leading-tight">{statusText}</p></div>
                     </div>
                  </div>
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                     <motion.div className="w-56 h-56 rounded-full border border-dashed border-violet-400/40" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
                     {cameraActive && studentDesc && <motion.div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent" animate={{ top: ["15%", "85%", "15%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {(phase === "matched" || phase === "already") && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto w-full p-8 sm:p-12 rounded-[48px] text-center relative overflow-hidden bg-white/[0.04] border border-white/10">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(16,185,129,0.3)]"><CheckCircle2 className="w-12 h-12 text-white" /></div>
                <div className="space-y-4">
                  <p className="text-[12px] font-black text-emerald-400 tracking-[0.4em] uppercase">{phase === "already" ? "Log Exists" : "Identity Verified"}</p>
                  <h3 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-6">{student?.studentName}</h3>
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                     <p className="text-[18px] font-black text-emerald-100">{format(new Date(), "hh:mm a")}</p><div className="w-px h-4 bg-emerald-500/30" /><p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Attendance Recorded</p>
                  </div>
                </div>
                <button onClick={() => window.location.reload()} className="mt-12 text-[13px] font-black text-white/40 hover:text-white transition-colors flex items-center gap-2 mx-auto"><RefreshCw className="w-4 h-4" /> Start New Verification</button>
            </motion.div>
          )}

          {showMismatchError && (
             <motion.div key="mismatch" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center w-full p-8 rounded-[40px] bg-rose-500/5 border border-rose-500/20 shadow-2xl">
                <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                   <ShieldCheck className="w-10 h-10 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-3">Your face not match</h3>
                <p className="text-white/40 text-[14px] font-medium leading-relaxed max-w-xs mx-auto mb-10">We couldn't verify your identity against the portal photo. Please ensure you are in a well-lit area and try again.</p>
                <button 
                   onClick={() => {
                      setShowMismatchError(false)
                      mismatchStartTimeRef.current = null
                   }} 
                   className="w-full py-4 px-8 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                   <RefreshCw className="w-4 h-4" /> Try Again
                </button>
             </motion.div>
          )}

          {phase === "no_profile" && (
             <motion.div key="no_profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto text-center w-full">
                <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8"><CameraOff className="w-10 h-10 text-rose-500" /></div>
                <h3 className="text-2xl font-black tracking-tight mb-3">Photo Missing</h3>
                <p className="text-white/40 text-[14px] font-medium leading-relaxed max-w-xs mx-auto mb-10">{errorText || "Verification requires a profile photo in your student portal. Please upload one via settings first."}</p>
                <div className="flex flex-col gap-3">
                   <button onClick={() => window.location.reload()} className="w-full py-4 px-8 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-colors">Try Syncing Again</button>
                </div>
             </motion.div>
          )}

          {(phase === "error" || phase === "camera_error") && (
             <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto text-center w-full">
                <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8"><AlertCircle className="w-10 h-10 text-rose-500" /></div>
                <h3 className="text-2xl font-black tracking-tight mb-3">System Access Error</h3>
                <p className="text-white/40 text-[14px] font-medium max-w-xs mx-auto mb-10">{errorText}</p>
                <button onClick={() => window.location.reload()} className="w-full py-4 px-8 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-colors">Refresh System</button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
