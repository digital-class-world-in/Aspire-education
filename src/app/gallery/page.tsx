"use client"

import { useState } from "react"
import { useInstituteData } from "@/hooks/use-institute-data"
import { useSEO } from "@/hooks/use-seo"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroBanner } from "@/components/hero-banner"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EnquiryModal } from "@/components/enquiry-modal"

const fadeIn = {
  initial: { opacity: 0, scale: 0.95 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" }
}

export default function GalleryPage() {
  const { 
    profile, 
    settings, 
    courses, 
    isLoading, 
    publicContact, 
    instituteName,
    resolvedUid
  } = useInstituteData()

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)

  const gallery = settings?.gallery || []

  useSEO(
    settings?.seo?.gallery?.title || `Gallery - ${instituteName}`,
    settings?.seo?.gallery?.description || `Browse the campus gallery of ${instituteName} — explore our modern infrastructure, classrooms, labs and campus life through photos.`
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handlePrev = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex - 1 + gallery.length) % gallery.length)
  }

  const handleNext = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex + 1) % gallery.length)
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: settings?.styling?.fontFamily || 'Poppins' }}>
      <Navbar profile={profile} instituteName={instituteName} onApplyClick={() => setIsEnquiryOpen(true)} />
      
      <HeroBanner 
        title="Campus Gallery" 
        subtitle="Explore our modern infrastructure and academic environment through the lens of excellence."
        breadcrumb={[{ label: "Gallery", href: "/gallery" }]}
      />

      <section className="py-24 bg-white min-h-[600px]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {gallery.map((img: any, i: number) => (
              <motion.div
                key={i}
                {...fadeIn}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedIndex(i)}
                className="group relative aspect-square rounded-[32px] overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500"
              >
                <img src={img.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={`Gallery ${i}`} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black shadow-xl scale-50 group-hover:scale-100 transition-transform duration-500">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {gallery.length === 0 && (
            <div className="py-32 text-center space-y-6 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-100">
              <ImageIcon className="w-16 h-16 text-zinc-200 mx-auto" />
              <p className="text-[14px] font-black text-black tracking-widest">Media archive is currently empty</p>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col"
          >
            <div className="h-20 flex items-center justify-between px-10 border-b border-white/5">
              <p className="text-[10px] font-black text-white/40 tracking-[0.3em]">Photo {selectedIndex + 1} of {gallery.length}</p>
              <button 
                onClick={() => setSelectedIndex(null)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border-none outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center p-10">
              <button onClick={handlePrev} className="absolute left-10 w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all border-none active:scale-90 z-10"><ChevronLeft className="w-8 h-8" /></button>
              
              <motion.img 
                key={selectedIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                src={gallery[selectedIndex].url} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                alt="Fullscreen View"
              />

              <button onClick={handleNext} className="absolute right-10 w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all border-none active:scale-90 z-10"><ChevronRight className="w-8 h-8" /></button>
            </div>

            <div className="h-24 bg-white/5 border-t border-white/5 px-10 flex items-center justify-center overflow-x-auto gap-4 scrollbar-none">
              {gallery.map((img: any, i: number) => (
                <button 
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={cn(
                    "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0",
                    selectedIndex === i ? "border-primary scale-110 shadow-lg" : "border-transparent opacity-40 hover:opacity-100"
                  )}
                >
                  <img src={img.url} className="w-full h-full object-cover" alt="thumb" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
