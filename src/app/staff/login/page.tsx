
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


export default function StaffLoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [dynamicLogo, setDynamicLogo] = useState(DEFAULT_LOGO)
  const [instituteName, setInstituteName] = useState(process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Staff Portal")

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
        // 1. Try Branch Branding if branchId in URL
        const searchParams = new URLSearchParams(window.location.search)
        const urlBranchId = searchParams.get('branchId')
        if (urlBranchId) {
          onValue(ref(database, `Institutes/${adminUid}/branches/${urlBranchId}`), (snap) => {
            const bData = snap.val()
            if (bData) {
              // Special case for Rakesh Education logo as requested
              if (bData.branchName?.toLowerCase().includes('rakesh')) {
                setDynamicLogo("https://ik.imagekit.io/gnzjd77mb/WhatsApp%20Image%202026-03-19%20at%2011.05.32.jpeg?updatedAt=1773989799436")
              } else if (bData.logoUrl) {
                setDynamicLogo(bData.logoUrl)
              }
              if (bData.branchName) setInstituteName(bData.branchName)
            }
          }, { onlyOnce: true })
        }

        // 2. Fallback to Institute Profile
        onValue(ref(database, `Institutes/${adminUid}/profile`), (snap) => {
          const data = snap.val()
          if (data) {
            setDynamicLogo(prev => prev === DEFAULT_LOGO ? (data.logoUrl || DEFAULT_LOGO) : prev)
            setInstituteName(prev => prev === (process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Staff Portal") ? (data.instituteName || prev) : prev)
          }
        }, { onlyOnce: true })
      }
    }
    resolveBranding()
  }, [database])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = (formData.get("staffEmail") as string).trim().toLowerCase()
    const password = (formData.get("staffPassword") as string).trim()

    try {
      const instRef = ref(database, 'Institutes')
      const snapshot = await get(instRef)
      const institutes = snapshot.val() || {}

      let foundStaff = null
      let adminUid = null

      for (const uid in institutes) {
        const employees = institutes[uid].employees || {}
        for (const empId in employees) {
          const emp = employees[empId]
          if (emp.staffEmail?.toLowerCase() === email && emp.staffPassword === password) {

            const instProfile = institutes[uid].profile || {}
            if (instProfile.status === 'Deactivated') {
              throw new Error("Your account has been deactivated, please contact administration.")
            }
            if (instProfile.status === 'Suspended') {
              throw new Error("The account has been suspended, please contact administration.")
            }

            foundStaff = { ...emp, id: empId }
            adminUid = uid
            break
          }
        }
        if (foundStaff) break
      }

      if (foundStaff) {
        const session = {
          adminUid,
          branchId: foundStaff.branchId || null,
          staffId: foundStaff.id,
          email: foundStaff.staffEmail,
          name: `${foundStaff.firstName} ${foundStaff.lastName}`,
          role: 'Staff',
          expiresAt: Date.now() + 1000 * 60 * 60 * 12 // 12 hours expiry
        }
        localStorage.setItem('staff_session', JSON.stringify(session))
        toast({ title: "Login Successful", description: "Welcome To The Staff Portal." })
        router.push("/staff/dashboard")
      } else {
        throw new Error("Invalid Email Or Password.")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Unauthorized Access.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-[#F8FAFC] p-0 md:p-4 font-public-sans text-black relative transition-colors">
      <Card className="w-full max-w-md border-none shadow-none md:shadow-xl rounded-none md:rounded-[40px] bg-white overflow-hidden min-h-screen md:min-h-fit flex flex-col justify-center">
        <div className="h-2 w-full bg-zinc-100 hidden md:block" />
        <CardHeader className="space-y-4 pt-12 px-8 text-center">
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
            <CardTitle className="text-3xl font-black text-black tracking-tight font-public-sans">Staff Login</CardTitle>
            <CardDescription className="text-black/60 font-medium text-[10px] tracking-widest">
              Authorized Hub: {instituteName}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Work Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-black group-focus-within:text-[hsl(var(--primary))] transition-none" />
                <Input
                  name="staffEmail"
                  type="email"
                  placeholder="Staff@institute.com"
                  required
                  className="pl-11 h-12 rounded-xl border-zinc-200 bg-zinc-50/50 focus-visible:ring-[hsl(var(--primary))] transition-none text-black font-bold placeholder:text-black/40 text-[14px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-black group-focus-within:text-[hsl(var(--primary))] transition-none" />
                <Input
                  name="staffPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="pl-11 h-12 rounded-xl border-zinc-200 bg-zinc-50/50 focus-visible:ring-[hsl(var(--primary))] transition-none text-black font-bold placeholder:text-black/40 text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 focus:outline-none p-1 shadow-none border-none bg-transparent"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-zinc-800 text-white rounded-xl h-11 font-bold text-[14px] border-none transition-all mt-4 tracking-widest active:scale-95 shadow-none"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-bold underline underline-offset-4 tracking-tight">
              Back to Main Login
            </Link>
          </div>
        </CardContent>
        <CardFooter className="bg-zinc-50/50 border-t border-zinc-50 py-6 text-center justify-center">
          <div className="flex items-center gap-2 text-[10px] font-black text-black/30 tracking-[0.2em]">
            <ShieldCheck className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Institutional Secure Access
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
