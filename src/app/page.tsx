"use client"

import { useState, useEffect, useRef } from "react"
import { useFirebase } from "@/firebase"
import { useSEO } from "@/hooks/use-seo"
import { Navbar } from "@/components/navbar"
import {
  ref,
  onValue,
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
  Facebook,
  Instagram,
  Youtube,
  CheckCircle2,
  Loader2,
  X,
  Users,
  Award,
  Calendar,
  ChevronDown,
  Building2,
  Smartphone,
  Zap,
  Menu,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { format } from "date-fns"
import { Loader } from "@/components/loader"
import { MarqueeSection } from "@/components/marquee-section"

// Animations
const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
}

// Rich Default Data
const DEFAULT_HERO = {
  title: "What is Lorem Ipsum?",
  description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
  buttonText: "Explore More",
  slides: [
    { imageUrl: "https://placehold.co/800x1000/3b82f6/ffffff/png?text=Hero+Slide+1" },
    { imageUrl: "https://placehold.co/800x1000/8b5cf6/ffffff/png?text=Hero+Slide+2" },
    { imageUrl: "https://placehold.co/800x1000/ec4899/ffffff/png?text=Hero+Slide+3" },
  ]
}

const DEFAULT_ABOUT = {
  badge: "About Us",
  title: "What is Lorem Ipsum?",
  description1: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  description2: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  imageUrl: "https://placehold.co/800x1000/10b981/ffffff/png?text=About+Us+Image"
}

const DEFAULT_MISSION = [
  {
    title: "Master Office Tools",
    description: "Expertise in Word, Excel, and PowerPoint for professional productivity.",
    icon: CheckCircle2
  },
  {
    title: "Creative Design",
    description: "Develop skills in graphic design, branding, and digital content creation.",
    icon: CheckCircle2
  },
  {
    title: "AI & Tech Basics",
    description: "Understand the fundamentals of Artificial Intelligence and modern tech.",
    icon: CheckCircle2
  },
  {
    title: "Mind Mastery",
    description: "Learn techniques for mental focus, clarity, and personal growth.",
    icon: CheckCircle2
  }
]

const DEFAULT_BLOGS = [
  { id: 'demo-blog-01', title: "Top Career Options After 12th in 2026", category: "Career Guidance", image: "https://placehold.co/600x400/3b82f6/ffffff/png?text=Blog+1", description: "Discover the most promising career paths with high salary and growth potential.", date: "March 20, 2025", readTime: "8 min" },
  { id: 'demo-blog-02', title: "Why Skill-Based Learning Is The Future", category: "Education Trends", image: "https://placehold.co/600x400/10b981/ffffff/png?text=Blog+2", description: "Traditional degrees are important, but practical skills are becoming the real currency.", date: "March 18, 2025", readTime: "6 min" },
  { id: 'demo-blog-03', title: "How to Prepare for Competitive Exams", category: "Exam Tips", image: "https://placehold.co/600x400/ec4899/ffffff/png?text=Blog+3", description: "Proven strategies and time management techniques that helped our students crack top exams.", date: "March 15, 2025", readTime: "10 min" }
]

const DEFAULT_COURSES = [
  {
    id: 'c1',
    slug: 'demo-course-1',
    name: "Advanced Tally + GST Certification",
    description: "Master complete accounting, GST billing, inventory management and financial reporting with industry-standard software. 100% practical training with live projects.",
    image: "https://placehold.co/600x400/3b82f6/ffffff/png?text=Tally+Course",
    type: "Long Term",
    sellingPrice: 24999,
    originalPrice: 34999,
    showOnHomepage: true
  },
  {
    id: 'c2',
    slug: 'demo-course-2',
    name: "Digital Marketing Masterclass",
    description: "Learn SEO, Social Media Marketing, Google Ads, Facebook Ads, Content Creation and Analytics. Get certified and start earning from day one.",
    image: "https://placehold.co/600x400/10b981/ffffff/png?text=Digital+Marketing",
    type: "Crash Course",
    sellingPrice: 18999,
    originalPrice: 25999,
    showOnHomepage: true
  },
  {
    id: 'c3',
    slug: 'demo-course-3',
    name: "Spoken English & Personality Development",
    description: "Improve your communication skills, confidence, interview techniques and overall personality. Special focus on grammar, vocabulary and public speaking.",
    image: "https://placehold.co/600x400/ec4899/ffffff/png?text=English+Course",
    type: "Foundation",
    sellingPrice: 8999,
    originalPrice: 12999,
    showOnHomepage: true
  }
]

