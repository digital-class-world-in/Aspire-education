"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useInstituteData } from "@/hooks/use-institute-data"
import { useSEO } from "@/hooks/use-seo"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import {
  ChevronRight,
  GraduationCap,
  Award,
  Users,
  Zap,
  Eye,
  Target,
  BookOpen,
  Globe,
  Monitor,
  Clock,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MissingContentPlaceholder } from "@/components/missing-content-placeholder"
import { EnquiryModal } from "@/components/enquiry-modal"
import { InfrastructureCycle } from "@/components/infrastructure-cycle"
import { Loader } from "@/components/loader"

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, ease: "easeOut" },
}

const DEFAULT_CONTENT = {
  instituteName: "Our Institute",
  instituteTagline: "Empowering Students Through Quality Education",
  title: "A Legacy of Excellence Since 1997",
  description1:
    "We are committed to delivering quality education and holistic student development. With modern infrastructure and expert faculty, we prepare students for a bright future in a rapidly evolving world.",
  description2:
    "With over 25 years of experience in education, our institute has produced thousands of successful graduates who are leading in their respective fields across the globe.",
  imageUrl:
    "https://placehold.co/600x450/3b82f6/ffffff/png?text=Our+Institute",
  learningTitle: "Learning Without Limits",
  learningDescription:
    "Our flexible learning ecosystem blends live classes with recorded lectures, allowing students to learn at their own pace. Whether on campus or online, you get the same world-class education seamlessly delivered through our digital infrastructure.",
  learningImage:
    "https://placehold.co/600x450/10b981/ffffff/png?text=Online+Learning",
  vision:
    "To become a leading educational institution that nurtures talent and fosters innovation through excellence in education, producing globally competitive graduates.",
  mission:
    "To provide a dynamic, inclusive learning environment that promotes academic excellence, practical skill development, and ethical leadership for a better tomorrow.",
  whyChooseUs: [
    { title: "Years of Excellence", description: "25+ years of consistent academic quality and innovation.", icon: "Award" },
    { title: "Expert Faculty", description: "Handpicked industry professionals and PhD holders.", icon: "Users" },
    { title: "Smart Learning", description: "AI-powered LMS and digital classroom infrastructure.", icon: "Monitor" },
    { title: "Global Recognition", description: "Globally recognized degrees and industry partnerships.", icon: "Globe" },
  ],
  rankingTitle: "Recognized Excellence",
  rankingSubtitle: "Dedicated to Student Success",
}

const WHY_ICONS: Record<string, any> = {
  Award,
  Users,
  Monitor,
  Globe,
  GraduationCap,
  Zap,
  BookOpen,
  Clock,
  Star,
}

