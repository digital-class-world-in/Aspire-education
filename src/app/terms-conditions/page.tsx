"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useInstituteData } from "@/hooks/use-institute-data"
import { useSEO } from "@/hooks/use-seo"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { EnquiryModal } from "@/components/enquiry-modal"
import { ChevronRight } from "lucide-react"

export default function TermsConditionsPage() {
  const {
    profile,
    settings,
    courses,
    isLoading,
    instituteName,
    resolvedUid
  } = useInstituteData()

  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useSEO(
    "Terms & Conditions",
    "Terms and Conditions for our Institute",
    "terms-conditions",
    instituteName
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl font-black animate-pulse text-black tracking-widest">
          Syncing Portal...
        </div>
      </div>
    )
  }

  const content = settings?.terms?.content || "<p>Terms and conditions have not been published yet.</p>"

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: settings?.styling?.fontFamily || "Poppins" }}>
      <Navbar
        profile={{ ...profile, ...settings?.about }}
        instituteName={instituteName}
        onApplyClick={() => setIsEnquiryOpen(true)}
      />

      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden bg-gradient-to-br from-primary/10 via-rose-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-6">
          <nav className="flex items-center justify-center gap-2 text-[14px] font-semibold text-black">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-primary font-bold">Terms & Conditions</span>
          </nav>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[0.95]">
            Terms & Conditions
          </h1>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6 prose prose-zinc lg:prose-lg">
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </section>

      <Footer
        profile={profile || {}}
        settings={settings || {}}
        instituteName={instituteName}
        courses={courses || []}
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
