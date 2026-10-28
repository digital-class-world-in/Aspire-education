"use client"

import { useInstituteData } from "@/hooks/use-institute-data"
import { useSEO } from "@/hooks/use-seo"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroBanner } from "@/components/hero-banner"
import { motion } from "framer-motion"
import { DetailedCourseCard } from "@/components/detailed-course-card"
import { MissingContentPlaceholder } from "@/components/missing-content-placeholder"
import { EnquiryModal } from "@/components/enquiry-modal"
import { useState } from "react"
import Link from "next/link"
import { Loader } from "@/components/loader"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
}

export default function CoursesPage() {
  const { 
    profile, 
    settings, 
    courses, 
    isLoading, 
    instituteName,
    resolvedUid
  } = useInstituteData()

  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(6)

  const upperInstituteName = instituteName?.toUpperCase() || "OUR INSTITUTE"

  useSEO(
    settings?.seo?.courses?.title || `Our Courses - ${upperInstituteName}`,
    settings?.seo?.courses?.description || `Explore our comprehensive range of academic courses designed to help you achieve your career goals at ${upperInstituteName}.`
  )

  if (isLoading) {
    return <Loader />
  }

  const displayedCourses = courses?.length > 0 ? courses : []

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: settings?.styling?.fontFamily || 'Poppins' }}>
      <Navbar profile={profile} instituteName={instituteName} onApplyClick={() => setIsEnquiryOpen(true)} />
      
      <HeroBanner 
        title="Our Courses" 
        subtitle="Choose from our wide range of professional and academic programs."
        breadcrumb={[{ label: "Courses", href: "/courses" }]}
      />

      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          {displayedCourses.length === 0 ? (
            <MissingContentPlaceholder pageName="Courses" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedCourses.slice(0, visibleCount).map((course: any, i: number) => (
                  <motion.div key={course.id || i} {...fadeIn} transition={{ delay: (i % 6) * 0.1 }}>
                    <Link href={`/course/${encodeURIComponent((course.name || course.id).toLowerCase().replace(/\s+/g, '-'))}`} className="block h-full group">
                      <DetailedCourseCard course={course} />
                    </Link>
                  </motion.div>
                ))}
              </div>
              
              {displayedCourses.length > visibleCount && (
                <div className="mt-16 flex justify-center">
                  <Button 
                    onClick={() => setVisibleCount(prev => prev + 6)}
                    className="h-14 px-10 bg-white text-black border-2 border-zinc-200 hover:bg-zinc-50 rounded-2xl font-black text-[14px] tracking-widest transition-all active:scale-95 shadow-lg flex items-center gap-2"
                  >
                    Show More Courses <ChevronDown className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </>
          )}
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
        displayedCourses={displayedCourses} 
      />
    </div>
  )
}
