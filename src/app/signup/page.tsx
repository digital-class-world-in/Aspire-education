
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth, useFirestore, useDatabase, useUser } from "@/firebase"
import { 
  createUserWithEmailAndPassword
} from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { ref, set as dbSet } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { Mail, Lock, Loader2, Building2, User, Phone, Eye, EyeOff } from "lucide-react"
import { sendWelcomeEmail } from "@/services/email-service"

const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || "https://ik.imagekit.io/2wtn9m5bl/default-institute-logo.png"

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  
  const router = useRouter()
  const auth = useAuth()
  const firestore = useFirestore()
  const database = useDatabase()
  const { user: authUser } = useUser()
  const { toast } = useToast()

  // SESSION PURGE: Ensure a clean state for the new user
  useEffect(() => {
    localStorage.removeItem('student_session')
    localStorage.removeItem('staff_session')
    localStorage.removeItem('branch_session')
    
    if (authUser && !isLoading) {
      router.push("/")
    }

    // Initialize phoneEmailReceiver for email verification
    (window as any).phoneEmailReceiver = (userObj: any) => {
        var user_json_url = userObj.user_json_url;
        
        // You can submit your form here or redirect user to post login dashboard page
        // Send user_json_url to your backend to retrieve user info (i.e. email id) from this URL.
        alert('Email Verification Successfull !!\nPlease fetch authenticated email id from following JSON file URL.\n ' + user_json_url);
    };
  }, [authUser, isLoading, router])

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading || !acceptedTerms) return
    
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const email = (formData.get("email") as string).trim().toLowerCase()
    const password = formData.get("password") as string
    const instituteName = formData.get("instituteName") as string
    const fullName = formData.get("fullName") as string
    const phone = formData.get("phone") as string

    if (phone.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Please Enter A Valid 10-digit Mobile Number.",
      })
      setIsLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      const timestamp = new Date().toISOString()
      
      const baseSlug = instituteName.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
      const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
      
      const expiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      
      const profileData = {
        instituteName,
        fullName,
        email,
        phone,
        slug,
        role: "Administrator",
        createdAt: timestamp,
        planExpiryDate: expiryDate,
        currentPlan: "Trial",
        plan_selected: false, // MANDATORY: This triggers the Plan Selector Popup
        status: "Active",
        netFees: 0,
        paidFees: 0,
        themeColor: "hsl(var(--primary))",
        fontFamily: "Public Sans",
        onboarding_completed: false
      }
      
      if (!database) throw new Error("Realtime Database Service Is Not Available")
      
      const instituteId = `inst_${Math.random().toString(36).substring(2, 11)}`
      
      // Initialize core database nodes
      await Promise.all([
        dbSet(ref(database, `Institutes/${user.uid}/profile`), {
          ...profileData,
          instituteId 
        }),
        dbSet(ref(database, `Institutes/${user.uid}/moduleAccess`), {
          dashboard: true,
          student_info: true,
          hr: true,
          fees_collections: true,
          attendance: true
        }),
        dbSet(ref(database, `Institutes/${user.uid}/admissions`), null),
        dbSet(ref(database, `Institutes/${user.uid}/employees`), null),
        dbSet(ref(database, `Institutes/${user.uid}/enquiries`), null),
        dbSet(ref(database, `Slugs/${slug}`), user.uid),
        setDoc(doc(firestore, "institutes", instituteId), {
          id: instituteId,
          ownerUid: user.uid,
          name: instituteName,
          phone: phone,
          currentPlan: "Trial",
          planExpiryDate: expiryDate,
          createdAt: timestamp
        }),
        setDoc(doc(firestore, "institutes", instituteId, "staff", user.uid), {
          id: user.uid,
          firstName: fullName.split(' ')[0] || fullName,
          lastName: fullName.split(' ').slice(1).join(' ') || "",
          email: email,
          phoneNumber: phone,
          role: "Administrator",
          hireDate: timestamp.split('T')[0]
        })
      ])

      // 📧 TRIGGER WELCOME EMAIL (AWAITING FOR RELIABILITY)
      await sendWelcomeEmail({
        toEmail: email,
        businessName: instituteName
      }).catch(err => console.error("Brevo Email node failed to dispatch:", err));

      toast({
        title: "Registration Successful",
        description: "Welcome! Your 3-day trial is active and a welcome email has been sent.",
      })

      // Use window.location for a hard refresh to ensure layout and guards pick up the new state
      window.location.assign("/")
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message || "An Error Occurred During Registration.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-public-sans text-black">
      <Script src="https://www.phone.email/verify_email_v1.js" strategy="lazyOnload" />
      <Card className="w-full max-w-md border-none shadow-xl rounded-[40px] bg-white overflow-hidden">
        <div className="h-2 w-full bg-[hsl(var(--primary))]" />
        <CardHeader className="space-y-4 pt-12 px-10 text-center">
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full flex items-center justify-center transition-none overflow-hidden">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black text-black tracking-tight font-public-sans">Get Started</CardTitle>
            <CardDescription className="text-black/60 font-medium">Create Your Institutional Node</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Institute Name</Label>
              <div className="relative group">
                <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-black group-focus-within:text-[hsl(var(--primary))] transition-none" />
                <Input name="instituteName" placeholder="My Institute" required className="pl-11 h-12 rounded-xl border-zinc-200 bg-zinc-50/50 transition-none focus-visible:ring-[hsl(var(--primary))] text-black font-bold placeholder:text-black/40 text-[14px]" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-black group-focus-within:text-[hsl(var(--primary))] transition-none" />
                <Input name="fullName" placeholder="John Doe" required className="pl-11 h-12 rounded-xl border-zinc-200 bg-zinc-50/50 transition-none focus-visible:ring-[hsl(var(--primary))] text-black font-bold placeholder:text-black/40 text-[14px]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Mobile Number</Label>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-black group-focus-within:text-[hsl(var(--primary))] transition-none" />
                <Input 
                  name="phone" 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                  }}
                  required 
                  placeholder="9876543210"
                  className="pl-11 h-12 rounded-xl border-zinc-200 bg-zinc-50/50 transition-none focus-visible:ring-[hsl(var(--primary))] text-black font-bold placeholder:text-black/40 text-[14px]" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Work Email</Label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[hsl(var(--primary))] transition-none" />
                  <Input name="email" type="email" placeholder="Admin@institute.com" required className="pl-11 h-12 rounded-xl border-zinc-200 bg-zinc-50/50 transition-none focus-visible:ring-[hsl(var(--primary))] text-black font-bold placeholder:text-black/40 text-[14px]" />
                </div>
                <div className="pe_verify_email flex items-center justify-center" data-client-id="16603997657861093734"></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-black tracking-widest ml-1">Secure Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-black group-focus-within:text-[hsl(var(--primary))] transition-none" />
                <Input 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder="••••••••"
                  className="pl-11 pr-11 h-12 rounded-xl border-zinc-200 bg-zinc-50/50 transition-none focus-visible:ring-[hsl(var(--primary))] text-black font-bold placeholder:text-black/40 text-[14px]" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-black hover:text-black focus:outline-none transition-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3 px-1 py-2">
              <Checkbox 
                id="terms" 
                checked={acceptedTerms} 
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)} 
                className="border-zinc-200 data-[state=checked]:bg-[hsl(var(--primary))] data-[state=checked]:border-[hsl(var(--primary))]"
              />
              <Label 
                htmlFor="terms" 
                className="text-[11px] font-bold text-black cursor-pointer leading-tight tracking-tight"
              >
                I hereby accept the <span className="text-[hsl(var(--primary))] underline">terms and conditions</span>
              </Label>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !acceptedTerms}
              className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] text-white rounded-xl h-11 font-bold text-[14px] shadow-lg shadow-emerald-100 border-none transition-none mt-2 tracking-widest disabled:opacity-50 disabled:bg-zinc-200 disabled:text-black"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Register Institute"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-zinc-50/50 border-t border-zinc-50 px-8 py-6 text-center justify-center">
          <p className="text-[14px] text-black/60 font-medium">
            Already Have An Account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-bold underline underline-offset-4 tracking-tight">
              Back to Main Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
