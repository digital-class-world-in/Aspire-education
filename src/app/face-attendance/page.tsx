"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  UserCheck, ShieldCheck, Search, ChevronRight,
  GraduationCap, Calendar, Loader2, ScanFace, ArrowLeft,
  Fingerprint, Database, CheckCircle2, XCircle, Download, AlertCircle
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, set, get } from "firebase/database"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useResolvedId } from "@/hooks/use-resolved-id"

type PanelType = "select" | "staff" | "student" | "admin"
type DetectionStatus = "idle" | "loading" | "detecting"
type AttendanceStatus = "idle" | "scanning" | "matched" | "already" | "error"

interface StoredDescriptor {
  descriptor: number[]
  name: string
  type: string
  personId: string
  course?: string
  batch?: string
  photoUrl?: string
}

interface AttendanceRecord {
  id: string
  userId: string
  name: string
  role: "staff" | "student"
  date: string
  time: string
  status: string
  method: string
  timestamp: number
}

const GLASS = "backdrop-blur-xl bg-white/5 border border-white/10"
const GLASS_CARD = "backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-3xl"

const MODEL_URL = "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/"

function FaceAttendanceContent() {
  const { database } = useFirebase()
  const searchParams = useSearchParams()
  const { resolvedId } = useResolvedId()

  const [panel, setPanel] = useState<PanelType>("select")
  const [dataLoaded, setDataLoaded] = useState(false)

  // Data
  const [staffList, setStaffList] = useState<any[]>([])
  const [studentList, setStudentList] = useState<any[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [storedDescriptors, setStoredDescriptors] = useState<Record<string, StoredDescriptor>>({})

  // Face API
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const faceapi = useRef<any>(null)

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [cameraOn, setCameraOn] = useState(false)

  // Status
  const [detStatus, setDetStatus] = useState<DetectionStatus>("idle")
  const [attStatus, setAttStatus] = useState<AttendanceStatus>("idle")
  const [detMsg, setDetMsg] = useState("")
  const [matchedPerson, setMatchedPerson] = useState<StoredDescriptor | null>(null)

  // Admin
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"all" | "staff" | "student">("all")
  const [filterDate, setFilterDate] = useState("")

  // Load models from CDN
  useEffect(() => {
    const loadApi = async () => {
      if ((window as any).faceapi) {
        faceapi.current = (window as any).faceapi
        loadModels()
        return
      }
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js"
      script.async = true
      script.onload = () => {
        faceapi.current = (window as any).faceapi
        loadModels()
      }
      document.body.appendChild(script)
    }

    const loadModels = async () => {
      if (modelsLoaded || modelsLoading) return
      setModelsLoading(true)
      try {
        const fa = faceapi.current
        await Promise.all([
          fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
      } catch (e) {
        console.error("Failed to load models:", e)
      } finally {
        setModelsLoading(false)
      }
    }

    loadApi()
  }, [])

  // Auto-detect panel from URL
  useEffect(() => {
    const paramPanel = searchParams.get('panel') as PanelType | null
    if (paramPanel) setPanel(paramPanel)
  }, [searchParams])

  // Load Realtime Database data
  useEffect(() => {
    if (!database || !resolvedId) return

    const unsubStudents = onValue(ref(database, `Institutes/${resolvedId}/students`), (snap) => {
       const data = snap.val()
       if (data) setStudentList(Object.keys(data).map(key => ({ id: key, ...data[key] })))
    })
    
    const unsubStaff = onValue(ref(database, `Institutes/${resolvedId}/employees`), (snap) => {
       const data = snap.val()
       if (data) setStaffList(Object.keys(data).map(key => ({ id: key, ...data[key] })))
    })

    const unsubAttendance = onValue(ref(database, `Institutes/${resolvedId}/face-attendance-logs`), (snap) => {
       const data = snap.val()
       if (data) {
           const list = Object.keys(data).flatMap(date => {
               if (typeof data[date] === 'object') {
                  return Object.keys(data[date]).map(id => ({ id, ...data[date][id] }))
               }
               return []
           })
           list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
           setRecords(list)
       } else {
           setRecords([])
       }
    })

    setDataLoaded(true)

    return () => {
      off(ref(database, `Institutes/${resolvedId}/students`))
      off(ref(database, `Institutes/${resolvedId}/employees`))
      off(ref(database, `Institutes/${resolvedId}/face-attendance-logs`))
    }
  }, [database, resolvedId])

  // Camera helpers
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraOn(true)
      }
    } catch (e) {
      alert("Camera access denied. Please allow camera permissions.")
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraOn(false)
  }, [])

  // Start Recognition Loop
  const runRecognitionLoop = useCallback(() => {
    if (!faceapi.current || !videoRef.current) return
    const fa = faceapi.current
    const descriptorEntries = Object.entries(storedDescriptors).filter(([, v]) => v.descriptor)

    if (descriptorEntries.length === 0) return

    let scanActive = true

    const scan = async () => {
      if (!videoRef.current || !scanActive || !cameraOn) return
      try {
        const detection = await fa.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor()

        if (detection) {
          const query = Array.from(detection.descriptor) as number[]
          let best = { key: "", dist: Infinity, data: null as any }
          
          for (const [key, val] of descriptorEntries) {
            const stored = new Float32Array(val.descriptor)
            const queryFloat = new Float32Array(query)
            const dist = fa.euclideanDistance(queryFloat, stored)
            if (dist < best.dist) best = { key, dist, data: val }
          }
          
          if (best.dist < 0.55 && best.data) { // Strict threshold 0.55
            setMatchedPerson(best.data)
            scanActive = false
            stopCamera()
            
            if (database && resolvedId) {
              const now = new Date()
              const todayKey = format(now, "yyyy-MM-dd")
              
              // Verify if already marked today
              const existingRef = ref(database, `Institutes/${resolvedId}/face-attendance-logs/${todayKey}/${best.key}`)
              const snap = await get(existingRef)
              
              if (snap.exists()) {
                setAttStatus("already")
              } else {
                setAttStatus("matched")
                // Log attendance
                await set(existingRef, {
                  userId: best.key,
                  name: best.data.name,
                  role: best.data.type || "student",
                  date: todayKey,
                  time: format(now, "hh:mm a"),
                  status: "present",
                  method: "face",
                  timestamp: now.toISOString(),
                  identifier: best.data.type === "staff" ? "Staff ID" : "Student ID"
                })
                
                // Also push to standard attendance path
                let standardPath = best.data.type === "staff" 
                  ? `Institutes/${resolvedId}/attendance/Staff/${todayKey}/${best.key}`
                  : `Institutes/${resolvedId}/attendance/Student_Direct/${todayKey}/${best.key}`

                await set(ref(database, standardPath), {
                   status: "Present",
                   remarks: "Face ID Verified",
                   updatedAt: Date.now()
                })
              }
              
              // Auto resume after 3 seconds
              setTimeout(() => {
                 setMatchedPerson(null)
                 setAttStatus("scanning")
                 startCamera().then(() => { runRecognitionLoop(); })
              }, 3000)
            }
            return
          }
        }
      } catch (e) {} 
      
      if (scanActive) {
         rafRef.current = requestAnimationFrame(scan)
      }
    }
    
    // Only start scanning once video is playing
    if (videoRef.current.readyState >= 2) {
       scan()
    } else {
       videoRef.current.onloadeddata = () => scan()
    }
  }, [storedDescriptors, database, resolvedId, stopCamera, cameraOn, startCamera])

  const startScanFlow = useCallback(async () => {
    setAttStatus("scanning")
    startCamera().then(() => {
       setTimeout(runRecognitionLoop, 800)
    })
  }, [startCamera, runRecognitionLoop])

  // Fetch or Generate Descriptors
  useEffect(() => {
    let active = true

    const loadFaces = async () => {
      if ((panel !== "staff" && panel !== "student") || !dataLoaded || !faceapi.current || !database || !resolvedId || !modelsLoaded) return
      
      const list = panel === "staff" ? staffList : studentList
      if (list.length === 0) return

      setDetStatus("loading")
      setDetMsg("Synchronizing neural faces...")

      const newDescriptors: Record<string, StoredDescriptor> = {}
      
      // Existing configured faces
      const descriptorsSnap = await get(ref(database, `Institutes/${resolvedId}/face-descriptors`))
      const existingDbFaces = descriptorsSnap.val() || {}

      for (const person of list) {
        if (!active) break
        
        let descriptor = null
        if (existingDbFaces[person.id]?.descriptor) {
           descriptor = existingDbFaces[person.id].descriptor
        } 
        
        const photoUrl = person.photoUrl || person.profilePicture || person.image
        
        if (descriptor) {
          // Add to memory
          newDescriptors[person.id] = {
            descriptor: Array.isArray(descriptor) ? descriptor : Object.values(descriptor),
            name: person.name || "Unknown",
            type: panel,
            personId: person.id,
            photoUrl: photoUrl
          }
        } else if (photoUrl) {
          // Need to auto-generate
          try {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.src = photoUrl
            await new Promise((resolve, reject) => {
              img.onload = resolve; img.onerror = reject;
            })
            const det = await faceapi.current.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
            if (det) {
              const generatedDesc = Array.from(det.descriptor) as number[]
              newDescriptors[person.id] = {
                descriptor: generatedDesc,
                name: person.name || "Unknown",
                type: panel,
                personId: person.id,
                photoUrl: photoUrl
              }
              // Save to Realtime Database so we don't compute again
              await set(ref(database, `Institutes/${resolvedId}/face-descriptors/${person.id}`), {
                 descriptor: generatedDesc,
                 name: person.name,
                 role: panel === "staff" ? "Staff" : "Student",
                 updatedAt: Date.now(),
                 imageUrl: photoUrl
              })
            }
          } catch (err) {
            console.log("Could not process descriptor for", person.name)
          }
        }
      }

      if (active) {
        setStoredDescriptors(newDescriptors)
        setDetStatus("idle")
        if (Object.keys(newDescriptors).length > 0) {
          startScanFlow()
        } else {
           setDetMsg("No registered faces or profile photos found.")
           setAttStatus("error")
        }
      }
    }

    const timer = setTimeout(() => {
      loadFaces()
    }, 1000)

    return () => {
      active = false
      clearTimeout(timer)
      stopCamera()
    }
  }, [panel, staffList, studentList, dataLoaded, database, resolvedId, modelsLoaded, startScanFlow, stopCamera])



  const handlePanelSelect = useCallback((p: PanelType) => {
    setPanel(p)
    stopCamera()
    setAttStatus("idle")
    setDetStatus("idle")
    setMatchedPerson(null)
  }, [stopCamera])


  // Filter records for Admin panel
  const filteredRecords = records.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.userId?.includes(search)
    const matchType = filterType === "all" || r.role === filterType
    const matchDate = !filterDate || r.date === filterDate
    return matchSearch && matchType && matchDate
  })

  return (
    <div className="min-h-screen bg-[#020817] text-white font-public-sans relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-violet-600/8 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Header */}
      <div className={cn("sticky top-0 z-50 border-b border-white/5", GLASS)}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {panel !== "select" && (
              <button onClick={() => handlePanelSelect("select")}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors mr-1 text-white/50 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight">Face Recognition Engine</h1>
              <p className="text-[10px] text-cyan-400/70 tracking-[0.2em]">
                {modelsLoading ? "Loading Neural Nets..." : modelsLoaded ? "System Ready" : "Initializing..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[13px] text-white/40 hidden sm:block">{format(new Date(), "dd MMM yyyy")}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <AnimatePresence mode="wait">

          {/* ===== PANEL SELECTOR ===== */}
          {panel === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto mt-10">
              <div className="text-center mb-16">
                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(6,182,212,0.2)] relative">
                  <Fingerprint className="w-12 h-12 text-cyan-400" />
                  <div className="absolute inset-x-0 h-1 bg-cyan-400 opacity-50 blur-sm rounded-full top-1/2 animate-[scan_2s_ease-in-out_infinite]" />
                </div>
                <h2 className="text-4xl font-black tracking-tight">Biometric Framework</h2>
                <p className="text-white/40 mt-3 text-[15px]">Automated face recognition attendance</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { id: "staff", label: "Staff Scanner", sub: "Scan staff faces", icon: UserCheck, color: "from-cyan-500 to-blue-600", glow: "rgba(6,182,212,0.3)" },
                  { id: "student", label: "Student Scanner", sub: "Scan student faces", icon: GraduationCap, color: "from-violet-500 to-purple-600", glow: "rgba(139,92,246,0.3)" },
                  { id: "admin", label: "Admin Logs", sub: "View attendance logs", icon: ShieldCheck, color: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,0.3)" },
                ].map((p) => (
                  <motion.button key={p.id} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handlePanelSelect(p.id as PanelType)}
                    className={cn("relative p-8 rounded-[32px] border border-white/10 text-left group flex flex-col gap-6 bg-white/[0.03] hover:border-white/20 transition-all overflow-hidden")}>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `radial-gradient(circle at 30% 50%, ${p.glow.replace('0.3', '0.07')} 0%, transparent 70%)` }} />
                    <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", p.color)}
                      style={{ boxShadow: `0 0 20px ${p.glow}` }}>
                      <p.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-xl">{p.label}</p>
                      <p className="text-white/40 text-[14px] mt-1">{p.sub}</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/20 group-hover:text-white/60 transition-colors ml-auto absolute bottom-8 right-8" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ===== SCANNING MODULE (Staff & Student) ===== */}
          {(panel === "staff" || panel === "student") && (
            <motion.div key="scan" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto">
              <PanelHeader 
                 title={panel === "staff" ? "Staff Biometric Scan" : "Student Biometric Scan"} 
                 subtitle={matchedPerson ? "Subject identified successfully" : detStatus === "loading" ? "Preparing models & profile pictures..." : "Please align your face in the center of the frame"} 
                 icon={panel === "staff" ? <UserCheck className="w-5 h-5 text-cyan-400" /> : <GraduationCap className="w-5 h-5 text-violet-400" />} 
              />

              <div className={cn("p-6 sm:p-8 rounded-[40px] relative overflow-hidden shadow-2xl", GLASS_CARD)}>
                
                {detStatus === "loading" && !matchedPerson && (
                  <div className="py-24 text-center">
                    <Loader2 className="w-14 h-14 text-cyan-400 animate-spin mx-auto mb-6" />
                    <p className="text-cyan-400 font-bold text-lg mb-2">Syncing Biometric Data...</p>
                    <p className="text-white/40 text-[14px] max-w-[280px] mx-auto leading-relaxed">Downloading existing profile pictures and safely generating mathematical face descriptors over the browser.</p>
                  </div>
                )}

                {attStatus === "error" && (
                  <div className="py-20 text-center">
                    <XCircle className="w-20 h-20 text-rose-400 mx-auto mb-6" />
                    <h3 className="text-xl font-bold mb-3">No Biometric Profiles Found</h3>
                    <p className="text-white/40 text-[14px] max-w-sm mx-auto">Ensure that {panel}s have profile photos uploaded in the system, or manually register them via Admin panel.</p>
                  </div>
                )}

                {(attStatus === "matched" || attStatus === "already") && matchedPerson && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center text-white relative z-10">
                    <div className="relative inline-block mb-6">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500/30 p-1">
                        {matchedPerson.photoUrl ? (
                           <img src={matchedPerson.photoUrl} alt="Face" className="w-full h-full rounded-full object-cover" />
                        ) : (
                           <div className="w-full h-full rounded-full bg-emerald-500/20 flex flex-col items-center justify-center">
                              <UserCheck className="w-12 h-12 text-emerald-400" />
                           </div>
                        )}
                      </div>
                      <motion.div className="absolute -bottom-2 right-0 bg-emerald-500 rounded-full p-2 border-2 border-[#020817]"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}>
                        <CheckCircle2 className="w-6 h-6 text-emerald-950" />
                      </motion.div>
                    </div>
                    
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <p className="text-[12px] font-black text-emerald-400 tracking-[0.3em] uppercase mb-2">
                        {attStatus === "already" ? "Already Recorded Today" : "Identity Verified"}
                      </p>
                      <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">{matchedPerson.name}</h3>
                      <p className="text-white/50 text-[14px] font-bold tracking-widest uppercase mb-8">{panel} Profile</p>
  
                      <div className="bg-gradient-to-r from-emerald-500/[0.05] to-emerald-500/[0.01] border border-emerald-500/20 rounded-3xl p-5 flex justify-between items-center text-left">
                         <div>
                           <p className="text-emerald-400/60 text-[11px] uppercase tracking-widest font-black mb-1">Time Logged</p>
                           <p className="text-2xl font-black text-emerald-100">{format(new Date(), "hh:mm:ss a")}</p>
                         </div>
                         <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                         </div>
                      </div>
  
                      <p className="text-white/30 text-[11px] uppercase tracking-widest mt-8 font-bold animate-pulse">Automatically resetting scanner...</p>
                    </motion.div>
                  </motion.div>
                )}

                {attStatus === "scanning" && (
                   <div className="relative aspect-[3/4] sm:aspect-square rounded-[32px] overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl">
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />

                     {cameraOn && (
                       <>
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Scanning Targeting Bracket */}
                            <motion.div className={cn("w-56 h-56 rounded-full border border-dashed", panel === "staff" ? "border-cyan-400/60 shadow-[0_0_30px_rgba(6,182,212,0.2)_inset]" : "border-violet-400/60 shadow-[0_0_30px_rgba(139,92,246,0.2)_inset]")}
                              animate={{ rotate: 360 }}
                              transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
                              
                            <motion.div className={cn("absolute w-44 h-44 rounded-full border-2", panel === "staff" ? "border-cyan-400/30" : "border-violet-400/30")}
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
                         </div>
                         
                         {/* Scanning Laser Line */}
                         <motion.div className={cn("absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent to-transparent opacity-80", panel === "staff" ? "via-cyan-400 shadow-[0_0_15px_#22d3ee]" : "via-violet-400 shadow-[0_0_15px_#c084fc]")}
                           animate={{ top: ["15%", "85%", "15%"] }}
                           transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />
                           
                         <div className="absolute bottom-6 inset-x-6 flex justify-center">
                           <div className="flex items-center gap-3 px-6 py-3.5 bg-black/60 backdrop-blur-md rounded-2xl text-white text-[13px] font-bold shadow-2xl border border-white/10 w-full justify-center">
                             <motion.span className={cn("w-2 h-2 rounded-full", panel === "staff" ? "bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" : "bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.8)]")} animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                             {detMsg || "Hold still..."}
                           </div>
                         </div>
                       </>
                     )}
                   </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ===== ADMIN PANEL LOGS ===== */}
          {panel === "admin" && (
            <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <PanelHeader title="Unified Biometric Records" subtitle="Live feed of all face attendance occurrences" icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />} />

              {/* Stats */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {[
                  { label: "Total Logs", value: records.length, icon: Database, color: "emerald" },
                  { label: "Today's Scans", value: records.filter(r => r.date === format(new Date(), "yyyy-MM-dd")).length, icon: Calendar, color: "cyan" },
                  { label: "Staff Scanned Today", value: records.filter(r => r.role === "staff" && r.date === format(new Date(), "yyyy-MM-dd")).length, icon: UserCheck, color: "violet" },
                  { label: "Students Scanned Today", value: records.filter(r => r.role === "student" && r.date === format(new Date(), "yyyy-MM-dd")).length, icon: GraduationCap, color: "amber" },
                ].map((s, i) => (
                  <div key={i} className={cn("p-6 rounded-[28px] relative overflow-hidden", GLASS_CARD)}>
                    <div className="absolute -right-4 -top-4 opacity-[0.03] scale-150"><s.icon className="w-32 h-32" /></div>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", `bg-${s.color}-500/15 text-${s.color}-400`)}>
                       <s.icon className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-black mb-1">{s.value}</p>
                    <p className="text-[12px] uppercase font-bold tracking-widest text-white/40">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className={cn("p-4 sm:p-5 rounded-[28px] mb-6 flex flex-col sm:flex-row gap-3 sm:items-center", GLASS_CARD)}>
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3 w-4 h-4 text-white/30" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or System ID..."
                    className="w-full bg-black/20 border border-white/5 rounded-2xl pl-11 pr-5 py-2.5 text-[14px] font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/40 focus:bg-white/5 transition-all" />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
                  className="bg-black/20 border border-white/5 rounded-2xl px-5 py-2.5 text-[14px] font-bold text-white outline-none focus:border-cyan-500/40">
                  <option value="all">View All Roles</option>
                  <option value="staff">Staff Only</option>
                  <option value="student">Student Only</option>
                </select>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="bg-black/20 border border-white/5 rounded-2xl px-5 py-2.5 text-[14px] font-bold text-white [color-scheme:dark] outline-none focus:border-cyan-500/40" />
                  
                <button onClick={() => {
                     const headers = ["Name", "ID", "Role", "Date", "Time", "Status"];
                     const csv = [headers.join(","), ...filteredRecords.map(r => `${r.name},${r.userId},${r.role},${r.date},${r.time},${r.status}`)].join("\n");
                     const blob = new Blob([csv], { type: 'text/csv' });
                     const url = window.URL.createObjectURL(blob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = `biometric_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
                     a.click();
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-2xl text-[14px] font-bold text-white sm:ml-auto">
                  <Download className="w-4 h-4" /> Export Data
                </button>
              </div>

              {/* Records Table */}
              <div className={cn("rounded-[32px] overflow-hidden border border-white/5 shadow-2xl", GLASS_CARD)}>
                <div className="overflow-x-auto scrollbar-none">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase text-white/40 tracking-[0.2em]">Enrolled Name</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase text-white/40 tracking-[0.2em]">System ID</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase text-white/40 tracking-[0.2em]">Role</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black uppercase text-white/40 tracking-[0.2em]">Capture Time</th>
                        <th className="px-6 py-5 text-center text-[11px] font-black uppercase text-white/40 tracking-[0.2em]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0 && (
                        <tr><td colSpan={5} className="py-24 text-center">
                          <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
                          <p className="text-white/40 text-[14px] font-medium tracking-widest">No matching logs found in system</p>
                        </td></tr>
                      )}
                      {filteredRecords.map((r, i) => (
                        <tr key={r.id + i} className="border-b last:border-0 border-white/[0.02] hover:bg-white/[0.04] transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-4">
                               <div className={cn("w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] font-black shrink-0", r.role === "staff" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-violet-500/10 text-violet-400 border border-violet-500/20")}>
                                 {r.name.charAt(0)}
                               </div>
                               <span className="font-bold text-[14px]">{r.name}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-[13px] text-white/50 font-mono tracking-tighter">{r.userId}</td>
                          <td className="px-6 py-4">
                            <span className={cn("text-[10px] font-black px-3 py-1.5 rounded-full border tracking-widest", r.role === "staff" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-violet-500/10 text-violet-400 border-violet-500/20")}>
                               {r.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-white/80">{r.date}</span>
                              <span className="text-[13px] font-black text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">{r.time}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center gap-1.5 text-[10px] font-black px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full tracking-widest uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

function PanelHeader({ title, subtitle, icon, onBack }: {
  title: string, subtitle: string, icon: React.ReactNode, onBack?: () => void
}) {
  return (
    <div className="flex items-center gap-4 mb-8">
      {onBack && (
        <button onClick={onBack} className="p-3 rounded-2xl hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition-all bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div className="w-14 h-14 rounded-[18px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner shrink-0">{icon}</div>
      <div>
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
        <p className="text-[14px] text-white/50 font-medium mt-1 tracking-wide">{subtitle}</p>
      </div>
    </div>
  )
}

export default function FaceAttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center gap-4"><Loader2 className="w-10 h-10 text-cyan-400 animate-spin" /><p className="text-cyan-400 font-bold tracking-[0.2em] text-[11px] uppercase">Booting Biometric UI...</p></div>}>
      <FaceAttendanceContent />
    </Suspense>
  )
}
