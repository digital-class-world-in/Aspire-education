"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useInstituteData } from "@/hooks/use-institute-data"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2, ChevronRight, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const DEFAULT_INFRA = [
  { id: '1', title: "Smart Classrooms", description: "Modern learning environments equipped with the latest audio-visual technology.", image: "https://images.unsplash.com/photo-1523050335102-c67450e28b2e?auto=format&fit=crop&q=80&w=800", details: "Our smart classrooms are designed to provide an immersive learning experience. Featuring interactive whiteboards, high-definition projectors, and ergonomic seating, these spaces facilitate dynamic discussions and collaborative learning." },
  { id: '2', title: "Computer Labs", description: "High-speed computing facilities with industry-standard software and hardware.", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800", details: "Equipped with the latest generation of workstations, our computer labs offer students access to industry-leading software for programming, design, and data analysis. High-speed internet and dedicated technical support ensure a seamless experience." },
  { id: '3', title: "Digital Library", description: "Vast collection of digital and physical resources for comprehensive research.", image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=800", details: "The digital library provides 24/7 access to thousands of e-books, journals, and research papers. Comfortable reading areas and dedicated quiet zones create the perfect environment for focused study and deep learning." },
  { 
    id: '4', 
    title: "Facilities Lab", 
    description: "State-of-the-art laboratory for real-world simulation and technical proficiency.", 
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800", 
    details: "The Facilities Lab is the heart of our practical training program. It features specialized zones for electrical engineering, mechanical systems, and digital fabrication. Students engage in hands-on projects that mirror industrial challenges, using high-precision tools and diagnostic equipment. This lab is fully solar-powered and serves as a model for sustainable campus infrastructure." 
  }
]

function FacilityDetailsContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const router = useRouter()
  
  const { 
    profile, 
    settings, 
    courses, 
    isLoading, 
    publicContact, 
    instituteName 
  } = useInstituteData()

  const [facility, setFacility] = useState<any>(null)

  useEffect(() => {
    if (isLoading) return
    
    // Find in Firebase data if available
    const infraItems = settings?.infrastructure?.items ? Object.values(settings.infrastructure.items) : []
    let found = infraItems.find((item: any) => item.id === id || item.title === id)
    
    // Fallback to default
    if (!found) {
      found = DEFAULT_INFRA.find(item => item.id === id || item.title === id)
    }
    
    // If absolutely not found, default to first or something generic
    if (!found) {
      found = DEFAULT_INFRA[0]
    }
    
    setFacility(found)
  }, [id, isLoading, settings])

  if (isLoading || !facility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: settings?.styling?.fontFamily || 'Poppins' }}>
      <Navbar profile={profile} instituteName={instituteName} onApplyClick={() => {}} />
      
      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Facilities
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-[2rem] overflow-hidden shadow-2xl relative aspect-[4/3]"
            >
              <img src={facility.image} alt={facility.title} className="w-full h-full object-cover" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <Badge className="bg-primary/10 text-primary px-4 py-1.5 font-bold tracking-widest text-[10px] border-none rounded-full">
                  Campus Facility
                </Badge>
                <h1 className="text-4xl lg:text-5xl font-black text-black tracking-tight leading-[1.1]">
                  {facility.title}
                </h1>
              </div>

              <div className="space-y-6 text-lg text-black leading-relaxed font-medium">
                <p>{facility.description}</p>
                {facility.details && (
                  <p>{facility.details}</p>
                )}
              </div>

              <div className="space-y-4 pt-6 border-t border-zinc-100">
                <h3 className="font-bold text-xl text-black">Key Features</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-black"><CheckCircle2 className="w-5 h-5 text-green-500" /> Fully equipped with modern technology</li>
                  <li className="flex items-center gap-3 text-black"><CheckCircle2 className="w-5 h-5 text-green-500" /> Accessible to all registered students</li>
                  <li className="flex items-center gap-3 text-black"><CheckCircle2 className="w-5 h-5 text-green-500" /> Supervised by expert staff</li>
                </ul>
              </div>

              <div className="pt-8 flex flex-wrap gap-4">
                <Button className="bg-primary hover:opacity-90 text-white rounded-full font-black px-8 h-12 shadow-lg border-none active:scale-95">
                  Request a Tour <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="rounded-full font-black px-8 h-12">
                  <Phone className="w-4 h-4 mr-2" /> Contact Office
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer 
        profile={profile} 
        settings={settings} 
        instituteName={instituteName} 
        publicContact={publicContact} 
        courses={courses} 
      />
    </div>
  )
}

export default function FacilityDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FacilityDetailsContent />
    </Suspense>
  )
}
