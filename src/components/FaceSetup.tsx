"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Loader2, Camera, CheckCircle2, ScanFace, XCircle, ArrowRight, UserPlus, ShieldCheck } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirebase } from "@/firebase"
import { ref, set, get } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { useFaceApi } from "@/hooks/useFaceApi"

interface FaceSetupProps {
  defaultRole?: "Student" | "Staff"
  defaultId?: string
  defaultName?: string
  autoSkipLogin?: boolean
}

export function FaceSetup({ defaultRole, defaultId, defaultName, autoSkipLogin }: FaceSetupProps = {}) {
  const { database, storage } = useFirebase()
  const { resolvedId } = useResolvedId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isScanningRef = useRef(false)
  
  const { faceapi, isLoaded: isModelsLoaded, error: modelsError } = useFaceApi()
  
  const [step, setStep] = useState(1) // 1: Identity, 2: Scan
  
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState("")

  const [formData, setFormData] = useState({
    role: defaultRole || "Student",
    idOrRollNo: defaultId || "",
    name: defaultName || ""
  })

  // To prevent re-triggering the autoSkipLogin effect infinitely
  const [hasAttemptedAutoLogin, setHasAttemptedAutoLogin] = useState(false)

  const [isValidating, setIsValidating] = useState(false)
  const [validatedUserId, setValidatedUserId] = useState<string | null>(null)
  
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [currentDescriptor, setCurrentDescriptor] = useState<Float32Array | null>(null)
  
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)
  
  // Track descriptor inside interval to pass directly to handleCaptureAndSave
  const autoSaveTriggeredRef = useRef(false)

  // Automatically validate user if autoSkipLogin and data exists
  useEffect(() => {
    if (autoSkipLogin && !hasAttemptedAutoLogin && formData.idOrRollNo && formData.name && isModelsLoaded && database && resolvedId) {
      setHasAttemptedAutoLogin(true)
      const attemptAutoValidate = async () => {
        setIsValidating(true)
        
        // Check if already enrolled
        try {
          const enrollSnapshot = await get(ref(database, `Institutes/${resolvedId}/face-descriptors/${formData.idOrRollNo}`))
          if (enrollSnapshot.exists()) {
            setIsAlreadyEnrolled(true)
            setIsValidating(false)
            return
          }
        } catch (e) {}

        setValidatedUserId(formData.idOrRollNo)
        setStep(2)
        startCamera()
        setIsValidating(false)
      }
      attemptAutoValidate()
    }
  }, [autoSkipLogin, hasAttemptedAutoLogin, formData, isModelsLoaded, database, resolvedId])

  const startCamera = async () => {
    setCameraError("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not supported.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
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
  }

  const validateUser = async () => {
    if (!database || !resolvedId) return
    if (!formData.idOrRollNo || !formData.name) {
      toast({ variant: "destructive", title: "Missing Fields" })
      return
    }

    setIsValidating(true)
    try {
      const rootPath = `Institutes/${resolvedId}`
      
      // Check if already enrolled first
      const enrollSnapshot = await get(ref(database, `${rootPath}/face-descriptors/${formData.idOrRollNo}`))
      if (enrollSnapshot.exists()) {
        setIsAlreadyEnrolled(true)
        setIsValidating(false)
        return
      }

      const path = formData.role === "Student" ? "admissions" : "employees"
      const snapshot = await get(ref(database, `${rootPath}/${path}`))
      const data = snapshot.val()
      
      let foundId: string | null = null
      if (data) {
        Object.keys(data).forEach(key => {
          const u = data[key]
          const idMatch = formData.role === "Student" 
            ? (u.admissionNo === formData.idOrRollNo || u.rollNo === formData.idOrRollNo) 
            : u.employeeId === formData.idOrRollNo
          if (idMatch || key === formData.idOrRollNo) {
            const nameField = formData.role === "Student" ? u.studentName : `${u.firstName} ${u.lastName}`
            if (nameField?.toLowerCase().includes(formData.name.toLowerCase())) {
                foundId = key
            }
          }
        })
      }

      if (foundId) {
        // Double check by foundId too
        const enrollSnapshotByFoundId = await get(ref(database, `${rootPath}/face-descriptors/${foundId}`))
        if (enrollSnapshotByFoundId.exists()) {
          setIsAlreadyEnrolled(true)
          setIsValidating(false)
          return
        }

        setValidatedUserId(foundId)
        setStep(2)
        startCamera()
        toast({ title: "Identification Confirmed" })
      } else {
        toast({ variant: "destructive", title: "User Not Found", description: "Verify your ID and Name." })
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Query Error" })
    } finally {
      setIsValidating(false)
    }
  }

  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded || !faceapi) return
    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight }
    faceapi.matchDimensions(canvasRef.current, displaySize)
    
    scanIntervalRef.current = setInterval(async () => {
      if (isScanningRef.current || isCapturing || isSaving || autoSaveTriggeredRef.current) return
      if (!videoRef.current) return
      isScanningRef.current = true
      try {
        const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor()
        const canvas = canvasRef.current
        if (canvas && detection) {
           const resized = faceapi.resizeResults(detection, displaySize)
           canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
           faceapi.draw.drawDetections(canvas, resized)
           setFaceDetected(true)
           setCurrentDescriptor(detection.descriptor)
           
           // Auto-lock logic (3 seconds = 15 consecutive frames of 200ms)
           progressRef.current += 1
           setProgress(Math.min((progressRef.current / 15) * 100, 100))
           
           if (progressRef.current >= 15 && !autoSaveTriggeredRef.current) {
             autoSaveTriggeredRef.current = true
             setIsAutoSaving(true)
             // Use setTimeout to decouple the async save from the interval thread
             setTimeout(() => handleCaptureAndSave(detection.descriptor), 100)
           }
        } else {
          canvas?.getContext('2d')?.clearRect(0, 0, canvas?.width, canvas?.height)
          setFaceDetected(false)
          setCurrentDescriptor(null)
          progressRef.current = 0
          setProgress(0)
        }
      } catch (err) {} finally { isScanningRef.current = false }
    }, 200)
  }

  const handleCaptureAndSave = async (directDescriptor?: Float32Array) => {
    const descToUse = directDescriptor || currentDescriptor
    if (!videoRef.current || !faceapi || !database || !resolvedId || !validatedUserId || !storage || !descToUse) {
      toast({ variant: "destructive", title: "Face Not Ready", description: "Wait for the system to detect your face." })
      setIsAutoSaving(false)
      autoSaveTriggeredRef.current = false
      return
    }
    
    setIsSaving(true)
    
    try {
        // Capture snapshot array from video element
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        
        const imageBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", 0.8))
        let imageUrl = ""
        
        if (imageBlob) {
          const sRef = storageRef(storage, `Institutes/${resolvedId}/face-images/${validatedUserId}_face.jpg`)
          const uploadResult = await uploadBytes(sRef, imageBlob)
          imageUrl = await getDownloadURL(uploadResult.ref)
        }

        const dbPath = `Institutes/${resolvedId}/face-descriptors/${validatedUserId}`
        await set(ref(database, dbPath), {
          role: formData.role,
          identifier: formData.idOrRollNo,
          name: formData.name,
          descriptor: Array.from(descToUse),
          imageUrl: imageUrl || null,
          updatedAt: new Date().toISOString()
        })
        stopCamera()
        setIsComplete(true)
        toast({ title: "Profile Enrolled Successfully!" })
    } catch (err) {
      toast({ variant: "destructive", title: "Save Error" })
      setIsAutoSaving(false)
      autoSaveTriggeredRef.current = false
    } finally {
      setIsSaving(false)
    }
  }

  const reset = () => {
    setStep(1)
    setFormData({ role: "Student", idOrRollNo: "", name: "" })
    setValidatedUserId(null)
    setIsComplete(false)
    setIsAlreadyEnrolled(false)
    setCameraError("")
    setIsAutoSaving(false)
    autoSaveTriggeredRef.current = false
    progressRef.current = 0
    setProgress(0)
    stopCamera()
  }

  return (
    <div className="max-w-xl mx-auto p-4 font-public-sans">
      <Card className="rounded-[40px] border-none shadow-2xl bg-white overflow-hidden p-0">
        {/* Header Section */}
        <div className="bg-zinc-950 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                <ScanFace className="w-8 h-8 text-primary" />
             </div>
             <h2 className="text-2xl font-black text-white tracking-tight">Biometric Enrollment</h2>
             <p className="text-black font-medium text-[14px] mt-2">Initialize your face-token for smart attendance.</p>
          </div>
        </div>

        {/* Progress Bar */}
        {!isComplete && (
          <div className="flex bg-zinc-50 border-b border-zinc-100">
            <div className={cn("flex-1 px-6 py-4 text-center border-r border-zinc-100 transition-colors", step === 1 ? "bg-white" : "opacity-50")}>
               <span className="text-[10px] font-black tracking-widest text-primary">01. Identity</span>
            </div>
            <div className={cn("flex-1 px-6 py-4 text-center transition-colors", step === 2 ? "bg-white" : "opacity-50")}>
               <span className="text-[10px] font-black tracking-widest text-primary">02. Biometric</span>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="p-10">
          {isAlreadyEnrolled ? (
            <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
               <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 shadow-inner">
                  <ShieldCheck className="w-12 h-12" />
               </div>
               <div>
                 <h3 className="text-2xl font-black text-black tracking-tight">Already Enrolled</h3>
                 <p className="text-black font-medium mt-1">This ID already has a biometric profile activated.</p>
               </div>
               <Button onClick={reset} className="h-14 px-12 bg-zinc-900 text-white rounded-2xl font-black text-[11px] tracking-widest active:scale-95 transition-all shadow-xl">
                  Try Another ID
               </Button>
            </div>
          ) : isComplete ? (
            <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
               <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
               </div>
               <div>
                 <h3 className="text-2xl font-black text-black tracking-tight">Setup Successful</h3>
                 <p className="text-black font-medium mt-1">Your biometric profile is now active and synchronized.</p>
               </div>
               <Button onClick={reset} className="h-14 px-12 bg-zinc-900 text-white rounded-2xl font-black text-[11px] tracking-widest active:scale-95 transition-all shadow-xl">
                  Enroll Another Profile
               </Button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-[0.2em] text-black ml-1">Profile Category</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData(p => ({ ...p, role: v as "Student" | "Staff" }))}>
                    <SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-black shadow-inner">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Student Registration</SelectItem>
                      <SelectItem value="Staff">Faculty / Staff Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-[0.2em] text-black ml-1">Unique Identifier</Label>
                  <Input 
                    placeholder={formData.role === "Student" ? "Roll No or Admission No" : "Employee ID"} 
                    value={formData.idOrRollNo}
                    onChange={e => setFormData(p => ({ ...p, idOrRollNo: e.target.value }))}
                    disabled={autoSkipLogin}
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-black shadow-inner disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-[0.2em] text-black ml-1">Official Full Name</Label>
                  <Input 
                    placeholder="As per records" 
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    disabled={autoSkipLogin}
                    className="h-14 rounded-2xl bg-zinc-50 border-zinc-100 font-bold text-black shadow-inner disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {!isModelsLoaded ? (
                <div className="flex items-center justify-center p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                   <Loader2 className="w-5 h-5 animate-spin text-primary mr-3" />
                   <span className="text-[10px] font-black tracking-widest text-black">Preparing AI Engine...</span>
                </div>
              ) : (
                <Button 
                  onClick={validateUser}
                  disabled={isValidating}
                  className="w-full h-16 rounded-3xl bg-primary hover:opacity-90 text-white font-black text-[12px] tracking-widest shadow-2xl shadow-primary/20 border-none transition-all active:scale-95"
                  style={{ backgroundColor: 'hsl(var(--primary))' }}
                >
                  {isValidating ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="flex items-center gap-2">Verify & Proceed <ArrowRight className="w-4 h-4" /></div>}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="relative w-full aspect-square bg-zinc-950 rounded-[40px] overflow-hidden shadow-2xl border-4 border-zinc-100">
                  {cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-rose-50/10">
                      <XCircle className="w-16 h-16 text-rose-500 mb-4 opacity-50" />
                      <p className="text-rose-500 font-bold mb-4">{cameraError}</p>
                      <Button onClick={startCamera} variant="outline" className="rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-50">Retry Camera</Button>
                    </div>
                  ) : (
                    <>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        playsInline
                        onPlay={handleVideoPlay}
                        className={`w-full h-full object-cover transform scale-x-[-1] transition-all duration-700 ${isSaving ? 'opacity-50 blur-md' : 'opacity-100'}`}
                      />
                      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none transform scale-x-[-1]" />
                      
                      {/* Scanning Ring Overlay */}
                      {!isSaving && !faceDetected && (
                         <div className="absolute inset-x-12 inset-y-12 border-2 border-dashed border-white/40 rounded-full animate-[spin_10s_linear_infinite]" />
                      )}
                      
                      {/* Auto Capture Progress Overlay */}
                      {faceDetected && !isSaving && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                          <svg className="w-56 h-56 transform -rotate-90">
                             <circle cx="112" cy="112" r="104" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="transparent" />
                             <circle cx="112" cy="112" r="104" stroke="hsl(var(--primary))" strokeWidth="6" fill="transparent" 
                                strokeDasharray={2 * Math.PI * 104} 
                                strokeDashoffset={2 * Math.PI * 104 * (1 - progress / 100)} 
                                className="transition-all duration-200 ease-linear" />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center bg-black/60 rounded-full w-24 h-24 backdrop-blur-md">
                             <span className="text-xl font-black text-white">{Math.round(progress)}%</span>
                             <span className="text-[8px] font-bold text-white/50 tracking-widest uppercase mt-1">Locking</span>
                          </div>
                        </div>
                      )}

                      {isSaving && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white z-30">
                           <Loader2 className="w-12 h-12 animate-spin mb-4" />
                           <span className="text-[14px] font-black tracking-widest">Saving Biometrics...</span>
                        </div>
                      )}
                    </>
                  )}
               </div>

               <div className="flex flex-col gap-4">
                  {!isAutoSaving && (
                     <div className="flex gap-4 w-full">
                        <Button variant="outline" onClick={() => { stopCamera(); setStep(1); }} className="flex-1 h-14 rounded-2xl border-zinc-200 text-black font-black text-[10px] tracking-widest border-none bg-zinc-50">
                          Cancel
                        </Button>
                     </div>
                  )}
                  
                  <div className="flex items-center justify-center gap-2 text-black mt-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[9px] font-black tracking-[0.2em]">{isAutoSaving ? "ENROLLING PROFILE..." : "HOLD STILL TO AUTO-CAPTURE"}</span>
                  </div>
               </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
