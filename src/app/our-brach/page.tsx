"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { useFirebase } from "@/firebase"
import {
  ref,
  onValue,
  push,
  increment,
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
} from "lucide-react"
import Link from "next/link"
import Head from "next/head"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { format } from "date-fns"

// ─── ANIMATIONS ──────────────────────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
}

// ─── BRANCH INFO ─────────────────────────────────────────────────
const BRANCH_NAME = "Rakesh Education"
const BRANCH_LOGO = "https://ik.imagekit.io/gnzjd77mb/WhatsApp%20Image%202026-03-19%20at%2011.05.32.jpeg"

// ─── DEFAULT CONTENT (used when admin data is missing) ────────
const DEFAULT_HERO = {
  title: "Welcome to Rakesh Education",
  description: "Empowering students with quality education and competitive exam preparation since 2009. Join thousands of successful students today.",
  buttonText: "Explore Courses",
  slides: [
    { imageUrl: "https://placehold.co/800x1000/3b82f6/ffffff/png?text=Rakesh+Education+1" },
    { imageUrl: "https://placehold.co/800x1000/8b5cf6/ffffff/png?text=Rakesh+Education+2" },
    { imageUrl: "https://placehold.co/800x1000/ec4899/ffffff/png?text=Rakesh+Education+3" },
  ]
}

const DEFAULT_ABOUT = {
  badge: "About Rakesh Education",
  title: "Building Bright Futures Since 2009",
  description1: "Rakesh Education is a premier institute dedicated to providing top-quality coaching for competitive exams and school academics.",
  description2: "With experienced faculty, modern infrastructure, personal attention and consistent results, we help students achieve their dreams.",
  imageUrl: "https://placehold.co/800x1000/10b981/ffffff/png?text=Rakesh+Education+Campus"
}

const DEFAULT_BLOGS = [
  { id: 'b1', title: "How to Crack Competitive Exams in 2026", category: "Exam Tips", image: "https://placehold.co/600x400/3b82f6/ffffff/png?text=Blog+1", description: "Proven strategies and study plans...", date: "March 20, 2026", readTime: "8 min" },
  { id: 'b2', title: "Importance of 6th Standard Foundation", category: "Foundation", image: "https://placehold.co/600x400/10b981/ffffff/png?text=Blog+2", description: "Why early preparation matters...", date: "March 18, 2026", readTime: "6 min" },
  { id: 'b3', title: "Success Stories of Our Students", category: "Inspiration", image: "https://placehold.co/600x400/ec4899/ffffff/png?text=Blog+3", description: "Real stories from Rakesh Education alumni...", date: "March 15, 2026", readTime: "10 min" }
]

const DEFAULT_COURSES = [
  { id: 'c1', name: "6th Standard Foundation Course", description: "Complete academic foundation with maths, science & English", image: "https://placehold.co/600x400/3b82f6/ffffff/png?text=6th+Foundation", type: "6th Standard", sellingPrice: 29999, originalPrice: 44999, showOnHomepage: true },
  { id: 'c2', name: "7th Standard Bridge Course", description: "Advanced concepts for class 7 students", image: "https://placehold.co/600x400/10b981/ffffff/png?text=7th+Bridge", type: "Foundation", sellingPrice: 32999, originalPrice: 47999, showOnHomepage: true },
  { id: 'c3', name: "8th Standard Pre-Competitive", description: "Preparation for Olympiads and NTSE", image: "https://placehold.co/600x400/ec4899/ffffff/png?text=8th+Pre", type: "Foundation", sellingPrice: 35999, originalPrice: 52999, showOnHomepage: true },
  { id: 'c4', name: "Long Term JEE/NEET Foundation", description: "2-year integrated program for engineering & medical", image: "https://placehold.co/600x400/f97316/ffffff/png?text=JEE+NEET", type: "Long Term", sellingPrice: 99999, originalPrice: 149999, showOnHomepage: true },
  { id: 'c5', name: "Crash Course for Board Exams", description: "Quick revision & practice for 10th & 12th", image: "https://placehold.co/600x400/8b5cf6/ffffff/png?text=Crash+Course", type: "Crash Course", sellingPrice: 59999, originalPrice: 89999, showOnHomepage: true },
  { id: 'c6', name: "6th to 10th All Subject Mastery", description: "Complete school syllabus + extra practice", image: "https://placehold.co/600x400/10b981/ffffff/png?text=School+Mastery", type: "6th Standard", sellingPrice: 25999, originalPrice: 39999, showOnHomepage: true }
]

