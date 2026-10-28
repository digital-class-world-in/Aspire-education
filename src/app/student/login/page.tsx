
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useFirebase } from "@/firebase"
import { ref, get, onValue } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const DEFAULT_LOGO = process.env.NEXT_PUBLIC_LOGO_URL || "https://ik.imagekit.io/2wtn9m5bl/default-institute-logo.png"

export default function StudentLoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [dynamicLogo, setDynamicLogo] = useState(DEFAULT_LOGO)
  const [instituteName, setInstituteName] = useState(process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Academic Portal")

  const router = useRouter()
  const { database } = useFirebase()
  const { toast } = useToast()

  useEffect(() => {
    if (!database) return
    const resolveBranding = async () => {
      const hostname = window.location.hostname
      const erpDomains = ['erp.digitalclassworld.in', 'localhost']
      const isCentralHub = erpDomains.some(d => hostname === d || hostname.includes('webstation-'))

      const envId = process.env.NEXT_PUBLIC_DB_ID || process.env.NEXT_PUBLIC_DB_SLUG;
      let adminUid = envId || null;

      if (!adminUid && !isCentralHub) {
        const slug = hostname.replace('www.', '').split('.')[0]
        const slugRef = ref(database, `Slugs/${slug}`)
        const slugSnap = await get(slugRef)
        if (slugSnap.exists()) adminUid = slugSnap.val()
      }

      if (adminUid) {
        onValue(ref(database, `Institutes/${adminUid}/profile`), (snap) => {
          const data = snap.val()
          if (data?.logoUrl) setDynamicLogo(data.logoUrl)
          if (data?.instituteName) setInstituteName(data.instituteName)
        })
      }
    }
    resolveBranding()
  }, [database])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = (formData.get("email") as string).trim().toLowerCase()
    const password = (formData.get("password") as string).trim()

    try {
      if (!database) throw new Error("Database connection not established.")

      const instRef = ref(database, 'Institutes')
      const snap = await get(instRef)

      if (!snap.exists()) {
        throw new Error("Registry is currently offline.")
      }

      const institutes = snap.val()
      let foundStudent = null
      let adminUid = null

      for (const uid in institutes) {
        const adms = institutes[uid].admissions || {}
        for (const aid in adms) {
          const studentRec = adms[aid]
          if (studentRec.email?.toLowerCase() === email && studentRec.password === password) {

            const instProfile = institutes[uid].profile || {}
            if (instProfile.status === 'Deactivated') {
              throw new Error("Your account has been deactivated, please contact administration.")
            }
            if (instProfile.status === 'Suspended') {
              throw new Error("The account has been suspended, please contact administration.")
            }

            foundStudent = { ...studentRec, id: aid }
            adminUid = uid
            break
          }
        }
        if (foundStudent) break
      }

      if (foundStudent) {
        if (foundStudent.loginStatus === false) {
          throw new Error("Portal access restricted.")
        }

        const session = {
          adminUid,
          studentId: foundStudent.id,
          email: foundStudent.email,
          name: foundStudent.studentName,
          role: 'Student',
          loginTime: Date.now()
        }

        localStorage.setItem('student_session', JSON.stringify(session))
        toast({ title: "Authorized", description: "Node sync established." })
        window.location.assign("/student/dashboard")
      } else {
        throw new Error("Invalid access credentials.")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Unauthorized access.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-public-sans text-black relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full -mr-64 -mt-64 blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-50 rounded-full -ml-64 -mb-64 blur-3xl opacity-50" />

      <Card className="w-full max-w-md border-none shadow-none md:shadow-2xl rounded-none md:rounded-[40px] bg-white overflow-hidden relative z-10 min-h-screen md:min-h-fit flex flex-col justify-center">
        <div className="h-2 w-full bg-zinc-100 hidden md:block" />

        <CardHeader className="space-y-4 pt-12 px-10 text-center">
          <div className="flex justify-center">
            <div className="relative w-48 h-20 max-w-[280px] mx-auto items-center justify-center transition-all duration-300 hover:scale-105">
              <img
                src={dynamicLogo}
                alt="Institute Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black text-black tracking-tight font-public-sans">Student Portal</CardTitle>
            <CardDescription className="text-black font-medium text-[10px] tracking-widest">
              Access {instituteName}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Registered Email</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" style={{ color: 'group-focus-within:hsl(var(--primary))' }} />
                <Input name="email" type="email" placeholder="name@student.com" required className="pl-12 h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-primary shadow-inner font-bold text-black text-[14px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Portal Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" style={{ color: 'group-focus-within:hsl(var(--primary))' }} />
                <Input name="password" type={showPassword ? "text" : "password"} required placeholder="••••••••" className="pl-12 pr-12 h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-primary shadow-inner font-bold text-black text-[14px]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-zinc-300 hover:text-black outline-none transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-black hover:bg-zinc-800 text-white rounded-xl h-11 font-black text-[14px] border-none transition-all mt-4 tracking-widest active:scale-95 shadow-none">
              {isLoading ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Logging in...</span></div> : "Login"}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-bold underline underline-offset-4 tracking-tight">
              Back to Main Login
            </Link>
          </div>
        </CardContent>
        <CardFooter className="bg-zinc-50/50 border-t border-zinc-50 py-8 text-center justify-center">
        </CardFooter>
      </Card>
    </div>
  )
}
