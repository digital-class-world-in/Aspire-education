
"use client"

import { useState, useEffect, useMemo, use } from "react"
import { useFirebase } from "@/firebase"
import { ref, onValue, get, off } from "firebase/database"
import { motion } from "framer-motion"
import { 
  ChevronRight, Calendar, User, Clock, ArrowLeft,
  Share2, Facebook, Twitter, Linkedin, Youtube,
  Mail, Phone, Instagram, School, ArrowRight,
  Bookmark, MapPin, X, Send, Loader2, CheckCircle2,
  ChevronDown, ShieldCheck, Users, Building2
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useSEO } from "@/hooks/use-seo"

const DEMO_BLOG = {
  id: "demo-blog",
  title: "The Future of Professional Education & Skill Development",
  author: "Academic Director",
  date: "October 15, 2024",
  readTime: "5 min read",
  category: "Education",
  image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80",
  intro: "As technology evolves at an unprecedented pace, the landscape of professional education is undergoing a fundamental transformation...",
  sections: [
    {
      title: "Bridging the Skills Gap",
      content: "The modern workplace demands a unique blend of technical proficiency and soft skills. Our curriculum is designed in collaboration with industry leaders to ensure our graduates are ready to tackle real-world challenges from day one.",
      image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&q=80"
    },
    {
      title: "Interactive Learning Methodologies",
      content: "We've moved beyond traditional lectures. Our approach emphasizes hands-on projects, peer-to-peer learning, and continuous mentorship. This interactive environment fosters critical thinking and rapid skill acquisition."
    }
  ],
  conclusion: "Education is no longer just about acquiring a degree; it's about building a robust portfolio of competencies. Join us in shaping the leaders of tomorrow."
}

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
}