const DEFAULT_TESTIMONIALS = [
  { name: "Aarav Sharma", role: "Parent of 6th Std Student", message: "My son improved tremendously in just 3 months. Best institute!", image: null },
  { name: "Priya Patel", role: "Student 2025", message: "Teachers are very supportive. I scored 95% in boards!", image: null },
  { name: "Rahul Verma", role: "Parent", message: "Excellent faculty and infrastructure. Highly recommended.", image: null }
]

const DEFAULT_STATS = [
  { id: 's1', label: "Years", value: 15, suffix: "+", subLabel: "Experience", icon: 'Award', color: 'bg-amber-50 border-amber-100' },
  { id: 's2', label: "Students", value: 45000, suffix: "+", subLabel: "Trained", icon: 'Users', color: 'bg-blue-50 border-blue-100' },
  { id: 's3', label: "Success", value: 96, suffix: "%", subLabel: "Rate", icon: 'Trophy', color: 'bg-emerald-50 border-emerald-100' },
  { id: 's4', label: "Faculty", value: 65, suffix: "+", subLabel: "Members", icon: 'GraduationCap', color: 'bg-purple-50 border-purple-100' },
]

const STAT_ICONS: Record<string, any> = {
  Award: Award,
  Users: Users,
  Building2: Building2,
  Smartphone: Smartphone,
  GraduationCap: GraduationCap,
  Trophy: Trophy,
  Zap: Zap
}

