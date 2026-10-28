"use client"

import { useInstituteData } from "@/hooks/use-institute-data"
import { useSEO } from "@/hooks/use-seo"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroBanner } from "@/components/hero-banner"
import { EnquiryModal } from "@/components/enquiry-modal"
import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Building2, 
  Monitor, 
  Zap, 
  ShieldCheck, 
  Trophy, 
  CheckCircle2,
  CalendarCheck,
  GraduationCap,
  Briefcase,
  UserPlus,
  BookOpen
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
}

const DEFAULT_INFRA = [
  { id: '1', title: "Smart Classrooms", description: "Modern learning environments equipped with the latest audio-visual technology.", image: "https://images.unsplash.com/photo-1523050335102-c67450e28b2e?auto=format&fit=crop&q=80&w=800" },
  { id: '2', title: "Computer Labs", description: "High-speed computing facilities with industry-standard software and hardware.", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800" },
  { id: '3', title: "Digital Library", description: "Vast collection of digital and physical resources for comprehensive research.", image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=800" },
  { id: '4', title: "Facilities Lab", description: "State-of-the-art facilities lab equipped for practical learning and hands-on experiments.", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800" }
]

const ICON_MAP: Record<string, any> = {
  UserPlus: <UserPlus className="w-6 h-6" />,
  Award: <Trophy className="w-6 h-6" />,
  BookOpen: <BookOpen className="w-6 h-6" />,
  Monitor: <Monitor className="w-6 h-6" />,
  Briefcase: <Briefcase className="w-6 h-6" />,
  Trophy: <Trophy className="w-6 h-6" />,
}

export default function FacilitiesPage() {
  const { 
    profile, 
    settings, 
    courses, 
    isLoading, 
    publicContact, 
    instituteName,
    resolvedUid
  } = useInstituteData()

  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)

  const infra = settings?.infrastructure || {}
  const infraData = infra.items ? Object.values(infra.items) : DEFAULT_INFRA

  useSEO(
    settings?.seo?.facilities?.title || `Facilities - ${instituteName}`,
    settings?.seo?.facilities?.description || `Discover world-class campus facilities at ${instituteName} — smart classrooms, digital labs, library, and more designed for excellence.`
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
        title={infra.hero?.title || "Campus Facilities"} 
        subtitle={infra.hero?.description || "Experience a world-class educational environment designed for excellence."}
        breadcrumb={[{ label: "Facilities", href: "/facilities" }]}
        backgroundImage={infra.hero?.backgroundImage}
        buttonText={infra.hero?.buttonText}
        buttonLink={infra.hero?.buttonLink}
      />

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-12 md:space-y-20">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-black text-black tracking-tight">Modern Academic Infrastructure</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {infraData.map((item: any, i: number) => (
              <motion.div key={item.id || i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                <Link href={`/facilities/details?id=${item.id || item.title}`} className="block h-full group">
                  <Card className="border-none shadow-xl rounded-2xl overflow-hidden group hover:shadow-2xl transition-all duration-700 bg-white h-full flex flex-col cursor-pointer">
                    <div className="h-56 md:h-64 relative overflow-hidden">
                      <img src={item.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={item.title} />
                    </div>
                    <div className="p-6 md:p-10 text-center space-y-4 md:space-y-6 flex-1">
                      <h4 className="text-xl md:text-2xl font-black tracking-tight text-black leading-tight group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-[14px] text-black font-medium leading-relaxed px-2 md:px-4">{item.description}</p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
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