const DEFAULT_TESTIMONIALS = [
  { name: "Priya Sharma", role: "Tally Student 2025", message: "The practical approach helped me get placed in a reputed CA firm within 2 months.", image: null },
  { name: "Rahul Patel", role: "Digital Marketing Student", message: "I started my own agency after completing this course.", image: null },
  { name: "Neha Gupta", role: "English Batch 2025", message: "My confidence level has increased tremendously.", image: null }
]

const DEFAULT_STATS = [
  { id: 's1', label: "Years", value: 15, suffix: "+", subLabel: "of Excellence", icon: 'Award', color: 'bg-amber-50 border-amber-100' },
  { id: 's2', label: "Students", value: 45000, suffix: "+", subLabel: "Trained", icon: 'Users', color: 'bg-blue-50 border-blue-100' },
  { id: 's3', label: "Success", value: 96, suffix: "%", subLabel: "Placement Rate", icon: 'Trophy', color: 'bg-emerald-50 border-emerald-100' },
  { id: 's4', label: "Faculty", value: 68, suffix: "+", subLabel: "Expert Mentors", icon: 'GraduationCap', color: 'bg-purple-50 border-purple-100' },
]

const STAT_ICONS: Record<string, any> = {
  Award: Award, Users: Users, Building2: Building2, Smartphone: Smartphone,
  GraduationCap: GraduationCap, Trophy: Trophy, Zap: Zap
}

