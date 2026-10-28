"use client"

import { useState, useEffect, useRef } from "react"
import { useFirebase } from "@/firebase"
import {
  ref,
  push,
  increment,
  update as dbUpdate,
  get,
} from "firebase/database"
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useInView,
} from "framer-motion"
import {
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Clock,
  Trophy,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Loader2,
  Users,
  Award,
  Calendar,
  Building2,
  Smartphone,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Footer } from "@/components/footer"
import { DetailedCourseCard } from "@/components/detailed-course-card"
import { EnquiryModal } from "@/components/enquiry-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { Navbar } from "@/components/navbar"
import { MarqueeSection } from "@/components/marquee-section"
import { useInstituteData } from "@/hooks/use-institute-data"

// ─── STATIC BRANDING ─────────────────────────────────────────────
const BRANCH_NAME = "Rakesh Education"
const BRANCH_LOGO = "https://ik.imagekit.io/gnzjd77mb/WhatsApp%20Image%202026-03-19%20at%2011.05.32.jpeg?updatedAt=1773989799436"
const MAIN_UID = process.env.NEXT_PUBLIC_DB_SLUG || "demo-slug" // Fetching from shared DB but using static data

// ─── STATIC CONTENT ──────────────────────────────────────────────
const STATIC_HERO = {
  title: "Welcome to Rakesh Education",
  description: "Your gateway to excellence in competitive exams and academic success. Join our specialized batches for 6th to 12th standards and crack your dream career goals with expert guidance.",
  buttonText: "Explore Courses",
  slides: [
    { imageUrl: "https://images.unsplash.com/photo-1523050853064-8504f2f40055?q=80&w=2070&auto=format&fit=crop" },
    { imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2132&auto=format&fit=crop" },
    { imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb28f74b671?q=80&w=2070&auto=format&fit=crop" },
  ]
}

const STATIC_ABOUT = {
  badge: "About Rakesh Education",
  title: "Empowering Students Since 2009",
  description1: "Rakesh Education has been at the forefront of quality training for over 15 years. We provide a nurturing environment where students are encouraged to push their boundaries and achieve academic brilliance.",
  description2: "Our methodology focuses on conceptual clarity, rigorous practice sessions, and personal mentorship. We believe in building foundations that last a lifetime.",
  imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
}

const STATIC_GALLERY = [
  { id: 1, url: "https://images.unsplash.com/photo-1523050853064-8504f2f40055?q=80&w=2070", title: "Smart Classrooms" },
  { id: 2, url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2132", title: "Physics Lab" },
  { id: 3, url: "https://images.unsplash.com/photo-1524178232363-1fb28f74b671?q=80&w=2070", title: "Modern Library" },
  { id: 4, url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070", title: "Group Discussions" },
  { id: 5, url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=2070", title: "Science Exhibition" },
  { id: 6, url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070", title: "Cultural Event" },
]

const STATIC_STATS = [
  { id: 's1', label: "Years", value: 15, suffix: "+", subLabel: "of Excellence", icon: 'Award', color: 'bg-amber-50 border-amber-100' },
  { id: 's2', label: "Students", value: 45000, suffix: "+", subLabel: "Trained", icon: 'Users', color: 'bg-blue-50 border-blue-100' },
  { id: 's3', label: "Success", value: 96, suffix: "%", subLabel: "Placement Rate", icon: 'Trophy', color: 'bg-emerald-50 border-emerald-100' },
  { id: 's4', label: "Faculty", value: 68, suffix: "+", subLabel: "Expert Mentors", icon: 'GraduationCap', color: 'bg-purple-50 border-purple-100' },
]

const STATIC_COURSES = [
  { id: 'c1', name: "Academic Excellence (Class 6th-8th)", description: "Foundation program for middle school students focusing on Mathematics and Science with activity-based learning.", type: "Foundation", sellingPrice: 15000, originalPrice: 20000, image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600" },
  { id: 'c2', name: "Secondary Foundation (Class 9th-10th)", description: "Integrated board and competitive foundation for consistent academic success in high school.", type: "Regular", sellingPrice: 25000, originalPrice: 35000, image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600" },
  { id: 'c3', name: "JEE (Main & Adv) Mastery", description: "Targeted program for engineering aspirants with focus on Physics, Chemistry, and Advanced Mathematics.", type: "Competitive", sellingPrice: 85000, originalPrice: 100000, image: "https://images.unsplash.com/photo-1524178232363-1fb28f74b671?auto=format&fit=crop&q=80&w=600" },
  { id: 'c4', name: "NEET UG Entrance Prep", description: "Comprehensive coaching for medical aspirants with intensive Biology and Chemistry practical sessions.", type: "Medical", sellingPrice: 95000, originalPrice: 110000, image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=600" },
  { id: 'c5', name: "Science Higher Secondary (11th-12th)", description: "Rigorous academic coaching for Class 11 & 12 Science stream with regular mock tests.", type: "Regular", sellingPrice: 45000, originalPrice: 55000, image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=600" },
  { id: 'c6', name: "Commerce & CA Foundation", description: "Expert faculty for Accounting, Business Studies and CA preparation for future financial leaders.", type: "Professional", sellingPrice: 35000, originalPrice: 45000, image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600" },
]

const STAT_ICONS: Record<string, any> = {
  Award: Award, Users: Users, Building2: Building2, Smartphone: Smartphone,
  GraduationCap: GraduationCap, Trophy: Trophy, Zap: Zap
}

// ─── REUSABLE ANIMATIONS ─────────────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
}

export default function RakeshEducationBranchPage() {
  const { database } = useFirebase()
  const { profile, settings, courses, isLoading } = useInstituteData(MAIN_UID)

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: "", phone: "", course: "", message: "" })

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center', slidesToScroll: 1, containScroll: 'trimSnaps' })

  // Analytics
  useEffect(() => {
    if (!database || !MAIN_UID) return
    dbUpdate(ref(database, `Institutes/${MAIN_UID}/analytics`), { websiteVisitors: increment(1) }).catch(console.error)
  }, [database])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || isSubmitting) return
    setIsSubmitting(true)
    try {
      await push(ref(database, `Institutes/${MAIN_UID}/website_inquiries`), {
        ...formData,
        submittedAt: new Date().toISOString(),
        status: "New",
        branch: BRANCH_NAME
      })
      setIsSubmitted(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  const displayedCourses = courses?.length > 0 ? courses : []
  const sectionPadding = { paddingTop: '100px', paddingBottom: '100px' }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden selection:bg-primary/20 font-public-sans">
      
      <Navbar
        profile={profile}
        instituteName={BRANCH_NAME}
        instituteId={MAIN_UID}
        customLogo={BRANCH_LOGO}
        onApplyClick={() => { setIsSubmitted(false); setIsApplyModalOpen(true) }}
      />

      <div className="pt-[104px] lg:pt-[128px] bg-[#f8fafc]">
        {/* MARQUEE */}
        <div className="pb-8 lg:pb-12">
          <MarqueeSection 
            settings={{
              text: `Welcome to ${BRANCH_NAME} - Empowering Students for a Brighter Future! | Admissions Open for 2026-27 | Call us at ${profile?.phone || '+91 98765 43210'}`,
              backgroundColor: settings?.styling?.marqueeBg || "#1e3a8a",
              textColor: settings?.styling?.marqueeText || "#ffffff",
              speed: 50,
              fontFamily: "Poppins",
              isVisible: true
            }} 
          />
        </div>

        {/* HERO */}
        <section id="home" className="relative flex items-center bg-[#f8fafc] overflow-hidden min-h-[500px] lg:min-h-[700px]">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 -skew-x-12 transform origin-top-right translate-x-32 hidden lg:block" />
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full relative z-10">
            <motion.div {...fadeIn} className="space-y-6 lg:space-y-8 py-10 lg:py-0">
              <h1 className="text-4xl lg:text-7xl font-black leading-[1.1] tracking-tight text-black">
                {STATIC_HERO.title}
              </h1>
              <p className="text-lg lg:text-xl font-medium leading-relaxed max-w-xl text-black">
                {STATIC_HERO.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                  className="h-12 lg:h-14 px-8 lg:px-12 bg-primary hover:opacity-90 text-white rounded-xl lg:rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 w-full sm:w-auto">
                  {STATIC_HERO.buttonText} <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
            <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="relative flex items-center justify-center lg:justify-end pb-10 lg:pb-0 w-full h-[300px] lg:h-[500px]">
              <VarietySlider slides={STATIC_HERO.slides} />
            </motion.div>
          </div>
        </section>
      </div>

      {/* COURSES */}
      <section id="courses" style={sectionPadding} className="bg-zinc-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black text-black tracking-tight">Our Specialized Courses</h2>
            <p className="text-lg text-black font-medium max-w-2xl mx-auto">Expertly crafted courses for secondary and higher secondary students to excel in academics and competitive exams.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {STATIC_COURSES.map((course, i) => (
              <motion.div key={course.id} {...fadeIn} transition={{ delay: i * 0.05 }}>
                <div onClick={() => { setFormData({ ...formData, course: course.name }); setIsApplyModalOpen(true); }} className="block h-full group cursor-pointer">
                  <DetailedCourseCard course={course} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white border-y border-zinc-100 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tight">Milestones of Excellence</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STATIC_STATS.map((stat, i) => {
              const IconComp = STAT_ICONS[stat.icon] || Award
              return (
                <motion.div key={stat.id} {...fadeIn} transition={{ delay: i * 0.07 }}>
                  <Card className={cn("border-none shadow-sm rounded-3xl p-8 text-center hover:shadow-xl transition-all duration-500", stat.color)}>
                    <IconComp className="w-12 h-12 mx-auto mb-6 text-primary" />
                    <h4 className="text-4xl lg:text-5xl font-black text-primary">
                      <AnimatedCounter value={stat.value} />{stat.suffix}
                    </h4>
                    <p className="text-xl font-bold mt-3 text-black">{stat.label}</p>
                    {stat.subLabel && <p className="text-[14px] text-zinc-600 mt-1 font-medium">{stat.subLabel}</p>}
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ABOUT US */}
      <section id="about" style={sectionPadding} className="bg-zinc-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div {...fadeIn} className="relative">
            <div className="rounded-[3rem] overflow-hidden shadow-2xl relative z-10 border-[12px] border-white">
              <img src={STATIC_ABOUT.imageUrl} className="w-full aspect-[4/5] object-cover" alt="About Rakesh Education" />
            </div>
            <div className="absolute -bottom-10 -right-10 p-8 bg-white shadow-2xl rounded-3xl z-20 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Trophy className="w-10 h-10" /></div>
                <div>
                   <p className="text-3xl font-black text-black">15+</p>
                   <p className="text-[14px] font-bold text-zinc-600 tracking-wider">Years of Success</p>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="space-y-8">
            <div className="space-y-4">
              <span className="text-primary font-black text-[14px] tracking-[0.3em] uppercase">{STATIC_ABOUT.badge}</span>
              <h2 className="text-4xl lg:text-6xl font-black text-black tracking-tight leading-[1.1]">{STATIC_ABOUT.title}</h2>
            </div>
            <div className="space-y-6 text-zinc-700 text-lg leading-relaxed font-medium">
              <p>{STATIC_ABOUT.description1}</p>
              <p>{STATIC_ABOUT.description2}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* DIRECTOR MESSAGES */}
      <section style={sectionPadding} className="bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black text-black tracking-tight">Leadership Messages</h2>
            <p className="text-lg text-black font-medium max-w-2xl mx-auto">Insightful thoughts from the visionaries behind Rakesh Education.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
            {(settings?.about?.directorMessages || []).slice(0, 2).map((director: any, i: number) => (
              <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                <Card className="bg-[#f8fafc] rounded-[3rem] p-10 lg:p-14 shadow-sm border border-zinc-100 h-full relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-center text-center md:text-left">
                    <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white shrink-0">
                      <img 
                        src={director.imageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200"} 
                        alt={director.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-3xl font-black text-black tracking-tight">{director.name || "Director Name"}</h4>
                       <p className="text-primary font-bold text-[14px] tracking-[0.2em] uppercase">{director.designation || "Director Designation"}</p>
                    </div>
                  </div>
                  <div className="mt-10 relative">
                     <p className="text-[14px] lg:text-xl text-zinc-700 leading-relaxed font-medium italic whitespace-pre-wrap">
                       "{director.message || "Quality education is the key to a bright future. We are dedicated to providing the best learning experience."}"
                     </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" style={sectionPadding} className="bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
             <h2 className="text-4xl lg:text-7xl font-black text-black tracking-tight">Our Gallery</h2>
             <p className="text-lg text-black font-medium max-w-2xl mx-auto">Explore our premium facilities and vibrant educational environment at Rakesh Education.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STATIC_GALLERY.map((img, i) => (
              <motion.div 
                key={img.id} 
                {...fadeIn} 
                transition={{ delay: i * 0.05 }}
                className="group relative rounded-[2.5rem] overflow-hidden aspect-[4/3] cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500"
              >
                <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={img.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8">
                   <p className="text-white text-2xl font-black translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{img.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={sectionPadding} className="bg-zinc-900 text-white selection:bg-primary/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeIn} className="space-y-12">
              <div>
                <h2 className="text-4xl lg:text-6xl font-black">Let's Talk About Your Future</h2>
                <p className="mt-6 text-xl text-zinc-400">Get in touch with our expert academic counsellors today.</p>
              </div>
              <div className="space-y-8">
                <ContactInfo icon={<Phone />} label="Academic Helpline" value={profile?.phone || "+91 98765 43210"} />
                <ContactInfo icon={<Mail />} label="Email Address" value={profile?.email || "info@rakesheducation.com"} />
                <ContactInfo icon={<MapPin />} label="Campus Location" value={profile?.address || "Ahmedabad, Gujarat"} />
              </div>
            </motion.div>

            <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="bg-white rounded-[3rem] shadow-2xl p-10 lg:p-14 text-black relative overflow-hidden">
              {isSubmitted ? (
                <div className="py-20 text-center space-y-8">
                  <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-14 h-14 text-green-600" />
                  </div>
                  <h3 className="text-4xl font-black">Query Received!</h3>
                  <p className="text-lg text-zinc-600 font-medium">Our team will call you back within 24 hours.</p>
                  <Button onClick={() => setIsSubmitted(false)} variant="outline" className="rounded-full px-8">Send Another</Button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <Label className="text-[14px] font-bold uppercase tracking-wider ml-1">Full Name</Label>
                       <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="h-14 rounded-2xl bg-zinc-50 border-none px-6" placeholder="Your Name" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[14px] font-bold uppercase tracking-wider ml-1">Phone Number</Label>
                       <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required className="h-14 rounded-2xl bg-zinc-50 border-none px-6" placeholder="10-digit number" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[14px] font-bold uppercase tracking-wider ml-1">Course Interest</Label>
                    <Select value={formData.course} onValueChange={val => setFormData({ ...formData, course: val })}>
                      <SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-none px-6 text-lg font-medium">
                        <SelectValue placeholder="Select Course" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {displayedCourses.map(c => <SelectItem key={c.id} value={c.name} className="py-3 font-medium">{c.name}</SelectItem>)}
                        <SelectItem value="other" className="py-3 font-medium">Other Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[14px] font-bold uppercase tracking-wider ml-1">Your Message</Label>
                    <Textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="min-h-[160px] rounded-2xl bg-zinc-50 border-none px-6 py-4 text-lg" placeholder="Ask anything..." />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-primary hover:opacity-90 text-white rounded-2xl font-black text-xl shadow-xl transition-all">
                    {isSubmitting ? "Processing..." : "Submit Inquiry"}
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <Footer profile={profile} settings={settings} instituteName={BRANCH_NAME} courses={courses} customLogo={BRANCH_LOGO} />

      <EnquiryModal
        isOpen={isApplyModalOpen}
        onOpenChange={setIsApplyModalOpen}
        resolvedUid={MAIN_UID}
        displayedCourses={STATIC_COURSES}
        branchName={BRANCH_NAME}
      />
    </div>
  )
}

function VarietySlider({ slides }: { slides: any[] }) {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 3500, stopOnInteraction: false })])
  return (
    <div className="overflow-hidden rounded-[3rem] shadow-2xl h-full w-full" ref={emblaRef}>
      <div className="flex h-full">
        {slides.map((s, i) => (
          <div key={i} className="flex-[0_0_100%] min-w-0 h-full relative">
            <img src={s.imageUrl} className="w-full h-full object-cover" alt="Slide" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ContactInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-6 group">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 transform group-hover:rotate-6">
        {icon}
      </div>
      <div>
        <p className="text-[14px] font-black text-primary uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  )
}

function AnimatedCounter({ value, duration = 3 }: { value: number; duration?: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, Math.round)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (inView) animate(count, value, { duration, ease: "easeOut" })
  }, [value, inView])
  return <motion.span ref={ref}>{rounded}</motion.span>
}
