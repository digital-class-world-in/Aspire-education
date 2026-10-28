"use client"

import { useState } from "react"
import { useInstituteData } from "@/hooks/use-institute-data"
import { useSEO } from "@/hooks/use-seo"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroBanner } from "@/components/hero-banner"
import { motion } from "framer-motion"
import { EnquiryModal } from "@/components/enquiry-modal"
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search,
  Award,
  Calendar,
  User,
  GraduationCap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

const fadeIn = {
  initial: { opacity: 0, scale: 0.95 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" }
}

// Mock data - would be replaced by actual Firebase verification logic
const MOCK_CERTIFICATES: Record<string, any> = {
  "CERT-2025-001": {
    studentName: "John Doe",
    course: "Advanced Tally + GST Certification",
    issueDate: "2025-03-15",
    status: "Verified",
    grade: "A+"
  }
}

export default function CertificateVerifyPage() {
  const { 
    profile,
    instituteName,
    settings,
    courses,
    isLoading,
    resolvedUid
  } = useInstituteData()

  const [certNumber, setCertNumber] = useState("")
  const [result, setResult] = useState<any>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = () => {
    if (!certNumber.trim()) return
    setIsVerifying(true)
    setError(null)
    setResult(null)

    // Simulate verification delay
    setTimeout(() => {
      const data = MOCK_CERTIFICATES[certNumber.trim().toUpperCase()]
      if (data) {
        setResult(data)
      } else {
        setError("Invalid certificate number. Please check and try again.")
      }
      setIsVerifying(false)
    }, 1500)
  }

  useSEO(
    `Certificate Verify - ${instituteName}`,
    `Verify the authenticity of certificates issued by ${instituteName}. Enter your certificate number to confirm your credentials instantly.`
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: settings?.styling?.fontFamily || 'Poppins' }}>
      <Navbar profile={profile} instituteName={instituteName} onApplyClick={() => setIsEnquiryOpen(true)} />
      
      <HeroBanner 
        title="Verify Certificate" 
        subtitle="Ensure the authenticity of your professional certifications through our secure verification portal."
        breadcrumb={[{ label: "Certificate Verify", href: "/certificate-verify" }]}
      />

      <section className="py-24 bg-white min-h-[600px]">
        <div className="max-w-4xl mx-auto px-6">
          <Card className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-zinc-50 border border-zinc-100">
            <div className="p-10 lg:p-16 space-y-10">
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-black text-black tracking-tight">Identity Verification</h2>
                <p className="text-black font-medium">Enter your unique certificate number as printed on your document.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black w-5 h-5" />
                  <Input 
                    value={certNumber} 
                    onChange={e => setCertNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. CERT-2025-001" 
                    className="h-16 pl-12 rounded-2xl border-zinc-200 bg-white shadow-inner font-bold text-lg"
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  />
                </div>
                <Button 
                  onClick={handleVerify} 
                  disabled={isVerifying || !certNumber}
                  className="h-16 px-10 bg-primary text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Now"}
                </Button>
              </div>

              {error && (
                <motion.div {...fadeIn} className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="font-bold text-[14px] tracking-tight">{error}</p>
                </motion.div>
              )}

              {result && (
                <motion.div {...fadeIn} className="space-y-8 animate-in fade-in zoom-in duration-500">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 lg:p-12 text-center space-y-8">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-emerald-900 tracking-tight">Verified Document</h3>
                      <p className="text-emerald-700/70 font-bold tracking-widest text-[10px]">Authenticity Confirmed by {instituteName}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left pt-6">
                      <InfoRow icon={<User className="w-4 h-4 text-emerald-600" />} label="Student Name" value={result.studentName} />
                      <InfoRow icon={<GraduationCap className="w-4 h-4 text-emerald-600" />} label="Course" value={result.course} />
                      <InfoRow icon={<Calendar className="w-4 h-4 text-emerald-600" />} label="Issue Date" value={result.issueDate} />
                      <InfoRow icon={<Award className="w-4 h-4 text-emerald-600" />} label="Grade" value={result.grade} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </div>
      </section>

      <Footer 
        profile={profile} 
        settings={settings} 
        instituteName={instituteName} 
        courses={courses} 
      />

      <EnquiryModal 
        isOpen={isEnquiryOpen} 
        onOpenChange={setIsEnquiryOpen} 
        resolvedUid={resolvedUid} 
        displayedCourses={courses} 
      />
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-4 bg-white/50 rounded-2xl space-y-1 border border-emerald-50">
      <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 tracking-widest">
        {icon} {label}
      </div>
      <p className="text-lg font-black text-emerald-950 tracking-tight truncate">{value}</p>
    </div>
  )
}