export default function InstitutePublicWebsite() {
  const router = useRouter()
  // Fallback to Aspire Education credentials
  const defaultUid = "FYQRMChCqPb64iM5hFvVlr2omyu2"
  const defaultSlug = "aspire-education-1rbp"
  const slug = process.env.NEXT_PUBLIC_DB_SLUG || process.env.NEXT_PUBLIC_DB_ID || defaultSlug
  const { database } = useFirebase()

  const [resolvedUid, setResolvedUid] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)

  const [courses, setCourses] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])

  const [formData, setFormData] = useState({ name: "", phone: "", course: "", message: "" })

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center', slidesToScroll: 1, containScroll: 'trimSnaps' })


  useEffect(() => {
    if (!database) return

    const resolveTenant = async () => {
      // 1. Try domain hostname resolution if running in browser
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
        if (!isLocal) {
          const fullHostname = hostname.replace('www.', '')
          const safeKey = fullHostname.replace(/\./g, '_')
          try {
            const domainSnap = await get(ref(database, `Slugs/${safeKey}`))
            if (domainSnap.exists() && domainSnap.val()) {
              setResolvedUid(domainSnap.val())
              return
            }
            const slugPart = fullHostname.split('.')[0]
            const subSnap = await get(ref(database, `Slugs/${slugPart}`))
            if (subSnap.exists() && subSnap.val()) {
              setResolvedUid(subSnap.val())
              return
            }
          } catch (e) {
            console.error("Domain slug resolution failed", e)
          }
        }
      }

      // 2. Try slug lookup
      try {
        const snap = await get(ref(database, `Slugs/${slug}`))
        if (snap.exists() && snap.val()) {
          setResolvedUid(snap.val())
          return
        }
      } catch (e) {
        console.error("Slug lookup failed", e)
      }

      // 3. Fallback to Aspire Education ID
      setResolvedUid(process.env.NEXT_PUBLIC_DB_ID || defaultUid)
    }

    resolveTenant()
  }, [database, slug])

  useEffect(() => {
    if (!database || !resolvedUid) return

    const rootPath = `Institutes/${resolvedUid}`

    dbUpdate(ref(database, `${rootPath}/analytics`), { websiteVisitors: increment(1) }).catch(console.error)

    // Fallback safety timeout so page never gets stuck in infinite loader
    const safetyTimer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    const unsubs: Array<() => void> = []

    unsubs.push(onValue(ref(database, `${rootPath}/profile`), (snap) => {
      if (snap.exists()) setProfile(snap.val())
    }))

    unsubs.push(onValue(ref(database, `${rootPath}/website_settings`), (snap) => {
      if (snap.exists()) setSettings(snap.val())
      setIsLoading(false)
    }))

    unsubs.push(onValue(ref(database, `${rootPath}/website_courses`), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id }))
        .filter(c => c.status !== 'Draft')
      setCourses(list)
    }))

    unsubs.push(onValue(ref(database, `${rootPath}/website_blogs`), (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id }))
      setBlogs(list.length > 0 ? list.reverse() : DEFAULT_BLOGS)
    }))

    return () => {
      clearTimeout(safetyTimer)
      unsubs.forEach(fn => fn())
    }
  }, [database, resolvedUid])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !resolvedUid || isSubmitting) return
    setIsSubmitting(true)
    try {
      await push(ref(database, `landing page enquiry`), {
        ...formData,
        submittedAt: new Date().toISOString(),
        status: "New"
      })
      setIsSubmitted(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Compute these before any early return so hooks are always called in the same order
  const safeSettings = settings ? {
    ...settings,
    visibility: {
      hero: true,
      about: true,
      courses: true,
      stats: true,
      testimonials: true,
      blog: true,
      contact: true,
      marquee: true,
      youtube: true,
    },
    marquee: settings.marquee || {
      text: "Welcome to VCEC - Empowering Students for a Brighter Future! | Admissions Open for 2026-27 | Call us at +91 98765 43210",
      backgroundColor: "#1e3a8a",
      textColor: "#ffffff",
      speed: 50,
      fontFamily: "Poppins",
      isVisible: true
    }
  } : {}
  const heroIsEmpty = !safeSettings.hero?.title?.trim()
  const displayedHero = heroIsEmpty ? DEFAULT_HERO : { ...DEFAULT_HERO, ...(safeSettings.hero || {}) }
  const rawInstituteName = process.env.NEXT_PUBLIC_INSTITUTE_NAME || profile?.instituteName || "EduFuture Academy"
  const instituteName = rawInstituteName // Already formatted from DB or env
  const envLogoUrl = process.env.NEXT_PUBLIC_LOGO_URL || ''
  const resolvedLogoUrl = envLogoUrl || profile?.logoUrl || ''

  useSEO(
    safeSettings.seo?.home?.title || `${displayedHero.title} - ${instituteName}`,
    safeSettings.seo?.home?.description || displayedHero.description,
    "home",
    instituteName
  )

  if (isLoading) {
    return <Loader />
  }

  const aboutIsEmpty = !safeSettings.about?.title?.trim()
  const displayedAbout = aboutIsEmpty ? DEFAULT_ABOUT : { ...DEFAULT_ABOUT, ...(safeSettings.about || {}) }

  const displayedStats = safeSettings.stats?.length > 0 ? safeSettings.stats : DEFAULT_STATS
  const displayedTestimonials = safeSettings.testimonials?.length > 0 ? safeSettings.testimonials : DEFAULT_TESTIMONIALS
  const displayedCourses = courses.length > 0 ? courses : DEFAULT_COURSES
  const displayedBlogs = blogs.length > 0 ? blogs : DEFAULT_BLOGS

  const sectionPadding = {
    paddingTop: `${safeSettings.styling?.sectionSpacing ?? 120}px`,
    paddingBottom: `${safeSettings.styling?.sectionSpacing ?? 120}px`
  }

  const publicContact = {
    phone: profile?.contactPhone || profile?.phone || safeSettings.contact?.phone || "+91 98765 43210",
    email: profile?.contactEmail || profile?.email || safeSettings.contact?.email || "info@yourinstitute.com",
    address: profile?.address || safeSettings.contact?.address || "Near Science City Road, Sola, Ahmedabad - 380060"
  }

  const heroTitleStyle = {
    fontSize: `clamp(2rem, 8vw, ${safeSettings.styling?.titleFontSize ?? 64}px)`,
    fontFamily: safeSettings.styling?.heroTitleFontFamily ? `'${safeSettings.styling.heroTitleFontFamily}', sans-serif` : 'inherit'
  }

  const heroDescStyle = {
    fontSize: `${safeSettings.styling?.descFontSize ?? 18}px`,
    fontFamily: safeSettings.styling?.heroDescFontFamily ? `'${safeSettings.styling.heroDescFontFamily}', sans-serif` : 'inherit'
  }

  const sliderStyle = {
    width: `${safeSettings.styling?.sliderWidth ?? 100}%`,
    height: `${safeSettings.styling?.sliderHeight ?? 550}px`,
  }

  return (
    <>

      <div className="min-h-screen bg-white overflow-x-hidden selection:bg-primary/20" style={{ fontFamily: safeSettings.styling?.fontFamily || 'Poppins' }}>

        {/* ==================== YOUR EXACT HEADER ==================== */}
        <Navbar
          profile={profile}
          instituteName={instituteName}
          onApplyClick={() => { setIsSubmitted(false); setIsApplyModalOpen(true) }}
        />

        {/* ==================== CONTENT WRAPPER (Accounting for fixed Navbar) ==================== */}
        <div className="pt-[104px] lg:pt-[128px] bg-[#f8fafc]">
          {/* MARQUEE SECTION */}
          {safeSettings.visibility?.marquee !== false && (
            <div className="pb-8 lg:pb-12">
              <MarqueeSection settings={safeSettings.marquee} />
            </div>
          )}

          {/* HERO SECTION */}
          {safeSettings.visibility?.hero !== false && (
            <section id="home" className="relative flex items-center bg-[#f8fafc] overflow-hidden min-h-[500px] lg:min-h-[700px]"
              style={{ minHeight: safeSettings.styling?.heroImageHeight ? `${safeSettings.styling.heroImageHeight}px` : undefined }}>
              <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 -skew-x-12 transform origin-top-right translate-x-32 hidden lg:block" />
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full relative z-10">
                <motion.div {...fadeIn} className="space-y-6 lg:space-y-8 py-10 lg:py-0">
                  <h1 className="font-black leading-[1.1] tracking-tight text-black" style={heroTitleStyle}>
                    {displayedHero.title}
                  </h1>
                  <p className="text-[14px] lg:text-lg font-medium leading-relaxed max-w-xl text-black" style={heroDescStyle}>
                    {displayedHero.description}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => router.push('/facilities')}
                      className="h-12 lg:h-14 px-8 lg:px-12 bg-primary hover:opacity-90 text-white rounded-xl lg:rounded-2xl font-black text-[14px] lg:text-[14px] tracking-widest shadow-xl lg:shadow-2xl border-none transition-all active:scale-95 w-full sm:w-auto">
                      {displayedHero.buttonText} <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
                <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="relative flex lg:flex items-center justify-center lg:justify-end pb-10 lg:pb-0 w-full"
                  style={sliderStyle}>
                  <VarietySlider slides={displayedHero.slides} height={safeSettings.styling?.sliderHeight || 500} />
                </motion.div>
              </div>
            </section>
          )}
        </div>

        {/* COURSES SECTION - Click opens details */}
        {safeSettings.visibility?.courses !== false && (
          <section id="courses" style={sectionPadding} className="bg-zinc-100 -mt-16 lg:-mt-2">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 space-y-6 lg:space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tight">Our Courses</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7">
                {courses.length === 0 ? (
                  // No real courses — show 3 demo cards each with their own slug URL
                  DEFAULT_COURSES.map((course, i) => (
                    <motion.div key={course.id} {...fadeIn} transition={{ delay: i * 0.06 }}>
                      <Link href={`/course/${course.slug}`} className="block h-full group">
                        <DetailedCourseCard course={course} />
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  displayedCourses.filter(c => c.showOnHomepage !== false).map((course, i) => (
                    <motion.div key={course.id} {...fadeIn} transition={{ delay: i * 0.06 }}>
                      <Link href={`/course/${encodeURIComponent((course.name || course.id).toLowerCase().replace(/\s+/g, '-'))}`} className="block h-full group">
                        <DetailedCourseCard course={course} />
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* STATS SECTION */}
        {safeSettings.visibility?.stats !== false && (
          <section className="bg-white border-y border-zinc-100 py-16 overflow-hidden">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 space-y-6 lg:space-y-8">
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black text-black tracking-tight pt-8 lg:pt-12"
                  style={{
                    color: safeSettings.milestoneHeading?.color || "#000000",
                    fontFamily: safeSettings.milestoneHeading?.fontFamily ? `'${safeSettings.milestoneHeading.fontFamily}', sans-serif` : 'inherit',
                  }}>
                  {safeSettings.milestoneHeading?.text || "Our Achievements"}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
                {displayedStats.map((stat: any, i: number) => {
                  const IconComp = STAT_ICONS[stat.icon] || Award
                  return (
                    <motion.div key={stat.id || i} {...fadeIn} transition={{ delay: i * 0.07 }}>
                      <Card className={cn("border shadow-sm rounded-xl p-6 text-center hover:shadow-lg transition", stat.color)}>
                        <IconComp className="w-10 h-10 mx-auto mb-4 text-primary" />
                        <h4 className="text-3xl lg:text-4xl font-black text-primary">
                          <AnimatedCounter value={stat.value} />{stat.suffix}
                        </h4>
                        <p className="text-lg font-semibold mt-2">{stat.label}</p>
                        {stat.subLabel && <p className="text-[14px] text-black">{stat.subLabel}</p>}
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ABOUT US SECTION */}
        {safeSettings.visibility?.about !== false && (
          <section id="about" style={{ ...sectionPadding, paddingTop: '60px', paddingBottom: '60px' }} className="bg-zinc-50">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
              {/* 4-Box Mission Grid replacing the Image */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:sticky lg:top-32">
                {(safeSettings.about?.facilities?.slice(0, 4) || DEFAULT_MISSION).map((item: any, i: number) => {
                  const IconComp = typeof item.icon === 'string' && STAT_ICONS[item.icon] ? STAT_ICONS[item.icon] : (item.icon && typeof item.icon !== 'string' ? item.icon : CheckCircle2);
                  return (
                    <motion.div
                      key={i}
                      {...fadeIn}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-500 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <IconComp className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="text-[14px] font-black text-black tracking-tight mb-3 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-[14px] text-black font-medium leading-relaxed">
                        {item.description || item.desc || "Facility offering top quality environment."}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
              <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl lg:text-6xl font-black text-black tracking-tight leading-[0.9]">{displayedAbout.title}</h2>
                </div>
                <div className="space-y-6 text-black text-lg leading-relaxed">
                  <p>{displayedAbout.description1}</p>
                  <p>{displayedAbout.description2}</p>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* BLOG SECTION */}
        {safeSettings.visibility?.blog !== false && (
          <section id="blog" style={sectionPadding} className="bg-zinc-100">
            <div className="max-w-7xl mx-auto px-6 space-y-16">
              <div className="text-center space-y-4">
                <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tight">Our Latest Blogs</h2>
              </div>
              <div className="relative group px-4 md:px-12">
                <div className="overflow-hidden" ref={emblaRef}>
                  <div className="flex -ml-4 md:-ml-8">
                    {displayedBlogs.map((blog) => (
                      <div key={blog.id} className="flex-[0_0_100%] min-w-0 pl-4 md:pl-8 md:flex-[0_0_50%] lg:flex-[0_0_33.33%]">
                        <Link href={`/blog/${blog.id}`} className="block h-full group">
                          <Card className="bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                            <div className="h-56 md:h-64 rounded-t-2xl overflow-hidden relative">
                              <img src={blog.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={blog.title} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                            </div>
                            <div className="p-6 md:p-8 flex-1 flex flex-col">
                              <h4 className="text-lg md:text-xl font-black text-black line-clamp-2 mb-3 group-hover:text-primary transition-colors">{blog.title}</h4>
                              <p className="text-[14px] text-black line-clamp-3 mb-6 flex-1">{blog.description}</p>
                              <div className="flex items-center justify-between text-[14px] text-black font-medium">
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {blog.date}</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {blog.readTime}</span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => emblaApi?.scrollPrev()} className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-black hover:text-primary z-10 border-none"><ChevronLeft className="w-6 h-6" /></button>
                <button onClick={() => emblaApi?.scrollNext()} className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-black hover:text-primary z-10 border-none"><ChevronRight className="w-6 h-6" /></button>
              </div>
            </div>
          </section>
        )}

        {/* TESTIMONIALS */}
        {safeSettings.visibility?.testimonials !== false && (
          <section className="py-20 md:py-28 bg-zinc-50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 mb-16">
              <div className="text-center space-y-4">
                <span className="text-primary font-black text-[14px] tracking-[0.25em]">Student Experience</span>
                <h2 className="text-4xl md:text-5xl font-black text-black tracking-tight leading-tight">What Our Students Say</h2>
              </div>
            </div>

            <div className="relative">
              <motion.div
                className="flex gap-8 px-6"
                animate={{ x: [0, -3000] }}
                transition={{ ease: "linear", duration: 50, repeat: Infinity }}
              >
                {[...displayedTestimonials, ...displayedTestimonials, ...displayedTestimonials].map((t: any, i: number) => (
                  <div key={i} className="w-[300px] sm:w-[350px] flex-shrink-0 pt-10">
                    <div className="relative bg-white border border-zinc-200 rounded-3xl p-8 pt-16 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 text-center h-full group">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                        <div className="w-20 h-20 rounded-full bg-white p-1.5 shadow-xl transition-transform group-hover:scale-110">
                          <div className="w-full h-full rounded-full bg-zinc-50 flex items-center justify-center text-primary font-black text-2xl border border-zinc-100">
                            {t.name?.charAt(0) || "?"}
                          </div>
                        </div>
                      </div>
                      <h4 className="font-black text-black text-xl tracking-tight leading-tight mb-2">{t.name}</h4>
                      <p className="text-[14px] font-black text-primary tracking-[0.2em]">{t.role || "Alumni"}</p>
                      <div className="w-12 h-[3px] bg-primary/10 mx-auto my-6 rounded-full group-hover:w-20 group-hover:bg-primary/30 transition-all duration-500" />
                      <p className="text-[15px] text-black font-medium leading-[1.8] italic whitespace-normal break-words">
                        "{t.message}"
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* CONTACT / ENQUIRY SECTION */}
        {safeSettings.visibility?.contact !== false && (
          <section id="contact" style={sectionPadding} className="bg-gradient-to-b from-zinc-50 to-white">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <motion.div {...fadeIn} className="space-y-10">
                  <div>
                    <h2 className="text-4xl lg:text-5xl font-black text-black">Get Expert Guidance</h2>
                    <p className="mt-4 text-lg text-black">Confused about stream, course or career path? Talk to our counsellor today.</p>
                  </div>
                  <div className="space-y-6">
                    <ContactCard icon={<Phone className="w-6 h-6" />} label="Helpline" value={publicContact.phone} />
                    <ContactCard icon={<Mail className="w-6 h-6" />} label="Email" value={publicContact.email} />
                    <ContactCard icon={<MapPin className="w-6 h-6" />} label="Location" value={publicContact.address} />
                  </div>
                </motion.div>

                <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 relative overflow-hidden">
                  {isSubmitted ? (
                    <div className="py-16 text-center space-y-6">
                      <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-black">Thank You!</h3>
                      <p className="text-black">We received your message. Our team will contact you within 24 hours.</p>
                      <Button onClick={() => setIsSubmitted(false)} variant="outline">Send Another Message</Button>
                    </div>
                  ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-[14px] font-medium mb-2 block">Full Name</Label>
                          <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl" placeholder="Your full name" />
                        </div>
                        <div>
                          <Label className="text-[14px] font-medium mb-2 block">Phone Number</Label>
                          <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="h-12 rounded-xl" placeholder="10-digit mobile number" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[14px] font-medium mb-2 block">Interested In</Label>
                        <Select value={formData.course} onValueChange={val => setFormData({ ...formData, course: val })}>
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select course or exam" />
                          </SelectTrigger>
                          <SelectContent>
                            {displayedCourses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            <SelectItem value="other">Other / Not sure</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[14px] font-medium mb-2 block">Your Query</Label>
                        <Textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="min-h-[140px] rounded-xl" placeholder="Current class • Target exam • Any specific problem..." />
                      </div>
                      <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg">
                        {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</> : "Submit Your Query"}
                      </Button>
                    </form>
                  )}
                </motion.div>
              </div>
            </div>
          </section>
        )}

        {/* FOOTER */}
        <Footer
          profile={profile}
          settings={settings}
          instituteName={instituteName}
          courses={courses}
        />

        {/* ENQUIRY MODAL */}
        {/* ENQUIRY MODAL */}
        <EnquiryModal
          isOpen={isApplyModalOpen}
          onOpenChange={setIsApplyModalOpen}
          resolvedUid={resolvedUid}
          displayedCourses={displayedCourses}
        />
      </div>
    </>
  )
}

// ==================== SUB COMPONENTS ====================

function VarietySlider({ slides, height }: { slides: any[]; height: number }) {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 3000, stopOnInteraction: false })])
  const images = slides?.length > 0 ? slides : [{ imageUrl: "https://placehold.co/800x1000/3b82f6/ffffff/png?text=Hero+Slide+1" }, { imageUrl: "https://placehold.co/800x1000/8b5cf6/ffffff/png?text=Hero+Slide+2" }, { imageUrl: "https://placehold.co/800x1000/ec4899/ffffff/png?text=Hero+Slide+3" }]
  return (
    <div className="overflow-hidden rounded-3xl shadow-2xl h-[300px] lg:h-[500px] w-full" style={{ height: height ? `${height}px` : undefined }} ref={emblaRef}>
      <div className="flex h-full">
        {images.map((s, i) => (
          <div key={i} className="flex-[0_0_100%] min-w-0 h-full relative">
            <img src={s.imageUrl} className="w-full h-full object-cover" alt="Slide" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ContactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-4 md:p-6 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-all">
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">{icon}</div>
      <div>
        <p className="text-[14px] md:text-[14px] text-black font-medium">{label}</p>
        <p className="text-[14px] md:text-lg font-semibold text-black break-words">{value || "Information not available"}</p>
      </div>
    </div>
  )
}

function SocialBtn({ href, icon: Icon }: { href: string; icon: any }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-300 hover:bg-primary hover:text-white transition-colors">
      <Icon className="w-5 h-5" />
    </a>
  )
}

function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, latest => Math.round(latest))
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (inView) animate(count, value, { duration })
  }, [value, inView, count, duration])
  return <motion.span ref={ref}>{rounded}</motion.span>
}
