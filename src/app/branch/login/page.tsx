
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
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck, Building2, Globe } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const DEFAULT_LOGO = "https://ik.imagekit.io/glc8gb4if/download.png"

export default function BranchLoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [dynamicLogo, setDynamicLogo] = useState(DEFAULT_LOGO)
  const [instituteName, setInstituteName] = useState("Branch Portal")
  
  const router = useRouter()
  const { database } = useFirebase()
  const { toast } = useToast()

  useEffect(() => {
    const session = localStorage.getItem('branch_session')
    if (session) {
      router.push("/branch/dashboard")
    }
  }, [router])

  useEffect(() => {
    if (!database) return
    const resolveBranding = async () => {
      const hostname = window.location.hostname
      const erpDomains = ['erp.digitalclassworld.in', 'localhost']
      const isCentralHub = erpDomains.some(d => hostname === d || hostname.includes('webstation-'))
      
      if (!isCentralHub) {
        const slug = hostname.replace('www.', '').split('.')[0]
        const slugRef = ref(database, `Slugs/${slug}`)
        const slugSnap = await get(slugRef)
        if (slugSnap.exists()) {
          const adminUid = slugSnap.val()
          onValue(ref(database, `Institutes/${adminUid}/profile`), (snap) => {
            const data = snap.val()
            if (data?.logoUrl) setDynamicLogo(data.logoUrl)
            if (data?.instituteName) setInstituteName(data.instituteName)
          })
        }
      }
    }
    resolveBranding()
  }, [database])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading) return
    
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = (formData.get("branchEmail") as string).trim().toLowerCase()
    const password = (formData.get("branchPassword") as string).trim()

    try {
      if (!database) throw new Error("Database connection not established.")

      const instRef = ref(database, 'Institutes')
      const snapshot = await get(instRef)
      
      if (!snapshot.exists()) {
        throw new Error("No institutional data found. Please contact support.")
      }

      const institutes = snapshot.val()
      let foundBranch = null
      let adminUid = null

      for (const uid in institutes) {
        const branches = institutes[uid].branches || {}
        for (const bId in branches) {
          const branch = branches[bId]
          if (branch.branchEmail?.toLowerCase() === email && branch.branchPassword === password) {
            
            const instProfile = institutes[uid].profile || {}
            if (instProfile.status === 'Deactivated') {
              throw new Error("Your account has been deactivated, please contact administration.")
            }
            if (instProfile.status === 'Suspended') {
              throw new Error("The account has been suspended, please contact administration.")
            }

            foundBranch = { ...branch, id: bId }
            adminUid = uid
            break
          }
        }
        if (foundBranch) break
      }

      if (foundBranch) {
        const session = {
          adminUid,
          branchId: foundBranch.id,
          email: foundBranch.branchEmail,
          name: foundBranch.branchName,
          role: 'Branch',
          loginTime: Date.now()
        }
        
        localStorage.setItem('branch_session', JSON.stringify(session))
        toast({ title: "Login Successful", description: `Welcome to the Branch Portal.` })
        window.location.assign("/branch/dashboard")
      } else {
        throw new Error("Invalid Branch Email or Password.")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authorization Failed",
        description: error.message || "An error occurred during authentication.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-[#F8FAFC] p-0 md:p-4 font-public-sans text-black relative transition-colors">
      <Card className="w-full max-w-md border-none shadow-none md:shadow-2xl rounded-none md:rounded-[40px] bg-white overflow-hidden min-h-screen md:min-h-fit flex flex-col justify-center">
        <div className="h-2 w-full bg-zinc-100 hidden md:block" />
        
        <CardHeader className="space-y-4 pt-12 px-10 text-center">
          <div className="flex justify-center">
            <div className="w-32 h-20 relative flex items-center justify-center transition-all hover:scale-105 overflow-hidden">
              <img src={dynamicLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black text-black tracking-tight font-public-sans">Branch Login</CardTitle>
            <CardDescription className="text-black font-medium text-[10px] tracking-widest">
              Node: {instituteName}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-10 pb-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Branch Email</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[hsl(var(--primary))] transition-colors" />
                <Input 
                  name="branchEmail" 
                  type="email" 
                  placeholder="branch@institute.com" 
                  required 
                  className="pl-12 h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-[hsl(var(--primary))] font-bold text-black placeholder:text-zinc-300 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[hsl(var(--primary))] transition-colors" />
                <Input 
                  name="branchPassword" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••" 
                  required 
                  className="pl-12 pr-12 h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-[hsl(var(--primary))] font-bold text-black placeholder:text-zinc-300 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-zinc-300 hover:text-black focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-black hover:bg-zinc-800 text-white rounded-xl h-11 font-bold text-[14px] border-none transition-all mt-4 tracking-widest active:scale-95 shadow-none"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Redirecting...</span>
                </div>
              ) : (
                "Login"
              )}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-bold underline underline-offset-4 tracking-tight">
              Back to Main Login
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-50 flex items-center justify-center gap-6">
            <Link href="/login" className="text-[10px] font-black text-zinc-300 hover:text-primary tracking-widest transition-colors flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Admin Portal
            </Link>
            <div className="w-1 h-1 bg-zinc-100 rounded-full" />
            <Link href="/" className="text-[10px] font-black text-zinc-300 hover:text-primary tracking-widest transition-colors flex items-center gap-2">
              <Globe className="w-3 h-3" /> Public Site
            </Link>
          </div>
        </CardContent>

        <CardFooter className="bg-zinc-50/50 py-6 text-center justify-center">
          <div className="flex items-center gap-2 text-[9px] font-black text-zinc-300 tracking-[0.3em]">
            <ShieldCheck className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Verified Secure Session
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