export default function InstitutePublicWebsite() {
  const { slug } = useParams<{ slug: string }>()
  const { database } = useFirebase()

  const [resolvedUid, setResolvedUid] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)

  const [courses, setCourses] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])

  const [formData, setFormData] = useState({ name: "", phone: "", course: "", message: "" })

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })

  // Safety timeout - prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false)
        setLoadingError("Loading took too long — showing default content")
      }
    }, 8000)
    return () => clearTimeout(timer)
  }, [isLoading])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Resolve slug to UID
  useEffect(() => {
    if (!database || !slug) {
      setLoadingError("")
      setIsLoading(false)
      return
    }

    get(ref(database, `Slugs/${slug}`))
      .then((snap) => {
        setResolvedUid(snap.val() || slug)
      })
      .catch(() => {
        setResolvedUid(slug)
      })
  }, [database, slug])

  // Load all data
  useEffect(() => {
    if (!database || !resolvedUid) return

    const root = `Institutes/${resolvedUid}`

    // Increment visitor count
    dbUpdate(ref(database, `${root}/analytics`), {
      websiteVisitors: increment(1)
    }).catch(() => {})

    const unsubs: Array<() => void> = []

    // Profile
    unsubs.push(
      onValue(ref(database, `${root}/profile`), (snap) => {
        if (snap.exists()) setProfile(snap.val())
      })
    )

    // Settings - critical
    unsubs.push(
      onValue(ref(database, `${root}/website_settings`), (snap) => {
        if (snap.exists()) {
          setSettings(snap.val() || {})
        }
        setIsLoading(false)
      }, (err) => {
        console.error("Settings error:", err)
        setIsLoading(false)
      })
    )

    // Courses
    unsubs.push(
      onValue(ref(database, `${root}/website_courses`), (snap) => {
        const data = snap.val() || {}
        const list = Object.entries(data)
          .map(([id, val]: [string, any]) => ({ id, ...val }))
          .filter(c => c.status !== 'Draft')
        setCourses(list)
      })
    )

    // Blogs
    unsubs.push(
      onValue(ref(database, `${root}/website_blogs`), (snap) => {
        const data = snap.val() || {}
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }))
        setBlogs(list.length ? list.reverse() : DEFAULT_BLOGS)
      })
    )

    return () => unsubs.forEach(u => u())
  }, [database, resolvedUid])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !resolvedUid || isSubmitting) return
    setIsSubmitting(true)
    try {
      await push(ref(database, `Institutes/${resolvedUid}/website_inquiries`), {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-[14px] font-bold text-black">Loading Rakesh Education...</p>
        </div>
      </div>
    )
  }

  // ─── FALLBACK LOGIC ──────────────────────────────────────────────
  const heroIsEmpty = !settings.hero?.title?.trim() && !settings.hero?.description?.trim() && (!settings.hero?.slides?.length)
  const displayedHero = heroIsEmpty ? DEFAULT_HERO : { ...DEFAULT_HERO, ...settings.hero }

  const aboutIsEmpty = !settings.about?.title?.trim() && !settings.about?.description1?.trim()
  const displayedAbout = aboutIsEmpty ? DEFAULT_ABOUT : { ...DEFAULT_ABOUT, ...settings.about }

  const displayedStats = settings.stats?.length > 0 ? settings.stats : DEFAULT_STATS
  const displayedCourses = courses.length > 0 ? courses : DEFAULT_COURSES
  const displayedBlogs = blogs.length > 0 ? blogs : DEFAULT_BLOGS
  const displayedTestimonials = settings.testimonials?.length > 0 ? settings.testimonials : DEFAULT_TESTIMONIALS

  const sectionPadding = {
    paddingTop: `${settings.styling?.sectionSpacing ?? 120}px`,
    paddingBottom: `${settings.styling?.sectionSpacing ?? 120}px`
  }

  const publicContact = {
    phone: profile?.contactPhone || "+91 98765 43210",
    email: profile?.contactEmail || "info@rakesheducation.com",
    address: profile?.address || "Near Science City Road, Sola, Ahmedabad - 380060"
  }

  const instituteName = profile?.instituteName || BRANCH_NAME

  const heroTitleStyle = {
    fontSize: `${settings.styling?.titleFontSize ?? 64}px`,
    fontFamily: settings.styling?.heroTitleFontFamily || 'inherit'
  }

  const heroDescStyle = {
    fontSize: `${settings.styling?.descFontSize ?? 18}px`,
    fontFamily: settings.styling?.heroDescFontFamily || 'inherit'
  }

  const sliderStyle = {
    width: `${settings.styling?.sliderWidth ?? 100}%`,
    height: `${settings.styling?.sliderHeight ?? 550}px`,
  }

  return (
    <>
      <Head>
        <title>{instituteName}</title>
      </Head>

      <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: settings.styling?.fontFamily || 'Poppins' }}>

        {loadingError && (
          <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 z-50">
            {loadingError} — Using default content
          </div>
        )}

        {/* HEADER */}
        <header className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-500",
          isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg py-3" : "bg-transparent py-6"
        )}>
          <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
              <img src={BRANCH_LOGO} className="h-16 md:h-20 w-auto object-contain" alt="Rakesh Education" />
            </Link>

            <nav className="hidden lg:flex gap-8 font-bold text-[14px] tracking-wide text-black">
              <Link href="/#home">Home</Link>
              <Link href="#about">About</Link>
              <Link href="#courses">Courses</Link>
              <Link href="#blog">Blogs</Link>
              <Link href="#contact">Contact</Link>
            </nav>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full border-zinc-300">
                    Login <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link href="/login">Admin Login</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/staff/login">Staff Login</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/student/login">Student Login</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" className="rounded-full" onClick={() => setIsApplyModalOpen(true)}>
                Enquiry Now
              </Button>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section id="home" className="pt-28 lg:pt-36 pb-16 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeIn}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight" style={heroTitleStyle}>
                  {displayedHero.title}
                </h1>
                <p className="mt-6 text-lg md:text-xl text-black max-w-xl" style={heroDescStyle}>
                  {displayedHero.description}
                </p>
                <Button size="lg" className="mt-8 rounded-full px-8" onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}>
                  {displayedHero.buttonText} <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>

              <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="hidden lg:block">
                <VarietySlider slides={displayedHero.slides} height={settings.styling?.sliderHeight || 520} />
              </motion.div>
            </div>
          </div>
        </section>

        {/* COURSES */}
        <section id="courses" className="py-20 bg-zinc-50" style={sectionPadding}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black">Our Popular Courses</h2>
              <p className="mt-4 text-black max-w-2xl mx-auto">
                Choose the right program for your child's bright future at Rakesh Education
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedCourses.map((course, i) => (
                <motion.div key={course.id} {...fadeIn} transition={{ delay: i * 0.1 }}>
                  <DetailedCourseCard course={course} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black">Rakesh Education by Numbers</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {displayedStats.map((stat, i) => {
                const IconComp = STAT_ICONS[stat.icon] || Award
                return (
                  <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }} className="text-center p-8 rounded-2xl border bg-white shadow-sm">
                    <IconComp className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <div className="text-4xl font-black text-primary">
                      <AnimatedCounter value={stat.value} />{stat.suffix}
                    </div>
                    <p className="mt-2 font-semibold">{stat.label}</p>
                    <p className="text-[14px] text-black">{stat.subLabel}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="py-20 bg-zinc-50" style={sectionPadding}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div {...fadeIn} className="order-2 lg:order-1">
                <Badge className="mb-4">{displayedAbout.badge}</Badge>
                <h2 className="text-4xl md:text-5xl font-black mb-6">{displayedAbout.title}</h2>
                <p className="text-lg text-black mb-6">{displayedAbout.description1}</p>
                <p className="text-lg text-black">{displayedAbout.description2}</p>
              </motion.div>

              <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="order-1 lg:order-2">
                <div className="rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                  <img src={displayedAbout.imageUrl} alt="Rakesh Education" className="w-full h-auto" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* BLOG */}
        <section id="blog" className="py-20 bg-white" style={sectionPadding}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black">Latest Updates & Tips</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedBlogs.map((blog, i) => (
                <motion.div key={blog.id} {...fadeIn} transition={{ delay: i * 0.1 }}>
                  <Card className="overflow-hidden h-full hover:shadow-xl transition-shadow">
                    <div className="h-48 overflow-hidden">
                      <img src={blog.image} alt={blog.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                    <CardContent className="p-6">
                      <Badge variant="outline" className="mb-3">{blog.category}</Badge>
                      <h3 className="text-xl font-bold mb-3 line-clamp-2">{blog.title}</h3>
                      <p className="text-black line-clamp-3 mb-4">{blog.description}</p>
                      <div className="flex items-center justify-between text-[14px] text-black">
                        <span>{blog.date}</span>
                        <span>{blog.readTime}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-20 bg-zinc-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black">What Parents & Students Say</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedTestimonials.map((t, i) => (
                <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                  <Card className="p-6 h-full shadow-sm hover:shadow-md transition">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-xl font-bold">
                        {t.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-bold">{t.name}</p>
                        <p className="text-[14px] text-black">{t.role}</p>
                      </div>
                    </div>
                    <p className="text-black italic">"{t.message}"</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="py-20 bg-white" style={sectionPadding}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16">
              <motion.div {...fadeIn}>
                <h2 className="text-4xl md:text-5xl font-black mb-6">Get in Touch</h2>
                <p className="text-lg text-black mb-8">Have questions? Our team is ready to help you choose the right course.</p>

                <div className="space-y-6">
                  <ContactCard icon={<Phone />} label="Call Us" value={publicContact.phone} />
                  <ContactCard icon={<Mail />} label="Email Us" value={publicContact.email} />
                  <ContactCard icon={<MapPin />} label="Visit Us" value={publicContact.address} />
                </div>
              </motion.div>

              <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                <Card className="p-8 shadow-lg">
                  {isSubmitted ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
                      <h3 className="text-2xl font-bold mb-3">Thank You!</h3>
                      <p className="text-black">We will contact you soon.</p>
                      <Button className="mt-6" onClick={() => setIsSubmitted(false)}>Send Another</Button>
                    </div>
                  ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label>Name</Label>
                          <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g,'').slice(0,10)})} required />
                        </div>
                      </div>

                      <div>
                        <Label>Interested In</Label>
                        <Select value={formData.course} onValueChange={v => setFormData({...formData, course: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            {displayedCourses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Message</Label>
                        <Textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows={4} />
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  )}
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-zinc-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12">
              <div>
                <img src={BRANCH_LOGO} alt="Rakesh Education" className="h-12 mb-6" />
                <p className="text-black text-[14px]">Premier coaching institute in Ahmedabad since 2009</p>
              </div>

              <div>
                <h4 className="font-bold mb-6">Quick Links</h4>
                <ul className="space-y-3 text-black">
                  <li><Link href="/">Home</Link></li>
                  <li><Link href="#about">About Us</Link></li>
                  <li><Link href="#courses">Courses</Link></li>
                  <li><Link href="#contact">Contact</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-6">Courses</h4>
                <ul className="space-y-3 text-black">
                  {displayedCourses.slice(0,4).map(c => (
                    <li key={c.id}><Link href={`/course/${c.id}`}>{c.name}</Link></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-6">Contact</h4>
                <ul className="space-y-4 text-black">
                  <li className="flex gap-3"><Phone className="w-5 h-5" /> {publicContact.phone}</li>
                  <li className="flex gap-3"><Mail className="w-5 h-5" /> {publicContact.email}</li>
                  <li className="flex gap-3"><MapPin className="w-5 h-5" /> {publicContact.address}</li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-black text-[14px]">
              © {format(new Date(), "yyyy")} {BRANCH_NAME}. All rights reserved.
            </div>
          </div>
        </footer>

        {/* ENQUIRY MODAL */}
        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogTitle>Enquire Now - Rakesh Education</DialogTitle>
            {isSubmitted ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Thank You!</h3>
                <p className="text-black">We will get back to you soon.</p>
                <Button className="mt-6" onClick={() => { setIsSubmitted(false); setIsApplyModalOpen(false) }}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-6 mt-4">
                <div>
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g,'').slice(0,10)})} required />
                </div>
                <div>
                  <Label>Course Interested In</Label>
                  <Select value={formData.course} onValueChange={v => setFormData({...formData, course: v})}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {displayedCourses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows={4} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Submit Enquiry"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────
function VarietySlider({ slides, height }: { slides: any[]; height: number }) {
  const [emblaRef] = useEmblaCarousel({ loop: true })
  return (
    <div className="overflow-hidden rounded-3xl shadow-2xl" style={{ height, width: '100%' }} ref={emblaRef}>
      <div className="flex">
        {(slides || DEFAULT_HERO.slides).map((s, i) => (
          <div key={i} className="flex-[0_0_100%] min-w-0">
            <img src={s.imageUrl} className="w-full h-full object-cover" alt="Slide" />
          </div>
        ))}
      </div>
    </div>
  )
}

function DetailedCourseCard({ course }: { course: any }) {
  const discount = course.originalPrice && course.sellingPrice
    ? Math.round(((course.originalPrice - course.sellingPrice) / course.originalPrice) * 100)
    : 0

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
      <div className="h-48 relative">
        <img src={course.image} alt={course.name} className="w-full h-full object-cover" />
        {course.type && (
          <Badge className="absolute top-3 left-3 bg-primary/90">{course.type}</Badge>
        )}
      </div>
      <CardContent className="p-6 flex-1 flex flex-col">
        <h3 className="font-bold text-xl mb-2 line-clamp-2">{course.name}</h3>
        <p className="text-black text-[14px] mb-4 flex-1 line-clamp-3">{course.description}</p>
        <div className="flex items-center gap-3 mt-auto">
          <span className="text-2xl font-bold text-primary">
            ₹{Number(course.sellingPrice || 0).toLocaleString()}
          </span>
          {discount > 0 && <Badge variant="secondary">{discount}% OFF</Badge>}
        </div>
      </CardContent>
    </Card>
  )
}

function ContactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border bg-white/50">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[14px] text-black">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function SocialBtn({ href, icon: Icon }: { href: string; icon: any }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center hover:bg-primary transition-colors">
      <Icon className="w-5 h-5" />
    </a>
  )
}

function AnimatedCounter({ value, duration = 2.5 }: { value: number; duration?: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, Math.round)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (inView) {
      animate(count, value, { duration, ease: "easeOut" })
    }
  }, [value, inView])

  return <motion.span ref={ref}>{rounded}</motion.span>
}
