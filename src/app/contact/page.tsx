"use client"

import { useState } from "react"
import { useInstituteData } from "@/hooks/use-institute-data"
import { useSEO } from "@/hooks/use-seo"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroBanner } from "@/components/hero-banner"
import { motion } from "framer-motion"
import { EnquiryModal } from "@/components/enquiry-modal"
import { 
  Phone, 
  Mail, 
  MapPin, 
  Loader2, 
  CheckCircle2,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirebase } from "@/firebase"
import { ref, push } from "firebase/database"

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
}

export default function ContactPage() {
  const { 
    profile, 
    settings, 
    courses, 
    isLoading, 
    publicContact, 
    instituteName,
    resolvedUid
  } = useInstituteData()

  const { database } = useFirebase()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)
  const [formData, setFormData] = useState({ name: "", phone: "", course: "", message: "" })

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
      setFormData({ name: "", phone: "", course: "", message: "" })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  useSEO(
    settings?.seo?.contact?.title || `Contact Us - ${instituteName}`,
    settings?.seo?.contact?.description || `Get in touch with ${instituteName}. Reach out for admissions, course enquiries, or general information. We are here to help.`
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
        title="Contact Us" 
        subtitle="Have questions? Reach out to our team of experts for guidance and support."
        breadcrumb={[{ label: "Contact", href: "/contact" }]}
      />

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            <motion.div {...fadeIn} className="space-y-12">
              <div className="space-y-6">
                <h2 className="text-4xl font-black text-black tracking-tight">Get In Touch</h2>
                <p className="text-lg text-black font-medium leading-relaxed">
                  We are here to help you choose the right path for your professional career. Visit our office or drop a message.
                </p>
              </div>

              <div className="space-y-6">
                <ContactInfoCard icon={<Phone className="w-6 h-6" />} label="Call Us" value={publicContact.phone} />
                <ContactInfoCard icon={<Mail className="w-6 h-6" />} label="Email Us" value={publicContact.email} />
                <ContactInfoCard icon={<MapPin className="w-6 h-6" />} label="Visit Us" value={publicContact.address} />
              </div>
            </motion.div>

            <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="bg-zinc-50 rounded-[40px] p-8 lg:p-12 shadow-sm border border-zinc-100">
              {isSubmitted ? (
                <div className="py-20 text-center space-y-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-inner">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-black text-black tracking-tight">Message Sent!</h3>
                  <p className="text-black font-medium leading-relaxed">Thank you for reaching out. Our counsellor will contact you shortly.</p>
                  <Button onClick={() => setIsSubmitted(false)} className="bg-primary text-white rounded-xl h-12 px-8 font-black text-[10px] tracking-widest">Send Another Message</Button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-black tracking-widest ml-1">Full Name</Label>
                      <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="h-14 rounded-2xl border-zinc-100 bg-white shadow-sm font-bold text-black" placeholder="Your Name" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-black tracking-widest ml-1">Mobile Number</Label>
                      <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} required className="h-14 rounded-2xl border-zinc-100 bg-white shadow-sm font-bold text-black" placeholder="10 Digit Number" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Interested In</Label>
                    <Select value={formData.course} onValueChange={val => setFormData({...formData, course: val})} required>
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-white shadow-sm font-bold text-black">
                        <SelectValue placeholder="Select Course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        <SelectItem value="other">General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Your Message</Label>
                    <Textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="min-h-[140px] rounded-2xl border-zinc-100 bg-white shadow-sm font-medium text-black" placeholder="Tell us more about your goal..." />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-primary text-white rounded-3xl font-black text-[14px] tracking-widest shadow-xl active:scale-95 transition-all">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : "Send Message"}
                  </Button>
                </form>
              )}
            </motion.div>
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

function ContactInfoCard({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-6 p-8 rounded-3xl bg-zinc-50 border border-zinc-100 group hover:bg-white hover:shadow-xl transition-all duration-500">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-black tracking-widest mb-1">{label}</p>
        <p className="text-xl font-bold text-black">{value || "Available on request"}</p>
      </div>
    </div>
  )
}
