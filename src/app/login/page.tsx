"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useAuth, useFirebase } from "@/firebase"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import { ref, get, onValue, off } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { Mail, Lock, Loader2, User, Users, Building2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

const DEFAULT_LOGO = process.env.NEXT_PUBLIC_LOGO_URL || "https://ik.imagekit.io/2wtn9m5bl/default-institute-logo.png"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [dynamicLogo, setDynamicLogo] = useState(DEFAULT_LOGO)
  const [instituteName, setInstituteName] = useState(process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Management Portal")

  const router = useRouter()
  const auth = useAuth()
  const { database } = useFirebase()
  const { toast } = useToast()

  useEffect(() => {
    if (!database) return

    let unsubProfile: (() => void) | null = null;

    const resolveBranding = async () => {
      const hostname = window.location.hostname

      const erpDomains = ['erp.digitalclassworld.in', 'localhost']
      const isCentralHub = erpDomains.some(
        (d) => hostname === d || hostname.includes('webstation-')
      )

      let adminUid = process.env.NEXT_PUBLIC_DB_ID || null

      // Only try domain mapping IF env is missing
      if (!adminUid && !isCentralHub) {
        const fullHostname = hostname.replace('www.', '')
        const safeKey = fullHostname.replace(/\./g, '_')

        const domainRef = ref(database, `Slugs/${safeKey}`)
        const domainSnap = await get(domainRef)

        if (domainSnap.exists()) {
          adminUid = domainSnap.val()
        } else {
          const slug = fullHostname.split('.')[0]
          const slugRef = ref(database, `Slugs/${slug}`)
          const slugSnap = await get(slugRef)

          if (slugSnap.exists()) {
            adminUid = slugSnap.val()
          }
        }
      }

      // 🔍 DEBUG (keep this for now)
      console.log("FINAL adminUid:", adminUid)
      console.log("HOSTNAME:", hostname)

      if (adminUid) {
        const profileRef = ref(database, `Institutes/${adminUid}/profile`)

        unsubProfile = onValue(profileRef, (snap) => {
          const data = snap.val()

          if (data?.logoUrl) setDynamicLogo(data.logoUrl)
          if (data?.instituteName) setInstituteName(data.instituteName)
        })
      }
    }
    resolveBranding()
    return () => {
      if (unsubProfile) unsubProfile();
    }
  }, [database])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const profileRef = ref(database, `Institutes/${user.uid}/profile`)
      const snapshot = await get(profileRef)

      if (snapshot.exists()) {
        const profile = snapshot.val()
        if (profile.status === 'Deactivated') {
          await signOut(auth)
          throw new Error("Your account has been deactivated, please contact administration.")
        }
        if (profile.status === 'Suspended') {
          await signOut(auth)
          throw new Error("The account has been suspended, please contact administration.")
        }
      }

      toast({
        title: "Success",
        description: "Redirecting to dashboard...",
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-[#F8FAFC] p-0 md:p-4 font-public-sans overflow-hidden">
      <Card className="w-full max-w-md border-none shadow-none md:shadow-xl rounded-none md:rounded-[40px] bg-white overflow-hidden min-h-screen md:min-h-fit flex flex-col justify-center">
        <div className="h-2 w-full bg-primary hidden md:block" style={{ backgroundColor: 'hsl(var(--primary))' }} />
        <CardHeader className="space-y-4 pt-10 px-10 pb-6 text-center">
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
            <CardTitle className="text-2xl font-black text-black tracking-tight font-public-sans">Welcome Back</CardTitle>
            <CardDescription className="text-black/60 font-medium text-[10px] tracking-widest">
              Log in to {instituteName}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-10 pb-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-black group-focus-within:text-primary transition-none" style={{ color: 'group-focus-within:hsl(var(--primary))' }} />
                <Input
                  name="email"
                  type="email"
                  placeholder="admin@institute.com"
                  required
                  className="pl-11 h-11 rounded-xl border-zinc-200 bg-zinc-50/50 focus-visible:ring-primary transition-none text-black placeholder:text-black/40 text-[14px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[11px] font-bold text-black tracking-widest">Password</Label>
                <Link href="/forgot-password" className="text-[10px] font-bold text-primary hover:underline tracking-widest transition-none" style={{ color: 'hsl(var(--primary))' }}>
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-black group-focus-within:text-primary transition-none" style={{ color: 'group-focus-within:hsl(var(--primary))' }} />
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="pl-11 pr-11 h-11 rounded-xl border-zinc-200 bg-zinc-50/50 focus-visible:ring-primary transition-none text-black placeholder:text-black/40 text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 
             text-black/40 
             bg-transparent border-0 shadow-none 
             p-0 m-0 
             focus:outline-none focus:ring-0 focus:bg-transparent 
             active:bg-transparent"
                  style={{ WebkitAppearance: "none" }}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:opacity-90 text-white rounded-xl h-11 font-bold text-[14px] shadow-lg shadow-primary/10 border-none transition-none mt-2 tracking-widest"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
            </Button>
          </form>

          <div className="space-y-3 pt-6 mt-4 border-t border-zinc-200/70">
            <p className="text-center text-[9px] font-bold text-black tracking-[0.25em]">PORTAL ACCESS</p>
            <div className="flex items-center justify-center gap-2 px-2">
              <Button
                asChild
                variant="default"
                size="sm"
                className="flex-1 h-9 text-[10px] font-black shadow-sm transition-all active:scale-95 rounded-lg"
              >
                <Link href="/student/login" className="flex items-center justify-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Student
                </Link>
              </Button>

              <Button
                asChild
                variant="default"
                size="sm"
                className="flex-1 h-9 text-[10px] font-black shadow-sm transition-all active:scale-95 rounded-lg"
              >
                <Link href="/staff/login" className="flex items-center justify-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Staff
                </Link>
              </Button>



            </div>
          </div>
        </CardContent>

        {/* <CardFooter className="bg-zinc-50/50 border-t border-zinc-50 px-10 py-4 text-center justify-center">
          <p className="text-[14px] text-black/60 font-medium">
            Don't have an account?{" "}
            <Link href="/signup" className="text-[hsl(var(--primary))] font-bold hover:underline transition-none">
              Create Account
            </Link> 
          </p>
        </CardFooter> */}
      </Card>
    </div>
  )
}
