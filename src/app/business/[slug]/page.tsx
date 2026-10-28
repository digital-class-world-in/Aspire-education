
"use client"

import { useState, useEffect, use } from "react"
import { useFirebase } from "@/firebase"
import { ref, onValue, get, off, push } from "firebase/database"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  MessageSquare, 
  Share2, 
  X, 
  Send, 
  Loader2, 
  CheckCircle2, 
  ChevronRight,
  School,
  GraduationCap,
  Clock,
  HelpCircle,
  ImageIcon,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  User,
  Info,
  ExternalLink,
  ChevronLeft,
  Search,
  BookOpen,
  Briefcase,
  Trophy,
  Star,
  ShieldCheck,
  Check,
  ArrowRight,
  Map,
  MessageCircle,
  Share,
  Calendar,
  FileText,
  Upload,
  UserPlus,
  AlertCircle,
  Users2,
  Heart,
  Landmark,
  TrendingUp,
  UserCheck,
  Wallet,
  IndianRupee,
  Navigation,
  Quote,
  Youtube,
  Copy,
  MoreVertical,
  MoreHorizontal,
  ChevronDown
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogTrigger,
  DialogClose,
  DialogDescription 
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: "easeOut" }
}

const ICON_MAP: Record<string, any> = {
  Users2: <Users2 className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  UserCheck: <UserCheck className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  IndianRupee: <IndianRupee className="w-5 h-5" />,
  CheckCircle2: <CheckCircle2 className="w-5 h-5" />,
}