export default function AboutPage() {
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

  const content = { ...DEFAULT_CONTENT, ...(settings?.about || {}) }

  const rawInstituteName = instituteName || content.instituteName || "Our Institute"
  const upperInstituteName = rawInstituteName.toUpperCase()

  useSEO(
    settings?.seo?.about?.title || `About Us - ${upperInstituteName}`,
    settings?.seo?.about?.description,
    "about",
    upperInstituteName
  )

  if (isLoading) {
    return <Loader />
  }

  const isContentMissing =
    !settings?.about?.title && !settings?.about?.description1

  const whyItems = content.whyChooseUs || DEFAULT_CONTENT.whyChooseUs

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: settings?.styling?.fontFamily || "Poppins" }}>
      {/* ─── NAVBAR ─── */}
      <Navbar
        profile={{ ...profile, ...content }}
        instituteName={instituteName || content.instituteName}
        onApplyClick={() => setIsEnquiryOpen(true)}
      />

      {isContentMissing ? (
        <main className="flex-1 bg-gray-50 flex items-center justify-center pt-20">
          <MissingContentPlaceholder pageName="About Us" />
        </main>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════
              1. HERO BANNER — gradient background + breadcrumb
          ═══════════════════════════════════════════════════════════ */}
          <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden bg-gradient-to-br from-primary/10 via-rose-50 to-orange-50">
            {/* decorative shapes */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-100/40 rounded-full -ml-40 -mb-40 blur-3xl" />

            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-6">
              <nav className="flex items-center justify-center gap-2 text-[14px] font-semibold text-black">
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-primary font-bold">About Us</span>
              </nav>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-black tracking-tight leading-[0.95]">
                About Our Institute
              </h1>
              <p className="text-lg md:text-xl text-black font-medium max-w-2xl mx-auto leading-relaxed">
                {content.instituteTagline || DEFAULT_CONTENT.instituteTagline}
              </p>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              2. ABOUT INSTITUTE — image left, text right
          ═══════════════════════════════════════════════════════════ */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Left: Image */}
                <motion.div {...fadeIn} className="relative">
                  <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-zinc-100">
                    <img
                      src={content.imageUrl}
                      alt={`${instituteName || content.instituteName} Campus`}
                      className="w-full h-auto object-cover aspect-[4/3]"
                    />
                  </div>
                  {/* accent shape */}
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-2xl -z-10" />
                  <div className="absolute -top-4 -left-4 w-16 h-16 bg-orange-100 rounded-xl -z-10" />
                </motion.div>

                {/* Right: Text */}
                <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="space-y-6">
                  <span className="text-primary font-black text-[14px] tracking-[0.25em]">Who We Are</span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-black tracking-tight leading-[1.1]">
                    {content.title}
                  </h2>
                  <p className="text-[14px] md:text-lg text-black leading-relaxed whitespace-pre-wrap">
                    {content.description1}
                  </p>
                  {content.description2 && (
                    <p className="text-[14px] md:text-lg text-black leading-relaxed whitespace-pre-wrap">
                      {content.description2}
                    </p>
                  )}
                  <Button
                    onClick={() => setIsEnquiryOpen(true)}
                    className="h-12 px-8 bg-primary text-white rounded-xl font-bold text-[14px] tracking-widest shadow-lg border-none hover:opacity-90 active:scale-95 transition-all"
                  >
                    Get In Touch <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              3. LEARNING WITHOUT LIMITS — text left, image right
          ═══════════════════════════════════════════════════════════ */}
          <section className="py-20 md:py-28 bg-zinc-50">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Left: Text */}
                <motion.div {...fadeIn} className="space-y-6 order-2 md:order-1">
                  <span className="text-primary font-black text-[14px] tracking-[0.25em]">Flexible Education</span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-black tracking-tight leading-[1.1]">
                    {content.learningTitle || DEFAULT_CONTENT.learningTitle}
                  </h2>
                  <p className="text-[14px] md:text-lg text-black leading-relaxed whitespace-pre-wrap">
                    {content.learningDescription || DEFAULT_CONTENT.learningDescription}
                  </p>
                </motion.div>

                {/* Right: Image */}
                <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="relative order-1 md:order-2">
                  <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-zinc-100">
                    <img
                      src={content.learningImage || DEFAULT_CONTENT.learningImage}
                      alt="Learning"
                      className="w-full h-auto object-cover aspect-[4/3]"
                    />
                  </div>
                  <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/10 rounded-2xl -z-10" />
                </motion.div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              4. VISION & MISSION — red gradient background, white cards
          ═══════════════════════════════════════════════════════════ */}
          <section className="py-20 md:py-28 bg-gradient-to-br from-primary via-rose-600 to-red-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center mb-16 space-y-4">
                <span className="text-white/70 font-black text-[14px] tracking-[0.3em]">Our Foundation</span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">Vision & Mission</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Vision Card */}
                <motion.div {...fadeIn}>
                  <Card className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 lg:p-12 shadow-2xl border-none h-full group hover:bg-white transition-all duration-500">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                      <Eye className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-black text-black tracking-tight mb-6">Our Vision</h3>
                    <p className="text-[14px] lg:text-lg text-black leading-relaxed font-medium whitespace-pre-wrap">{content.vision}</p>
                  </Card>
                </motion.div>

                {/* Mission Card */}
                <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
                  <Card className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 lg:p-12 shadow-2xl border-none h-full group hover:bg-white transition-all duration-500">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                      <Target className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-black text-black tracking-tight mb-6">Our Mission</h3>
                    <p className="text-[14px] lg:text-lg text-black leading-relaxed font-medium whitespace-pre-line">{content.mission}</p>
                  </Card>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              4.5 DIRECTOR MESSAGES — 2 cards
          ═══════════════════════════════════════════════════════════ */}
          <section className="py-20 md:py-28 bg-[#FDF2F2]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16 space-y-4">
                <span className="text-primary font-black text-[14px] tracking-[0.25em]">Leadership</span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-black tracking-tight leading-[1.1]">
                  Message from our Directors
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
                {(content.directorMessages || []).slice(0, 2).map((director: any, i: number) => (
                  <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                    <Card className="bg-white rounded-[40px] p-8 lg:p-12 shadow-xl border border-rose-100 h-full relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl overflow-hidden shadow-lg border-4 border-rose-50 shrink-0">
                          <img 
                            src={director.imageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200"} 
                            alt={director.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black text-black tracking-tight">{director.name || "Director Name"}</h4>
                          <p className="text-primary font-bold text-[14px] tracking-widest uppercase">{director.designation || "Director Designation"}</p>
                        </div>
                      </div>
                      <div className="mt-8 relative">
                        <span className="absolute -top-6 -left-2 text-primary/10 text-8xl font-serif">"</span>
                        <p className="text-[14px] lg:text-lg text-black leading-relaxed font-medium relative z-10 italic whitespace-pre-wrap">
                          {director.message || "Enter director's message here..."}
                        </p>
                        <div className="flex justify-end mt-4">
                           <span className="text-primary/10 text-8xl font-serif rotate-180 -mb-10">"</span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              5. WHY CHOOSE US — 4-column icon grid
          ═══════════════════════════════════════════════════════════ */}
          <section id="why-choose-us" className="py-20 md:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16 space-y-4">
                <span className="text-primary font-black text-[14px] tracking-[0.25em]">Our Strengths</span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-black tracking-tight">
                  Why We Are Students' No.1 Choice
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {whyItems.map((item: any, i: number) => {
                  const IconComp = WHY_ICONS[item.icon] || Award
                  return (
                    <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                      <Card className="p-8 lg:p-10 text-center rounded-3xl border border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-500 group hover:-translate-y-1 bg-white h-full">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                          <IconComp className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="text-lg font-black text-black tracking-tight mb-3">{item.title}</h4>
                        <p className="text-[14px] text-black leading-relaxed font-medium">{item.description}</p>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>

        </>
      )}

      {/* ─── FOOTER ─── */}
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
