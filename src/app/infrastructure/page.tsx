"use client"

import { useState, useEffect } from "react"
import { useFirebase } from "@/firebase"
import { ref, onValue, push, get } from "firebase/database"
import { motion } from "framer-motion"
import {
  ChevronRight,
  Monitor,
  Trophy,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Send,
  X
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { Navbar } from "@/components/navbar"
import { InfrastructureCycle } from "@/components/infrastructure-cycle"

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
}

const DEFAULT_INFRA = [
  {
    id: '1',
    title: "Smart Classrooms",
    description: "Modern learning environments equipped with the latest audio-visual technology.",
    image: "https://images.unsplash.com/photo-1523050335102-c67450e28b2e?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: '2',
    title: "Computer Labs",
    description: "High-speed computing facilities with industry-standard software and hardware.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: '3',
    title: "Digital Library",
    description: "Vast collection of digital and physical resources for comprehensive research.",
    image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: '4',
    title: "Facilities Lab",
    description: "State-of-the-art laboratory for real-world simulation and technical proficiency.",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800"
  }
]

const DEFAULT_COURSES = [
  { id: 'c1', name: "Diploma in Computer Science" },
  { id: 'c2', name: "Advanced Web Development" },
  { id: 'c3', name: "Digital Marketing Certification" }
]