export default function BlogDetailPage({ params }: { params: Promise<{ id: string, blogId: string }> }) {
  const envDbId = process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"
  const envSlug = process.env.NEXT_PUBLIC_DB_SLUG || "aspire-education-1rbp"
  const { blogId } = use(params)
  const { database } = useFirebase()

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    course: "",
    message: "",
  })

  const [resolvedUid, setResolvedUid] = useState<string | null>(envDbId)
  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [blog, setBlog] = useState<any>(null)
  const [relatedBlogs, setRelatedBlogs] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !envSlug) return
    get(ref(database, `Slugs/${envSlug}`)).then((snapshot) => {
      const uid = snapshot.val() || envDbId; 
      setResolvedUid(uid);
    });
  }, [database, envSlug, envDbId])

  useEffect(() => {
    if (!database || !resolvedUid || !blogId) return
    const rootPath = `Institutes/${resolvedUid}`

    const profileRef = ref(database, `${rootPath}/profile`)
    const unsubProfile = onValue(profileRef, (snap) => {
      if (snap.exists()) setProfile(snap.val())
    })

    const settingsRef = ref(database, `${rootPath}/website_settings`)
    const unsubSettings = onValue(settingsRef, (snap) => {
      if (snap.exists()) setSettings(snap.val())
       
    })

    const coursesRef = ref(database, `${rootPath}/website_courses`)
    const unsubCourses = onValue(coursesRef, (s) => {
      const data = s.val() || {}
      setCourses(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })

    const blogRef = ref(database, `${rootPath}/website_blogs/${blogId}`)
    const unsubBlog = onValue(blogRef, (snap) => {
      if (snap.exists()) {
        setBlog({ ...snap.val(), id: snap.key })
      } else {
        setBlog(DEMO_BLOG)
      }
    })

    const blogsRef = ref(database, `${rootPath}/website_blogs`)
    const unsubBlogs = onValue(blogsRef, (snap) => {
      const data = snap.val() || {}
      const list = Object.keys(data)
        .map(k => ({ ...data[k], id: k }))
        .filter(b => b.id !== blogId)
      setRelatedBlogs(list.slice(0, 3))
      setIsLoading(false)
    })

    return () => {
      off(profileRef)
      off(settingsRef)
      off(coursesRef)
      off(blogRef)
      off(blogsRef)
    }
  }, [database, resolvedUid, blogId])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.phone || formData.phone.length !== 10) return
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 1500)
  }

  const instituteName = process.env.NEXT_PUBLIC_INSTITUTE_NAME || profile?.instituteName || "Your Institute"
  
  useSEO(
    blog ? `${blog.title} - ${instituteName}` : `Blog - ${instituteName}`,
    blog?.intro || "Read our latest blog posts and updates."
  )

  if (isLoading || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] font-bold text-black tracking-[0.3em]">Syncing Publication...</p>
        </div>
      </div>
    )
  }

  const publicContact = {
    phone: profile?.contactPhone || profile?.phone || settings?.contact?.phone || "",
    email: profile?.contactEmail || profile?.email || settings?.contact?.email || "",
    address: profile?.address || settings?.contact?.address || ""
  }

  const sections = blog.sections || []

  return (
    <div className="min-h-screen bg-white overflow-x-hidden selection:bg-primary/20" style={{ fontFamily: settings?.styling?.fontFamily || 'Poppins' }}>
      <Navbar profile={profile} instituteName={instituteName} onApplyClick={() => setIsApplyModalOpen(true)} />

      <section className="relative h-[60vh] min-h-[500px] flex items-end pt-40 pb-20 overflow-hidden bg-zinc-900">
        <div className="absolute inset-0">
          <img src={blog.image} className="w-full h-full object-cover opacity-40" alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
        </div>
        <div className="max-w-5xl mx-auto px-6 relative z-10 w-full">
          <motion.div {...fadeIn} className="space-y-8">
            <Link href={`#blog`} className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-[10px] font-black tracking-widest">
              <ArrowLeft className="w-4 h-4" /> Back to Blogs
            </Link>
            <div className="space-y-4">
              <Badge className="bg-primary text-white border-none font-black text-[9px] px-4 py-1 tracking-widest">{blog.category}</Badge>
              <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">{blog.title}</h1>
              <div className="flex items-center gap-8 text-[14px] font-black text-white/60 tracking-widest pt-4">
                <span className="flex items-center gap-2"><User className="w-4 h-4" /> By {blog.author || 'Academic Board'}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {blog.date}</span>
                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {blog.readTime || '5 min read'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-16">
            {blog.intro && (
              <motion.div {...fadeIn} className="prose prose-zinc max-w-none">
                <p className="text-xl text-black font-medium leading-relaxed italic">
                  {blog.intro}
                </p>
              </motion.div>
            )}

            <div className="space-y-24">
              {sections.map((sec: any, i: number) => (
                <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }} className="space-y-8">
                  {sec.title && <h2 className="text-3xl font-black text-black tracking-tight leading-none">{sec.title}</h2>}
                  <div className={cn(
                    "grid grid-cols-1 gap-10 items-start",
                    sec.image ? "md:grid-cols-2" : "grid-cols-1"
                  )}>
                    {sec.image && (
                      <div className={cn("rounded-2xl overflow-hidden shadow-xl border-4 border-zinc-50", i % 2 !== 0 && "md:order-last")}>
                        <img src={sec.image} className="w-full h-full object-cover aspect-video" alt={sec.title} />
                      </div>
                    )}
                    <div className="prose prose-zinc">
                      <p className="text-lg text-black font-medium leading-relaxed whitespace-pre-wrap">
                        {sec.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {blog.conclusion && (
              <motion.div {...fadeIn} className="pt-16 border-t border-zinc-100 space-y-6">
                <h3 className="text-2xl font-black text-black tracking-tight">Conclusion</h3>
                <p className="text-lg text-black font-medium leading-relaxed">
                  {blog.conclusion}
                </p>
              </motion.div>
            )}

            <div className="pt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-zinc-50">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-black tracking-widest">Connect with us:</span>
                <div className="flex gap-2">
                  {settings?.social?.facebook && <ShareButton href={settings.social.facebook} icon={<Facebook className="w-4 h-4" />} color="bg-[#1877F2]" />}
                  {settings?.social?.twitter && <ShareButton href={settings.social.twitter} icon={<Twitter className="w-4 h-4" />} color="bg-[#1DA1F2]" />}
                  {settings?.social?.linkedin && <ShareButton href={settings.social.linkedin} icon={<Linkedin className="w-4 h-4" />} color="bg-[#0A66C2]" />}
                  {settings?.social?.youtube && <ShareButton href={settings.social.youtube} icon={<Youtube className="w-4 h-4" />} color="bg-[#FF0000]" />}
                  {settings?.social?.instagram && <ShareButton href={settings.social.instagram} icon={<Instagram className="w-4 h-4" />} color="bg-zinc-800" />}
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-12 h-fit lg:sticky lg:top-32">
            <Card className="border border-zinc-100 shadow-sm rounded-3xl bg-white overflow-hidden p-8 space-y-8">
              <h4 className="text-[14px] font-black text-black tracking-[0.2em] border-b border-zinc-50 pb-4">Related Posts</h4>
              <div className="space-y-6">
                {relatedBlogs.map((rb) => (
                  <Link key={rb.id} href={`/blog/${rb.id}`} className="flex gap-4 group">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-zinc-50">
                      <img src={rb.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Related" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-[14px] font-black text-black tracking-tight leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {rb.title}
                      </h5>
                      <p className="text-[10px] font-bold text-black tracking-widest">{rb.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </section>

      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[500px] p-0 gap-0 border-none rounded-[32px] overflow-hidden shadow-2xl bg-white [&_[data-radix-dialog-close]]:hidden focus:outline-none">
          <div className="relative bg-primary px-10 py-10 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            
            <div className="space-y-2.5">
              <DialogTitle className="text-3xl font-black tracking-tight leading-tight">Submit Inquiry</DialogTitle>
              <p className="text-[14px] text-white/90 font-medium leading-relaxed">Our counselors will review your inquiry and get back to you within 24 business hours.</p>
            </div>
          </div>

          <ScrollArea className="max-h-[70vh]">
            <div className="p-10">
              {isSubmitted ? (
                <div className="py-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-black tracking-tight">Thank You!</h3>
                    <p className="text-[14px] text-black font-medium leading-relaxed">Your application has been received. Our counselor will contact you shortly.</p>
                  </div>
                  <Button onClick={() => { setIsSubmitted(false); setIsApplyModalOpen(false); }} className="h-12 px-10 bg-zinc-900 text-white rounded-2xl font-black text-[10px] tracking-widest border-none">Close Window</Button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Full Name</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold text-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Mobile Number</Label>
                    <Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} required className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold text-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Select Program</Label>
                    <Select value={formData.course} onValueChange={val => setFormData({...formData, course: val})} required>
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50 shadow-inner font-bold text-black">
                        <SelectValue placeholder="Choose a program..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                        {courses.map(c => <SelectItem key={c.id} value={c.name} className="rounded-xl font-bold">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Message (Optional)</Label>
                    <Textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="rounded-2xl bg-zinc-50 border-zinc-100 min-h-[120px] text-black font-medium" placeholder="Ask about timings, fees, etc." />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-primary text-white rounded-3xl font-black text-[14px] tracking-widest shadow-xl shadow-teal-900/20 active:scale-95 transition-all border-none">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Submit Application
                  </Button>
                </form>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Footer
        profile={profile || {}}
        settings={settings || {}}
        instituteName={instituteName}
        courses={courses || []}
      />
    </div>
  )
}

function ShareButton({ icon, color, href }: { icon: any, color: string, href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all active:scale-95 border-none", color)}>
      {icon}
    </a>
  )
}

function SocialBtn({ icon, href }: { icon: any, href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-black hover:text-primary hover:text-white transition-all border-none outline-none">
      {icon}
    </a>
  )
}
