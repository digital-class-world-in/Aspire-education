
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useFirebase } from "@/firebase"
import { ref, get, onValue, off } from "firebase/database"
import { sendForgotPasswordEmail } from "@/services/email-service"
import { generateResetLink } from "@/services/auth-service"
import { sendPasswordResetEmail } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { Mail, ArrowLeft, Loader2 } from "lucide-react"

const DEFAULT_LOGO = process.env.NEXT_PUBLIC_LOGO_URL || "https://ik.imagekit.io/2wtn9m5bl/default-institute-logo.png"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [dynamicLogo, setDynamicLogo] = useState(DEFAULT_LOGO)
  const [instituteName, setInstituteName] = useState(process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Management Portal")
  const { auth, database } = useFirebase()
  const [adminUid, setAdminUid] = useState<string | null>(null)
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

        if (adminUid) {
          setAdminUid(adminUid)
          const profileRef = ref(database, `Institutes/${adminUid}/profile`)

        unsubProfile = onValue(profileRef, (snap: any) => {
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

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!auth || !database) return
    
    setIsLoading(true)
    const email = (new FormData(e.currentTarget).get("email") as string).trim()

    try {
      let customTrigger = null
      let profileData = null
      
      if (adminUid) {
        const snapshot = await get(ref(database, `Institutes/${adminUid}/profile`))
        if (snapshot.exists()) {
          profileData = snapshot.val()
          customTrigger = profileData.communication?.triggers?.forgotPassword
        }
      }

      if (customTrigger?.email) {
        // Use custom email service
        const linkResult = await generateResetLink(email)
        if (!linkResult.success) throw new Error(linkResult.error)

        const emailResult = await sendForgotPasswordEmail({
          toEmail: email,
          businessName: instituteName,
          resetLink: linkResult.link!,
          template: customTrigger.template,
          instituteLogo: dynamicLogo
        })

        if (!emailResult.success) throw new Error("Failed to dispatch custom recovery email.")
      } else {
        // Fallback to default Firebase reset
        await sendPasswordResetEmail(auth, email)
      }

      setIsSent(true)
      toast({
        title: "Reset Email Sent",
        description: `Instructions have been sent to ${email}`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email. Please verify the address.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-public-sans text-black overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-50 rounded-full -mr-64 -mt-64 blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50 rounded-full -ml-64 -mb-64 blur-3xl opacity-50" />

      <Card className="w-full max-w-md border-none shadow-2xl rounded-[40px] bg-white overflow-hidden relative z-10">
        <div className="h-2 w-full bg-[hsl(var(--primary))]" />
        <CardHeader className="space-y-4 pt-12 px-10 text-center">
          <div className="flex justify-center">
            <div className="relative w-48 h-20 max-w-[280px] mx-auto items-center justify-center transition-all duration-300 hover:scale-105">
              <img src={dynamicLogo} alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black text-black tracking-tight font-public-sans">Recovery</CardTitle>
            <CardDescription className="text-black font-medium text-[10px] tracking-widest">
              {isSent ? "Node Sync Initiated" : `Reset link for ${instituteName}`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          {!isSent ? (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Registered Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[hsl(var(--primary))] transition-colors" />
                  <Input 
                    name="email" 
                    type="email" 
                    placeholder="admin@institute.com" 
                    required 
                    className="pl-12 h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 transition-all text-black font-bold placeholder:text-zinc-300 text-[14px] shadow-inner focus-visible:ring-[hsl(var(--primary))]"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[hsl(var(--primary))] hover:bg-[#0b7a6d] text-white rounded-2xl h-14 font-black text-[14px] shadow-xl shadow-emerald-900/10 border-none transition-all active:scale-95 tracking-widest"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-8 animate-in zoom-in duration-500">
              <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100/50 text-emerald-600 text-[14px] font-medium leading-relaxed italic">
                "An official password reset link has been dispatched to your inbox. Please follow the instructions to secure your node."
              </div>
              <Button asChild variant="outline" className="w-full h-14 rounded-2xl font-black text-black border-zinc-100 bg-zinc-50/50 transition-all text-[10px] tracking-widest hover:bg-zinc-100">
                <Link href="/login">Return to Login</Link>
              </Button>
            </div>
          )}
        </CardContent>
        {!isSent && (
          <CardFooter className="px-10 pb-10 pt-0 justify-center">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-bold underline underline-offset-4 tracking-tight">
              Back to Main Login
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