export default function InfrastructurePage() {
  const slug = process.env.NEXT_PUBLIC_DB_SLUG || process.env.NEXT_PUBLIC_DB_ID || "aspire-education-1rbp"
  const { database } = useFirebase()

  const [resolvedUid, setResolvedUid] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [infraData, setInfraData] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [hero, setHero] = useState<any>({
    title: "Campus Lifecycle & Modern Infrastructure",
    description: "Experience our world-class educational environment designed for excellence.",
    buttonText: "Explore Facilities"
  })
  const [isLoading, setIsLoading] = useState(true)

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    course: "",
    message: ""
  })

  useEffect(() => {
    if (!database) return
    get(ref(database, `Slugs/${slug}`)).then((snapshot) => {
      setResolvedUid(snapshot.val() || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2");
    }).catch(() => setResolvedUid(process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"));
  }, [database, slug])

  useEffect(() => {
    if (!database || !resolvedUid) return
    const rootPath = `Institutes/${resolvedUid}`

    const profileRef = ref(database, `${rootPath}/profile`)
    const unsubscribeProfile = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) setProfile(snapshot.val())
    })

    const settingsRef = ref(database, `${rootPath}/website_settings`)
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) setSettings(snapshot.val())
    })

    const coursesRef = ref(database, `${rootPath}/website_courses`)
    const unsubscribeCourses = onValue(coursesRef, (s) => {
      const data = s.val() || {}
      const courseItems = Object.keys(data).map(k => ({ ...data[k], id: k }))
      setCourses(courseItems.length > 0 ? courseItems : DEFAULT_COURSES)
    })

    const infraRef = ref(database, `${rootPath}/website_settings/infrastructure`)
    const unsubscribeInfra = onValue(infraRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        if (data.hero) setHero(data.hero)
        if (data.items) setInfraData(Object.values(data.items))
        else setInfraData(DEFAULT_INFRA)
      } else {
        setInfraData(DEFAULT_INFRA)
        setHero({
          title: "Campus Lifecycle & Modern Infrastructure",
          description: "Experience our world-class educational environment designed for excellence.",
          buttonText: "Explore Facilities"
        })
      }
      setIsLoading(false)
    })

    return () => {
      unsubscribeProfile()
      unsubscribeSettings()
      unsubscribeCourses()
      unsubscribeInfra()
    }
  }, [database, resolvedUid])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !resolvedUid || isSubmitting) return
    setIsSubmitting(true)
    try {
      const dbPath = `Institutes/${resolvedUid}/website_inquiries`
      await push(ref(database, dbPath), { ...formData, submittedAt: new Date().toISOString(), status: "New" })
      setIsSubmitted(true)
    } catch (err) {
      console.error("Submission failed", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] font-bold text-black tracking-[0.3em]">Loading Campus Node...</p>
      </div>
    </div>
  )

  const instituteName = profile?.instituteName || "Our Institute"
  const publicContact = {
    phone: profile?.contactPhone || profile?.phone || settings?.contact?.phone || "+91 98765 43210",
    email: profile?.contactEmail || profile?.email || settings?.contact?.email || "info@yourinstitute.edu",
    address: profile?.address || settings?.contact?.address || "Institute Campus, Knowledge City"
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden selection:bg-primary/20" style={{ fontFamily: settings?.styling?.fontFamily || 'Poppins' }}>
      <Navbar profile={profile} instituteName={instituteName} onApplyClick={() => { setIsSubmitted(false); setIsApplyModalOpen(true); }} />

      <section className="relative pt-40 pb-32 bg-[#f8fafc] overflow-hidden min-h-[600px] flex items-center">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 -skew-x-12 transform origin-top-right translate-x-32 hidden lg:block" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <motion.div {...fadeIn} className="max-w-3xl space-y-8">
            <nav className="flex items-center gap-2 text-[9px] font-black tracking-widest text-black">
              <Link href={`/`} className="hover:text-primary">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-black">Infrastructure</span>
            </nav>
            <h1 className="text-5xl lg:text-7xl font-black text-black tracking-tight leading-[0.9]">
              {hero.title}
            </h1>
            <p className="text-lg font-medium text-black leading-relaxed max-w-2xl">
              {hero.description}
            </p>
            <div className="pt-4">
              <Button onClick={() => { setIsSubmitted(false); setIsApplyModalOpen(true); }} className="h-16 px-12 bg-primary text-white rounded-2xl font-black text-[11px] tracking-widest shadow-2xl border-none active:scale-95">
                {hero.buttonText} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-20">
          <div className="text-center space-y-4">
            <Badge className="bg-primary/10 text-primary border-none px-4 py-1 font-black text-[10px] tracking-widest rounded-full">Core Facilities</Badge>
            <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tight">Modern Academic Assets</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {infraData.map((item, i) => (
              <motion.div key={item.id || i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                <Link href={`/facilities/details?id=${item.id || item.title}`} className="block h-full group">
                  <Card className="border-none shadow-xl rounded-2xl overflow-hidden group hover:shadow-2xl transition-all duration-700 bg-white h-full flex flex-col cursor-pointer">
                    <div className="h-64 relative overflow-hidden">
                      <img src={item.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={item.title} />
                    </div>
                    <div className="p-10 text-center space-y-6 flex-1">
                      <h4 className="text-2xl font-black tracking-tight text-black leading-tight group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-[14px] text-black font-medium leading-relaxed px-4">{item.description}</p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <InfrastructureCycle />

      <footer className="bg-zinc-950 text-white pt-32 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20 relative z-10">
          <div className="space-y-8">
            <h3 className="text-2xl font-black tracking-tighter">{instituteName}</h3>
            <p className="text-black text-[14px] leading-relaxed font-medium">Developing professional excellence through industry-standard skill acquisition.</p>
          </div>
          <div>
            <h4 className="text-[14px] font-black tracking-widest mb-10 text-white">Quick Access</h4>
            <ul className="space-y-4 text-black text-[14px] font-bold tracking-tight">
              <li><Link href="/" className="hover:text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Home</Link></li>
              <li><Link href="/facilities" className="text-primary transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Facilities</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[14px] font-black tracking-widest mb-10 text-white">Contact Info</h4>
            <ul className="space-y-4 text-black text-[14px] font-bold tracking-tight">
              <li className="flex items-center gap-3 text-white"><Phone className="w-4 h-4 text-primary" /> {publicContact.phone}</li>
              <li className="flex items-center gap-3 text-white"><Mail className="w-4 h-4 text-primary" /> {publicContact.email}</li>
              <li className="flex items-start gap-3 text-white"><MapPin className="w-4 h-4 text-primary shrink-0" /> {publicContact.address}</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <p className="text-[10px] font-black text-black tracking-widest">© {format(new Date(), "yyyy")} All Rights Reserved | {instituteName}</p>
        </div>
      </footer>

      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[500px] p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl [&_[data-radix-dialog-close]]:hidden focus:outline-none">
          <div className="bg-primary p-10 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            
            <div className="space-y-4">
              <Badge className="bg-white/10 text-white border-none text-[9px] font-black tracking-widest px-3">Admission Desk</Badge>
              <DialogTitle className="text-3xl font-black tracking-tight leading-none">Apply for Admission</DialogTitle>
              <p className="text-[14px] text-blue-100 font-medium">Start your academic journey with us today.</p>
            </div>
          </div>
          <ScrollArea className="max-h-[85vh]">
            <div className="p-10">
              {isSubmitted ? (
                <div className="py-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner"><CheckCircle2 className="w-12 h-12" /></div>
                  <h3 className="text-2xl font-black tracking-tight">Inquiry Received</h3>
                  <p className="text-[14px] text-black font-medium leading-relaxed">We have received your application. Our counselor will contact you shortly.</p>
                  <Button onClick={() => { setIsSubmitted(false); setIsApplyModalOpen(false); }} className="w-full h-12 bg-zinc-900 text-white rounded-2xl font-black text-[10px] tracking-widest border-none">Close Window</Button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Full Name</Label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold text-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Mobile Number</Label>
                    <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold text-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Select Program</Label>
                    <Select value={formData.course} onValueChange={val => setFormData({ ...formData, course: val })} required>
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50 shadow-inner font-bold text-black"><SelectValue placeholder="Choose a course..." /></SelectTrigger>
                      <SelectContent>
                        {courses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Additional Notes</Label>
                    <Textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Ask about timings, fees, etc." className="rounded-2xl bg-zinc-50 border-zinc-100 min-h-[120px] text-black font-medium" />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-primary text-white rounded-3xl font-black text-[14px] tracking-widest shadow-xl border-none active:scale-95 transition-all border-none">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Send Inquiry
                  </Button>
                </form>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