export default function BusinessPublicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { database } = useFirebase()
  const { toast } = useToast()
  
  const [listing, setListing] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Enquiry Popup States
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    course: "",
    mode: "Online",
    message: "",
    contactTime: "Anytime"
  })

  const [reviewForm, setReviewForm] = useState({
    name: "",
    rating: "5",
    comment: ""
  })

  useEffect(() => {
    if (!database || !slug) return
    const listingRef = ref(database, `MasterBusinessListings/${slug}`)
    
    onValue(listingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setListing(data)
        
        if (data.userReviews) {
          setReviews(Object.values(data.userReviews).reverse())
        }
      }
      setIsLoading(false)
    })

    get(ref(database, 'MasterBusinessListings')).then((snap) => {
      if (snap.exists()) {
        const list = Object.values(snap.val()).filter((l: any) => l.slug !== slug)
        setRelated(list.slice(0, 3))
      }
    })

    return () => off(listingRef)
  }, [database, slug])

  const handleFinalSubmit = async () => {
    if (!database || !listing || isSubmitting) return
    setIsSubmitting(true)
    
    const enquiry = {
      ...enquiryForm,
      businessSlug: slug,
      businessName: listing.businessName,
      submittedAt: new Date().toISOString(),
      type: "Marketplace Multi-Step",
      status: "New Lead"
    }

    try {
      await push(ref(database, `Institutes/${listing.ownerId}/website_inquiries`), enquiry)
      setIsSubmitted(true)
    } catch (e) {
      toast({ variant: "destructive", title: "Submission Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !listing || isSubmitting) return
    setIsSubmitting(true)

    try {
      const reviewData = {
        ...reviewForm,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now()
      }
      await push(ref(database, `MasterBusinessListings/${slug}/userReviews`), reviewData)
      await push(ref(database, `Institutes/${listing.ownerId}/marketplace_listing/main/userReviews`), reviewData)
      
      toast({ title: "Review Shared", description: "Thank you for your feedback!" })
      setIsReviewOpen(false)
      setReviewForm({ name: "", rating: "5", comment: "" })
    } catch (e) {
      toast({ variant: "destructive", title: "Review Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGetDirections = () => {
    if (!listing?.address) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(listing.address)}`;
    window.open(url, '_blank');
  };

  const shareWhatsApp = () => {
    const url = window.location.href;
    const text = `Check out ${listing?.businessName || 'this institute'} on Digital Class: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const copyToClipboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied", description: "Institutional URL copied to clipboard." });
  };

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
  
  if (!listing) return <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center"><h2 className="text-3xl font-black">Registry Offline</h2></div>

  return (
    <div className="min-h-screen bg-white font-public-sans text-black selection:bg-primary/20">
      
      {/* 🏙️ TOP NAV BAR */}
      <header className="bg-white border-b border-zinc-100 py-4 px-6 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                <School className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-black tracking-tighter">Digital Class</span>
            </Link>
            <div className="hidden md:flex relative group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-black group-focus-within:text-primary transition-colors" />
              <Input placeholder="Search services..." className="pl-10 h-9 w-64 bg-zinc-50 border-none rounded-md text-[14px] font-bold" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Button variant="outline" className="border-zinc-200 text-black rounded-lg h-9 px-4 font-bold text-[10px] tracking-widest hover:bg-zinc-50 transition-all">
              List Your Business <Badge className="ml-2 bg-orange-500 text-white border-none text-[8px]">FREE</Badge>
            </Button>
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
              <User className="w-4 h-4 text-black" />
            </div>
          </div>
        </div>
      </header>

      {/* 🏆 HERO SECTION */}
      <section className="bg-white pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
            <div className="w-40 h-40 rounded-xl border border-zinc-100 shadow-sm flex items-center justify-center p-4 shrink-0 bg-white relative">
              {listing.logoUrl ? (
                <img src={listing.logoUrl} className="w-full h-full object-contain" alt="Logo" />
              ) : (
                <div className="text-center"><p className="text-[10px] font-bold text-zinc-300">LOGO</p></div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black text-black tracking-tight">{listing.businessName}</h1>
                <Badge className="bg-amber-800/80 text-white border-none font-bold text-[9px] px-2 py-0.5 rounded-sm">PREMIUM</Badge>
              </div>
              
              <div className="flex items-center gap-3 text-[14px]">
                <span className="font-black text-black">{listing.rating || "4.1"}</span>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4].map(i => <Star key={i} className="w-4 h-4 fill-orange-400 text-orange-400" />)}
                  <Star className="w-4 h-4 fill-orange-200 text-orange-200" />
                </div>
                <span className="text-black font-medium">({reviews.length + (Number(listing.reviewsCount) || 0)} Reviews)</span>
              </div>

              <div className="space-y-2 pt-2">
                <p className="flex items-start gap-2.5 text-[14px] font-medium text-black leading-relaxed max-w-2xl">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" /> {listing.address}
                </p>
                <p className="flex items-center gap-2.5 text-[14px] font-medium text-black">
                  <Phone className="w-4 h-4 text-orange-500 shrink-0" /> {listing.mobile}
                </p>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <div className="flex flex-col gap-1 items-center">
                <Button 
                  onClick={() => setIsEnquiryOpen(true)}
                  className="w-full sm:w-64 lg:w-56 h-12 bg-[#0D9488] hover:bg-[#0b7a6d] text-white rounded-lg font-black text-[14px] tracking-wider shadow-lg border-none transition-all active:scale-95"
                >
                  Enquire Now
                </Button>
                <span className="text-[9px] font-black text-emerald-600 tracking-widest">Responds within 15 mins</span>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleGetDirections} variant="outline" className="flex-1 h-10 border-zinc-200 text-black hover:bg-zinc-50 rounded-lg font-bold text-[11px] gap-2">
                  <Navigation className="w-4 h-4" /> Directions
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 border-zinc-200 text-black rounded-lg outline-none">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-zinc-100 shadow-2xl bg-white">
                    <DropdownMenuItem onClick={shareWhatsApp} className="rounded-xl px-4 py-3 cursor-pointer focus:bg-zinc-50 flex items-center gap-3">
                      <img src="https://img.icons8.com/color/48/whatsapp--v1.png" className="w-5 h-5" alt="WA" />
                      <span className="text-[14px] font-bold text-black">WhatsApp</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareFacebook} className="rounded-xl px-4 py-3 cursor-pointer focus:bg-zinc-50 flex items-center gap-3">
                      <Facebook className="w-5 h-5 text-[#1877F2]" />
                      <span className="text-[14px] font-bold text-black">Facebook</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={copyToClipboard} className="rounded-xl px-4 py-3 cursor-pointer focus:bg-zinc-50 flex items-center gap-3">
                      <Copy className="w-5 h-5 text-black" />
                      <span className="text-[14px] font-bold text-black">Copy Link</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl px-4 py-3 cursor-pointer focus:bg-zinc-50 flex items-center gap-3">
                      <Instagram className="w-5 h-5 text-[#E4405F]" />
                      <span className="text-[14px] font-bold text-black">Instagram</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 md:gap-16 mt-12 py-8 border-y border-zinc-50 bg-zinc-50/20 rounded-3xl">
            <MetricBlock label="Established" value={listing.establishedYear || "2006"} />
            <div className="w-px h-10 bg-zinc-100 hidden sm:block" />
            <MetricBlock label="Sulekha Score" value={listing.sulekhaScore || "5.9"} />
            <div className="w-px h-10 bg-zinc-100 hidden sm:block" />
            <MetricBlock label="Rating" value={listing.rating || "4.1"} />
            <div className="w-px h-10 bg-zinc-100 hidden sm:block" />
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-[14px] font-black tracking-tight">Verified</span>
              </div>
              <p className="text-[10px] font-bold text-black tracking-widest">Digital Class Hub</p>
            </div>
          </div>
        </div>
      </section>

      {/* 📑 TABS NAVIGATION */}
      <Tabs defaultValue="about" className="w-full">
        <div className="bg-white border-b border-zinc-50 sticky top-[65px] z-50 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-6">
            <TabsList className="bg-transparent h-auto p-0 flex gap-10">
              <TabsTrigger value="about" className="h-14 px-0 border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:bg-transparent rounded-none text-[13px] font-black transition-all shadow-none">About</TabsTrigger>
              <TabsTrigger value="services" className="h-14 px-0 border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:bg-transparent rounded-none text-[13px] font-black transition-all shadow-none">Services</TabsTrigger>
              <TabsTrigger value="faculty" className="h-14 px-0 border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:bg-transparent rounded-none text-[13px] font-black transition-all shadow-none">Faculty</TabsTrigger>
              <TabsTrigger value="why" className="h-14 px-0 border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:bg-transparent rounded-none text-[13px] font-black transition-all shadow-none">Why Choose Us</TabsTrigger>
              <TabsTrigger value="gallery" className="h-14 px-0 border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:bg-transparent rounded-none text-[13px] font-black transition-all shadow-none">Gallery</TabsTrigger>
              <TabsTrigger value="reviews" className="h-14 px-0 border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:bg-transparent rounded-none text-[13px] font-black transition-all shadow-none">Reviews</TabsTrigger>
              <TabsTrigger value="social" className="h-14 px-0 border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:bg-transparent rounded-none text-[13px] font-black transition-all shadow-none">Social</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-16 px-6 grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8">
            <TabsContent value="about" className="mt-0 space-y-12">
              <div className="space-y-8">
                <h2 className="text-3xl font-black text-black tracking-tight">About {listing.businessName}</h2>
                <p className="text-lg text-black font-medium leading-relaxed whitespace-pre-wrap">{listing.overview}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-10">
                <HighlightBox iconId="Users2" title="10+ Years" sub="Experience" />
                <HighlightBox iconId="TrendingUp" title="90% Success" sub="Placement Rate" />
                <HighlightBox iconId="UserCheck" title="Expert Faculty" sub="Global Standards" />
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-0 space-y-10">
              <h3 className="text-2xl font-black text-black tracking-tight">Academic Programs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(listing.courses || []).map((c: any, i: number) => (
                  <Card key={i} className="border border-zinc-100 shadow-sm rounded-xl p-6 bg-white flex flex-col justify-between group hover:shadow-lg transition-all">
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-lg bg-zinc-50 flex items-center justify-center text-primary shadow-inner"><GraduationCap className="w-5 h-5" /></div>
                      <h4 className="text-lg font-black text-black tracking-tight">{c.name}</h4>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-black tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Duration: {c.duration}</p>
                        <p className="text-[10px] font-black text-emerald-600 tracking-widest flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> Fees: ₹ {Number(c.fees).toLocaleString()}</p>
                      </div>
                    </div>
                    <Button onClick={() => setIsEnquiryOpen(true)} variant="ghost" className="w-full mt-6 rounded-lg text-primary font-black text-[10px] tracking-widest h-10 border border-primary/10 hover:bg-primary/5 transition-all">Enquire Details</Button>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="faculty" className="mt-0 space-y-10">
              <h3 className="text-2xl font-black text-black tracking-tight">Meet Our Faculty</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {(listing.faculty || []).map((f: any, i: number) => (
                  <div key={i} className="text-center space-y-4 group">
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-zinc-50 shadow-lg group-hover:scale-105 transition-transform">
                      <img src={f.image || `https://picsum.photos/seed/${f.name}/100/100`} className="w-full h-full object-cover" alt={f.name} />
                    </div>
                    <div><h5 className="font-black text-black text-[14px]">{f.name}</h5><p className="text-[10px] font-bold text-black tracking-widest">{f.role}</p></div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="why" className="mt-0 space-y-10">
              <h3 className="text-2xl font-black text-black tracking-tight">Why Choose Us</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(listing.highlights || []).map((h: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 p-6 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm shrink-0">
                      {ICON_MAP[h.icon] || <CheckCircle2 className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1"><h5 className="font-black text-black text-lg leading-none">{h.title}</h5><p className="text-[14px] text-black font-medium">{h.sub}</p></div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="mt-0 space-y-10">
              <h3 className="text-2xl font-black text-black tracking-tight">Campus Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(listing.gallery || []).map((img: any, i: number) => (
                  <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-zinc-50 border border-zinc-100 relative group cursor-pointer shadow-sm">
                    <img src={img.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Campus" />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-0 space-y-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-black tracking-tight">Student Testimonials</h3>
                <Button onClick={() => setIsReviewOpen(true)} className="bg-primary text-white rounded-xl h-10 px-6 font-black text-[10px] tracking-widest shadow-lg border-none">Write Review</Button>
              </div>
              <div className="space-y-6">
                {reviews.map((r, i) => (
                  <Card key={i} className="p-8 border border-zinc-100 bg-white rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 font-black text-[14px]">{r.name?.charAt(0)}</div>
                        <div><h5 className="font-black text-black text-[14px]">{r.name}</h5><p className="text-[10px] font-bold text-black">{r.date}</p></div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, idx) => (
                          <Star key={idx} className={cn("w-3.5 h-3.5", idx < Number(r.rating) ? "fill-orange-400 text-orange-400" : "text-zinc-200")} />
                        ))}
                      </div>
                    </div>
                    <p className="text-black font-medium italic leading-relaxed">"{r.comment}"</p>
                  </Card>
                ))}
                {reviews.length === 0 && (
                  <div className="py-20 text-center bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-100">
                    <Quote className="w-10 h-10 text-zinc-200 mx-auto mb-4" />
                    <p className="text-[14px] font-bold text-black tracking-widest">No reviews shared yet. Be the first!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="social" className="mt-0 space-y-10 text-center">
              <h3 className="text-2xl font-black text-black tracking-tight">Connect With Us</h3>
              <div className="flex flex-wrap justify-center gap-6">
                {listing.social?.facebook && <SocialLinkBtn href={listing.social.facebook} icon={<Facebook className="w-6 h-6" />} label="Facebook" />}
                {listing.social?.twitter && <SocialLinkBtn href={listing.social.twitter} icon={<Twitter className="w-6 h-6" />} label="Twitter" />}
                {listing.social?.instagram && <SocialLinkBtn href={listing.social.instagram} icon={<Instagram className="w-6 h-6" />} label="Instagram" />}
                {listing.social?.linkedin && <SocialLinkBtn href={listing.social.linkedin} icon={<Linkedin className="w-4 h-4" />} label="LinkedIn" />}
                {listing.social?.youtube && <SocialLinkBtn href={listing.social.youtube} icon={<Youtube className="w-6 h-6" />} label="YouTube" />}
              </div>
            </TabsContent>
          </div>

          <aside className="lg:col-span-4 space-y-10 h-fit lg:sticky lg:top-32">
            <Card className="border border-zinc-100 shadow-sm rounded-xl bg-white p-8 space-y-8">
              <h4 className="text-[14px] font-black text-black tracking-[0.2em] border-b border-zinc-50 pb-4">Related Institutes</h4>
              <div className="space-y-8">
                {related.map((r, i) => (
                  <Link key={i} href={`/business/${r.slug}`} className="flex items-start gap-4 group">
                    <div className="w-14 h-14 rounded-lg border border-zinc-100 shadow-sm flex items-center justify-center p-2 bg-zinc-50 shrink-0 group-hover:scale-105 transition-transform">
                      {r.logoUrl ? <img src={r.logoUrl} className="w-full h-full object-contain" alt="Logo" /> : <Building2 className="w-6 h-6 text-zinc-200" />}
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-[14px] font-black text-black tracking-tight group-hover:text-rose-500 transition-colors line-clamp-2">{r.businessName}</h5>
                      <p className="text-[9px] font-bold text-black tracking-widest">{r.businessCategory}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="border-none shadow-xl rounded-xl bg-zinc-900 p-8 text-white relative overflow-hidden h-fit">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-emerald-400" /><h4 className="text-[14px] font-black tracking-tight">Claim Business</h4></div>
                <p className="text-[14px] text-black leading-relaxed font-medium">Own this profile? Claim it now to manage your dashboard and track leads.</p>
                <Button className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-lg h-10 font-black text-[10px] tracking-widest border-none transition-all active:scale-95">Verify Ownership</Button>
              </div>
            </Card>
          </aside>
        </div>
      </Tabs>

      {/* 🚀 ENQUIRY POPUP */}
      <Dialog open={isEnquiryOpen} onOpenChange={setIsEnquiryOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[600px] p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl focus:outline-none flex flex-col max-h-[85vh]">
          <div className="bg-[#0D9488] p-10 text-white relative shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            
            <div className="space-y-4">
              <Badge className="bg-white/10 text-white border-none text-[9px] font-black tracking-widest px-3">Step {currentStep} of 5</Badge>
              <DialogTitle className="text-3xl font-black tracking-tight leading-tight">Apply for Admission</DialogTitle>
              <Progress value={(currentStep / 5) * 100} className="h-1.5 bg-white/10" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-10">
              {isSubmitted ? (
                <div className="py-10 text-center space-y-8 animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner animate-bounce"><CheckCircle2 className="w-12 h-12" /></div>
                  <div className="space-y-2"><h3 className="text-2xl font-black text-black tracking-tight">Inquiry Synced!</h3><p className="text-[14px] text-black font-medium">Recorded in institutional node.</p></div>
                  <Button onClick={() => setIsEnquiryOpen(false)} className="w-full rounded-xl h-14 font-black text-[10px] tracking-widest bg-zinc-900 border-none text-white">Close Portal</Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {currentStep === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                      <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">Full Name</Label><Input value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} placeholder="John Doe" className="h-14 rounded-2xl bg-zinc-50 border-none font-bold" /></div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">Phone</Label><Input value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} placeholder="9876543210" className="h-14 rounded-2xl bg-zinc-50 border-none font-bold" /></div>
                        <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">Email</Label><Input value={enquiryForm.email} onChange={e => setEnquiryForm({...enquiryForm, email: e.target.value})} type="email" placeholder="john@example.com" className="h-14 rounded-2xl bg-zinc-50 border-none font-bold" /></div>
                      </div>
                      <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">City</Label><Input value={enquiryForm.city} onChange={e => setEnquiryForm({...enquiryForm, city: e.target.value})} placeholder="e.g. Ahmedabad" className="h-14 rounded-2xl bg-zinc-50 border-none font-bold" /></div>
                    </div>
                  )}
                  {currentStep === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                      <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">Course</Label><Select value={enquiryForm.course} onValueChange={v => setEnquiryForm({...enquiryForm, course: v})}><SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-none font-bold"><SelectValue placeholder="Choose program..." /></SelectTrigger><SelectContent>{listing?.courses?.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">Mode</Label><RadioGroup value={enquiryForm.mode} onValueChange={v => setEnquiryForm({...enquiryForm, mode: v})} className="grid grid-cols-2 gap-4"><Label className="flex items-center gap-3 p-6 rounded-2xl border-2 border-zinc-100 cursor-pointer hover:bg-zinc-50 [&:has([data-state=checked])]:border-primary"><RadioGroupItem value="Online" /> Online</Label><Label className="flex items-center gap-3 p-6 rounded-2xl border-2 border-zinc-100 cursor-pointer hover:bg-zinc-50 [&:has([data-state=checked])]:border-primary"><RadioGroupItem value="Classroom" /> Classroom</Label></RadioGroup></div>
                    </div>
                  )}
                  {currentStep === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                      <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">Message</Label><Textarea value={enquiryForm.message} onChange={e => setEnquiryForm({...enquiryForm, message: e.target.value})} className="rounded-3xl bg-zinc-50 border-none min-h-[150px] p-6" placeholder="Any specific requirements..." /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">Contact Time</Label><Select value={enquiryForm.contactTime} onValueChange={v => setEnquiryForm({...enquiryForm, contactTime: v})}><SelectTrigger className="h-14 rounded-2xl bg-zinc-50 border-none font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Afternoon">Afternoon</SelectItem><SelectItem value="Evening">Evening</SelectItem><SelectItem value="Anytime">Anytime</SelectItem></SelectContent></Select></div>
                    </div>
                  )}
                  {currentStep === 4 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                      <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">Resume (Optional)</Label><Input type="file" className="rounded-xl" /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black tracking-widest">ID Proof</Label><Input type="file" className="rounded-xl" /></div>
                    </div>
                  )}
                  {currentStep === 5 && (
                    <div className="space-y-8 animate-in zoom-in-95 text-center">
                      <h4 className="text-xl font-black">Final Review</h4>
                      <p className="text-[14px] text-black">Ready to submit application for {enquiryForm.name}?</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {!isSubmitted && (
            <div className="p-8 border-t border-zinc-100 bg-white flex justify-between gap-4">
              <Button disabled={currentStep === 1 || isSubmitting} onClick={() => setCurrentStep(prev => prev - 1)} variant="ghost" className="h-14 px-10 rounded-2xl font-black text-[10px] text-black">Previous</Button>
              {currentStep < 5 ? (
                <Button onClick={() => setCurrentStep(prev => prev + 1)} className="flex-1 h-14 bg-primary text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
              ) : (
                <Button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-1 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl">{isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : "Submit Inquiry"}</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ⭐️ WRITE REVIEW DIALOG */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-md p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-zinc-900 p-8 text-white relative">
            
            <h3 className="text-2xl font-black tracking-tight">Write a Review</h3>
            <p className="text-[14px] text-black font-medium tracking-widest mt-1">Share your experience with others</p>
          </div>
          <form onSubmit={handleSubmitReview} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black tracking-widest text-black">Your Name</Label>
              <Input value={reviewForm.name} onChange={e => setReviewForm({...reviewForm, name: e.target.value})} required className="h-12 rounded-xl bg-zinc-50 border-none font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black tracking-widest text-black">Rating (1 to 5)</Label>
              <Select value={reviewForm.rating} onValueChange={v => setReviewForm({...reviewForm, rating: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-zinc-50 border-none font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Excellent (5 Stars)</SelectItem>
                  <SelectItem value="4">Very Good (4 Stars)</SelectItem>
                  <SelectItem value="3">Average (3 Stars)</SelectItem>
                  <SelectItem value="2">Poor (2 Stars)</SelectItem>
                  <SelectItem value="1">Bad (1 Star)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black tracking-widest text-black">Your Experience</Label>
              <Textarea value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} required className="min-h-[120px] rounded-2xl bg-zinc-50 border-none font-medium" />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-primary text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none">
              {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : "Post Review Now"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <footer className="bg-zinc-950 text-white pt-20 pb-10 text-center">
        <p className="text-[10px] font-black text-black tracking-widest">© {new Date().getFullYear()} Digital Class Marketplace Node</p>
      </footer>
    </div>
  )
}

function MetricBlock({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="text-center space-y-1">
      <div className="text-2xl font-black text-black tracking-tighter">{value}</div>
      <p className="text-[10px] font-bold text-black tracking-widest">{label}</p>
    </div>
  )
}

function HighlightBox({ iconId, title, sub }: { iconId: string, title: string, sub: string }) {
  return (
    <div className="p-6 rounded-xl border border-zinc-100 bg-white flex flex-col items-center text-center gap-3 group hover:shadow-lg transition-all">
      <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
        {ICON_MAP[iconId] || <CheckCircle2 className="w-5 h-5" />}
      </div>
      <div className="space-y-0.5"><h5 className="text-[13px] font-black text-black">{title}</h5><p className="text-[9px] font-bold text-black">{sub}</p></div>
    </div>
  )
}

function SocialLinkBtn({ icon, href, label }: any) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-3 bg-zinc-50 rounded-xl hover:bg-primary hover:text-white transition-all group">
      <div className="text-black group-hover:text-white">{icon}</div>
      <span className="text-[14px] font-black tracking-widest">{label}</span>
    </a>
  )
}
