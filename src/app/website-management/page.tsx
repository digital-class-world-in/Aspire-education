"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import {
  Plus,
  Trash2,
  Save,
  Monitor,
  Palette,
  ImageIcon,
  Loader2,
  Eye,
  Check,
  PlusCircle,
  X,
  PenTool,
  Megaphone,
  Shapes,
  Type,
  TrendingUp,
  Trophy,
  ShieldCheck,
  Globe,
  FileText,
  Target,
  CheckCircle2,
  Search,
  Link as LinkIcon,
  Maximize2,
  Smartphone,
  Building2,
  Users,
  Award,
  Zap,
  GraduationCap,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Mail,
  Share2,
  Info,
  MessageSquare,
  Quote
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, get, set } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import useEmblaCarousel from "embla-carousel-react"
import Link from "next/link"

const DEFAULT_STATS = [
  { id: 'def-1', label: "Years", value: 19, suffix: "+", subLabel: "of Legacy", icon: 'Award', color: 'bg-amber-50 border-amber-100' },
  { id: 'def-2', label: "Students", value: 10, suffix: " Lakh+", subLabel: "Nurtured", icon: 'Users', color: 'bg-blue-50 border-blue-100' },
  { id: 'def-3', label: "Centers", value: 80, suffix: "+", subLabel: "Across India", icon: 'Building2', color: 'bg-emerald-50 border-emerald-100' },
  { id: 'def-4', label: "Downloads", value: 10, suffix: " Lakh+", subLabel: "App Downloads", icon: 'Smartphone', color: 'bg-purple-50 border-purple-100' },
]

const FONT_FAMILIES = [
  { label: "Poppins (Modern)", value: "Poppins" },
  { label: "Public Sans (Standard)", value: "Public Sans" },
  { label: "Inter (Technical)", value: "Inter" },
  { label: "Montserrat (Bold)", value: "Montserrat" },
  { label: "Playfair Display (Academic)", value: "Playfair Display" },
]

const ICON_OPTIONS = [
  { id: 'Award', icon: Award },
  { id: 'Users', icon: Users },
  { id: 'Building2', icon: Building2 },
  { id: 'Smartphone', icon: Smartphone },
  { id: 'GraduationCap', icon: GraduationCap },
  { id: 'Trophy', icon: Trophy },
  { id: 'Zap', icon: Zap }
]

export default function WebsiteManagementPage() {
  const { database, storage } = useFirebase()
  const { user } = useUser()  
  const pathname = usePathname()
  const { resolvedId, isLoading: isIdLoading } = useResolvedId()

  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')
  const id = resolvedId || user?.uid || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"

  const [activeTab, setActiveTab] = useState("homepage")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingStat, setIsAddingStat] = useState(false)
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false)

  const [testimonialImageUrl, setTestimonialImageUrl] = useState("")
  const [isUploadingSlide, setIsUploadingSlide] = useState(false)
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)
  const [isUploadingTestimonial, setIsUploadingTestimonial] = useState(false)
  const [isUploadingMarqueeBg, setIsUploadingMarqueeBg] = useState(false)

  const [settings, setSettings] = useState<any>({
    selectedTheme: 'unicat',
    visibility: {
      hero: true,
      about: true,
      courses: true,
      stats: true,
      blog: true,
      testimonials: true,
      contact: true,
      marquee: true,
      youtube: true
    },
    marquee: {
      text: "Welcome to VCEC - Your Partner in Academic Excellence!",
      link: "",
      textColor: "#ffffff",
      backgroundColor: "#1e3a8a",
      backgroundImage: "",
      fontFamily: "Poppins",
      fontSize: 14,
      speed: 50
    },
    hero: {
      slides: [],
      title: "Superior Academic Management for Modern Institutions",
      description: "A comprehensive ecosystem designed for academic excellence, administrative precision, and verified student credentials.",
      buttonText: "Explore Programs",
      buttonLink: "",
      buttonColor: "#1e3a8a",
      titleColor: "#000000",
      descColor: "#000000"
    },
    youtubeSection: {
      title: "See Our Channel",
      description: "Watch our latest educational videos, tutorials, and campus life highlights.",
      videos: ["https://www.youtube.com/watch?v=ScMzIvxBSi4"]
    },
    social: {
      facebook: "",
      instagram: "",
      twitter: "",
      youtube: "",
      linkedin: "",
      email: ""
    },
    stats: [],
    gallery: [],
    styling: {
      titleColor: "#000000",
      descColor: "#000000",
      fontFamily: "Poppins",
      heroTitleFontFamily: "Poppins",
      heroDescFontFamily: "Poppins",
      titleFontSize: 64,
      descFontSize: 18,
      heroImageHeight: 600,
      sliderHeight: 550,
      sliderWidth: 100,
      sliderMarginTop: 0,
      sliderMarginBottom: 0,
      sliderMarginLeft: 0,
      sliderMarginRight: 0,
      sectionSpacing: 120
    },
    achievements: [],
    seo: {
      home: { title: "", description: "" },
      about: { title: "", description: "" },
      courses: { title: "", description: "" },
      facilities: { title: "", description: "" },
      gallery: { title: "", description: "" },
      contact: { title: "", description: "" }
    }
  })

  useEffect(() => {
    if (!database) return

    const rootPath = `Institutes/${id}/website_settings`

    get(ref(database, rootPath)).then((snapshot) => {
      const data = snapshot.val()
      if (data) {
        setSettings((prev: any) => ({
          ...prev,
          ...data,
          visibility: { ...prev.visibility, ...(data.visibility || {}) },
          styling: { ...prev.styling, ...(data.styling || {}) },
          hero: {
            slides: data.hero?.slides || [],
            title: data.hero?.title !== undefined ? data.hero.title : "",
            description: data.hero?.description !== undefined ? data.hero.description : "",
            buttonText: data.hero?.buttonText !== undefined ? data.hero.buttonText : "",
            buttonLink: data.hero?.buttonLink !== undefined ? data.hero.buttonLink : "",
            buttonColor: data.hero?.buttonColor !== undefined ? data.hero.buttonColor : prev.hero.buttonColor,
            titleColor: data.hero?.titleColor !== undefined ? data.hero.titleColor : prev.hero.titleColor,
            descColor: data.hero?.descColor !== undefined ? data.hero.descColor : prev.hero.descColor
          },
          milestoneHeading: { ...prev.milestoneHeading, ...(data.milestoneHeading || {}) },
          social: {
            facebook: data.social?.facebook !== undefined ? data.social.facebook : "",
            instagram: data.social?.instagram !== undefined ? data.social.instagram : "",
            twitter: data.social?.twitter !== undefined ? data.social.twitter : "",
            youtube: data.social?.youtube !== undefined ? data.social.youtube : "",
            linkedin: data.social?.linkedin !== undefined ? data.social.linkedin : "",
            email: data.social?.email !== undefined ? data.social.email : ""
          },
          stats: data.stats || [],
          gallery: data.gallery || [],
          testimonials: data.testimonials || [],
          youtubeSection: {
            title: data.youtubeSection?.title !== undefined ? data.youtubeSection.title : "",
            description: data.youtubeSection?.description !== undefined ? data.youtubeSection.description : "",
            videos: data.youtubeSection?.videos || []
          },
          marquee: { ...prev.marquee, ...(data.marquee || {}) }
        }))
      }
      setIsLoading(false)
    }).catch(console.error)
  }, [database, id])

  const handleUpdateSetting = (section: string, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }))
  }

  const handleAddStat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const color = formData.get("backgroundColor") as string || "#f8fafc"
    
    const newStat = {
      id: Math.random().toString(36).substr(2, 9),
      label: formData.get("label") as string,
      value: Number(formData.get("value")),
      suffix: formData.get("suffix") as string,
      subLabel: formData.get("subLabel") as string,
      icon: formData.get("icon") as string,
      color: color
    }

    const updatedStats = [...(settings.stats || []), newStat]
    setSettings((prev: any) => ({ ...prev, stats: updatedStats }))
    setIsAddingStat(false)
    toast({ title: "Counter added" })
  }

  const handleYoutubeUpdate = (field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      youtubeSection: { ...prev.youtubeSection, [field]: value }
    }))
  }

  const handleRemoveStat = (id: string) => {
    const baseList = settings.stats?.length > 0 ? settings.stats : DEFAULT_STATS
    const updatedStats = baseList.filter((s: any) => s.id !== id)
    setSettings((prev: any) => ({ ...prev, stats: updatedStats }))
  }

  const handleAddTestimonial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newTestimonial = {
      id: Date.now().toString(),
      name: formData.get("name") as string,
      role: formData.get("role") as string,
      message: formData.get("message") as string,
      image: testimonialImageUrl || `https://picsum.photos/seed/${Date.now()}/100/100`
    }

    const updated = [...(settings.testimonials || []), newTestimonial]
    setSettings((prev: any) => ({ ...prev, testimonials: updated }))
    setIsAddingTestimonial(false)
    setTestimonialImageUrl("")
    toast({ title: "Testimonial added" })
  }

  const handleRemoveTestimonial = (id: string) => {
    const updated = (settings.testimonials || []).filter((t: any) => t.id !== id)
    setSettings((prev: any) => ({ ...prev, testimonials: updated }))
  }

  const handleAddSlideFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeKB = file.size / 1024
    if (sizeKB > 5 * 1024) {
      toast({ variant: "destructive", title: "Invalid File Size", description: "Please upload an image under 5 MB" })
      return
    }

    setIsUploadingSlide(true)
    try {
      const res = await uploadFileToImageKit(file, `/website/${id || 'aspire'}/slides`)
      const newSlides = [...(settings.hero.slides || [])]
      newSlides.push({ imageUrl: res.url })
      handleUpdateSetting('hero', 'slides', newSlides)
      toast({ title: "Slide added", description: "Stored in ImageKit." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message || "Could not upload to ImageKit" })
    } finally {
      setIsUploadingSlide(false)
    }
  }

  const handleAddGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeKB = file.size / 1024
    if (sizeKB > 5 * 1024) {
      toast({ variant: "destructive", title: "Invalid File Size", description: "Please upload an image under 5 MB" })
      return
    }

    setIsUploadingGallery(true)
    try {
      const res = await uploadFileToImageKit(file, `/website/${id || 'aspire'}/gallery`)
      const newGallery = [...(settings.gallery || [])]
      newGallery.push({ url: res.url })
      setSettings((prev: any) => ({ ...prev, gallery: newGallery }))
      toast({ title: "Photo added", description: "Stored in ImageKit." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message || "Could not upload to ImageKit" })
    } finally {
      setIsUploadingGallery(false)
    }
  }

  const handleTestimonialImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeKB = file.size / 1024
    if (sizeKB > 5 * 1024) {
      toast({ variant: "destructive", title: "Invalid File Size", description: "Please upload an image under 5 MB" })
      return
    }

    setIsUploadingTestimonial(true)
    try {
      const res = await uploadFileToImageKit(file, `/website/${id || 'aspire'}/testimonials`)
      setTestimonialImageUrl(res.url)
      toast({ title: "Avatar uploaded", description: "Stored in ImageKit." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message || "Could not upload to ImageKit" })
    } finally {
      setIsUploadingTestimonial(false)
    }
  }

  const handleAddMarqueeBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeKB = file.size / 1024
    if (sizeKB > 5 * 1024) {
      toast({ variant: "destructive", title: "Invalid File Size", description: "Please upload an image under 5 MB" })
      return
    }

    setIsUploadingMarqueeBg(true)
    try {
      const res = await uploadFileToImageKit(file, `/website/${id || 'aspire'}/marquee`)
      handleUpdateSetting('marquee', 'backgroundImage', res.url)
      toast({ title: "Background uploaded", description: "Stored in ImageKit." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message || "Could not upload to ImageKit" })
    } finally {
      setIsUploadingMarqueeBg(false)
    }
  }

  const handleSave = async () => {
    if (!database) return
    setIsSaving(true)
    try {
      const finalSettings = { ...settings }
      if (!finalSettings.stats || finalSettings.stats.length === 0) {
        finalSettings.stats = DEFAULT_STATS
      }

      await set(ref(database, `Institutes/${id}/website_settings`), finalSettings)
      toast({ title: "Site synchronized", description: "Changes published instantly." })
    } catch (e) {
      toast({ variant: "destructive", title: "Sync failed" })
    } finally {
      setIsSaving(false)
    }
  }

  const displayedStats = settings.stats?.length > 0 ? settings.stats : DEFAULT_STATS

  if (isLoading || isIdLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-[14px] font-bold text-black tracking-widest">Loading website configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 w-full overflow-x-hidden", !isPortal && "lg:pl-[300px]")}>
        {!isPortal && <TopNav />}
        <main className={cn("flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full font-public-sans text-[15px] font-bold text-black", !isPortal ? "pb-32" : "pb-10")}>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Website Management</h2>
              <p className="text-[14px] text-black font-medium mt-1">Configure your institute's public website appearance</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                asChild
                className="h-11 px-6 rounded-xl font-bold text-[14px] gap-2 border-zinc-200 bg-white hover:bg-zinc-50 shadow-sm text-black"
              >
                <Link href="/" target="_blank">
                  <Eye className="h-4 w-4" />
                  Preview Website
                </Link>
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Publishing..." : "Publish Changes"}
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab as any} className="w-full">
            <TabsList className="bg-white p-1.5 rounded-2xl h-14 shadow-sm border border-zinc-100 mb-8 inline-flex items-center overflow-x-auto w-full justify-start md:w-auto">
              <TabsTrigger value="homepage" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Main Slider</TabsTrigger>
              <TabsTrigger value="marquee" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Marquee</TabsTrigger>
              <TabsTrigger value="branding" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Branding & Layout</TabsTrigger>
              <TabsTrigger value="testimonials" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Testimonials</TabsTrigger>
              <TabsTrigger value="gallery" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Gallery</TabsTrigger>
              <TabsTrigger value="social" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Social Links</TabsTrigger>
              <TabsTrigger value="visibility" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Modules</TabsTrigger>
            </TabsList>

            {/* ─── HOMEPAGE TAB ──────────────────────────────────────── */}
            <TabsContent value="homepage" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10 space-y-12">
                {/* Hero Content */}
                <div className="space-y-10">
                  <h4 className="text-xl font-normal text-black font-public-sans flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-primary" /> Hero Content
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Main Heading</Label>
                      <Input
                        value={settings.hero.title}
                        onChange={(e) => handleUpdateSetting('hero', 'title', e.target.value)}
                        className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Hero Description</Label>
                      <Textarea
                        value={settings.hero.description}
                        onChange={(e) => handleUpdateSetting('hero', 'description', e.target.value)}
                        className="rounded-xl border-zinc-200 font-bold min-h-[120px] text-black text-[15px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Button Text</Label>
                      <Input
                        value={settings.hero.buttonText}
                        onChange={(e) => handleUpdateSetting('hero', 'buttonText', e.target.value)}
                        className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Button Redirect Link</Label>
                      <Input
                        value={settings.hero.buttonLink}
                        onChange={(e) => handleUpdateSetting('hero', 'buttonLink', e.target.value)}
                        placeholder="#courses or /admission"
                        className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Slider Images */}
                <div className="space-y-10 pt-10 border-t border-zinc-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-normal text-black font-public-sans flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" /> Visual Slider
                      </h4>
                      <p className="text-[14px] text-black font-medium mt-1">Upload images from your computer.</p>
                    </div>
                    <div className="flex gap-3 items-end">
                      <Label className="cursor-pointer bg-primary text-white rounded-xl h-10 px-6 font-bold text-[14px] border-none shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                        {isUploadingSlide ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-1" />}
                        {isUploadingSlide ? "Uploading..." : "Upload Slide Image"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAddSlideFile} disabled={isUploadingSlide} />
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(settings.hero.slides || []).map((slide: any, idx: number) => (
                      <Card key={idx} className="relative group overflow-hidden rounded-[32px] border-none shadow-sm aspect-[4/5] bg-zinc-50">
                        <img
                          src={slide.imageUrl}
                          alt="Slide"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            onClick={() => {
                              const s = [...settings.hero.slides];
                              s.splice(idx, 1);
                              handleUpdateSetting('hero', 'slides', s);
                            }}
                            variant="destructive"
                            size="icon"
                            className="rounded-full shadow-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Statistics Section */}
              <div className="flex items-center gap-3 pt-10 border-t border-zinc-100">
                <TrendingUp className="w-6 h-6 text-black" />
                <h3 className="text-2xl font-normal text-black font-public-sans">Statistics & Counters</h3>
              </div>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10 space-y-10">
                {/* Section Branding */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Section Heading Text</Label>
                    <Input
                      value={settings.milestoneHeading?.text}
                      onChange={(e) => handleUpdateSetting('milestoneHeading', 'text', e.target.value)}
                      className="h-12 rounded-xl border-zinc-200 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Heading Color</Label>
                    <div className="flex gap-3">
                      <Input
                        type="color"
                        value={settings.milestoneHeading?.color}
                        onChange={(e) => handleUpdateSetting('milestoneHeading', 'color', e.target.value)}
                        className="w-12 h-12 p-1 rounded-xl border-zinc-200 cursor-pointer"
                      />
                      <Input
                        value={settings.milestoneHeading?.color}
                        onChange={(e) => handleUpdateSetting('milestoneHeading', 'color', e.target.value)}
                        className="flex-1 h-12 rounded-xl border-zinc-200 font-public-sans text-center"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Heading Font Family</Label>
                    <Select
                      value={settings.milestoneHeading?.fontFamily}
                      onValueChange={(v) => handleUpdateSetting('milestoneHeading', 'fontFamily', v)}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold bg-zinc-50/50 shadow-inner text-[15px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map(font => (
                          <SelectItem key={font.value} value={font.value} className="font-bold">{font.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add / Remove Stats */}
                <div className="flex items-center justify-between pt-10 border-t border-zinc-50">
                  <div>
                    <h4 className="text-xl font-normal text-black font-public-sans flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" /> Active Milestones
                    </h4>
                    <p className="text-[14px] text-black font-medium mt-1">Manage up to 8 counters visible on homepage.</p>
                  </div>
                  {(settings.stats || []).length < 8 && (
                    <Dialog open={isAddingStat} onOpenChange={setIsAddingStat}>
                    <DialogTrigger asChild>
                      <Button className="bg-zinc-900 text-white rounded-xl h-11 px-8 font-black text-[14px] gap-2 border-none shadow-sm active:scale-95 transition-all tracking-widest">
                        <Plus className="h-4 w-4" /> Add Counter
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:max-w-md p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
                      <div className="overflow-y-auto flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200">
                      <div className="bg-white px-8 pt-8 pb-4 text-black relative border-b border-zinc-50">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                        <DialogTitle className="text-xl font-black tracking-tight">New Milestone Counter</DialogTitle>
                      </div>
                      <form onSubmit={handleAddStat} className="p-8 space-y-6">
                        <div className="space-y-1.5">
                          <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Label (Top)</Label>
                          <Input name="label" placeholder="Well Trained Teachers" required className="h-12 rounded-xl border-zinc-200 font-bold" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Value</Label>
                            <Input name="value" type="number" placeholder="5000" required className="h-12 rounded-xl border-zinc-200 font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Suffix</Label>
                            <Input name="suffix" placeholder="+" className="h-12 rounded-xl border-zinc-200 font-bold" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Sub Label</Label>
                          <Input name="subLabel" placeholder="Experienced Faculty" className="h-12 rounded-xl border-zinc-200 font-bold" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Icon</Label>
                          <Select name="icon" defaultValue="Award">
                            <SelectTrigger className="h-12 rounded-xl border-zinc-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ICON_OPTIONS.map(opt => (
                                <SelectItem key={opt.id} value={opt.id} className="font-bold">{opt.id}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Background Color</Label>
                          <div className="flex gap-3 items-center">
                            <Input 
                              name="backgroundColor" 
                              type="color" 
                              id="statColorPicker"
                              defaultValue="#f8fafc" 
                              className="w-12 h-12 p-1 rounded-xl border-zinc-200 cursor-pointer"
                              onChange={(e) => {
                                const hexInput = document.getElementById('statColorHex') as HTMLInputElement;
                                if (hexInput) hexInput.value = e.target.value.toUpperCase();
                                const preview = document.getElementById('statColorPreview');
                                if (preview) preview.style.backgroundColor = e.target.value;
                              }}
                            />
                            <Input 
                              id="statColorHex"
                              placeholder="#RRGGBB" 
                              defaultValue="#F8FAFC"
                              className="flex-1 h-12 rounded-xl border-zinc-200 font-public-sans text-center" 
                              onChange={(e) => {
                                const picker = document.getElementById('statColorPicker') as HTMLInputElement;
                                if (picker && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                  picker.value = e.target.value;
                                  const preview = document.getElementById('statColorPreview');
                                  if (preview) preview.style.backgroundColor = e.target.value;
                                }
                              }}
                            />
                            <div 
                              id="statColorPreview"
                              className="w-12 h-12 rounded-xl border border-zinc-100 shadow-inner shrink-0"
                              style={{ backgroundColor: '#f8fafc' }}
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-14 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none mt-4 transition-all active:scale-95">
                          Add Milestone
                        </Button>
                      </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {displayedStats.map((stat: any) => (
                    <Card key={stat.id} 
                      className={cn(
                        "relative p-6 rounded-3xl border border-zinc-100 group transition-all hover:shadow-xl",
                      )}
                      style={{ backgroundColor: stat.color?.startsWith('bg-') ? undefined : stat.color }}
                    >
                      <button
                        onClick={() => handleRemoveStat(stat.id)}
                        className="absolute top-4 right-4 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="space-y-4 text-center">
                        <p className="text-[14px] font-bold text-black tracking-tight">{stat.label}</p>
                        <h5 className="text-3xl font-black text-primary tracking-tighter leading-none">
                          {stat.value}{stat.suffix}
                        </h5>
                        <p className="text-[10px] font-bold text-black tracking-widest leading-tight">
                          {stat.subLabel}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* YouTube Video Section Setup */}
                <div className="flex items-center gap-3 pt-12 border-t border-zinc-100">
                  <Youtube className="w-6 h-6 text-red-600" />
                  <h3 className="text-2xl font-normal text-black font-public-sans">YouTube Channel Slider</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-zinc-50/30 p-8 rounded-[32px] border border-zinc-100/50">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Section Title</Label>
                      <Input
                        value={settings.youtubeSection?.title}
                        onChange={(e) => handleYoutubeUpdate('title', e.target.value)}
                        placeholder="See Our Channel"
                        className="h-12 rounded-xl border-zinc-200 font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Section Description</Label>
                      <Textarea
                        value={settings.youtubeSection?.description}
                        onChange={(e) => handleYoutubeUpdate('description', e.target.value)}
                        placeholder="Watch institutional videos..."
                        className="min-h-[100px] rounded-xl border-zinc-200 font-bold text-[14px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Video Links (URLs)</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const v = [...(settings.youtubeSection?.videos || [])]
                          v.push("")
                          handleYoutubeUpdate('videos', v)
                        }}
                        className="h-8 rounded-lg font-bold text-[12px] border-zinc-200"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Link
                      </Button>
                    </div>
                    <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                      {(settings.youtubeSection?.videos || []).map((link: string, idx: number) => (
                        <div key={idx} className="flex gap-2 group">
                          <div className="relative flex-1">
                             <div className="absolute left-3 top-3.5"><Youtube className="w-4 h-4 text-red-600 opacity-50" /></div>
                             <Input
                               value={link}
                               onChange={(e) => {
                                 const v = [...settings.youtubeSection.videos]
                                 v[idx] = e.target.value
                                 handleYoutubeUpdate('videos', v)
                               }}
                               placeholder="https://www.youtube.com/watch?v=..."
                               className="h-11 pl-9 rounded-xl border-zinc-200 bg-white font-bold text-[13px]"
                             />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const v = [...settings.youtubeSection.videos]
                              v.splice(idx, 1)
                              handleYoutubeUpdate('videos', v)
                            }}
                            className="h-11 w-11 rounded-xl text-zinc-300 hover:text-red-500 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {(settings.youtubeSection?.videos || []).length === 0 && (
                        <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
                           <p className="text-[12px] font-bold text-zinc-400">No video links added yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ─── TESTIMONIALS TAB ──────────────────────────────────── */}
            <TabsContent value="testimonials" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                  <h3 className="text-xl font-normal text-black font-public-sans flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" /> Testimonials & Reviews
                  </h3>
                  <p className="text-[14px] text-black font-medium mt-1">Student & parent feedback shown in carousel.</p>
                </div>
                <Dialog open={isAddingTestimonial} onOpenChange={setIsAddingTestimonial}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-white rounded-xl h-11 px-8 font-black text-[14px] gap-2 border-none shadow-sm active:scale-95 transition-all tracking-widest">
                      <Plus className="h-4 w-4" /> Add Testimonial
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:max-w-md p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
                    <div className="overflow-y-auto flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200 text-black">
                    <div className="bg-white px-8 pt-8 pb-4 text-black relative border-b border-zinc-50">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                      <DialogTitle className="text-xl font-black tracking-tight">Add New Testimonial</DialogTitle>
                    </div>
                    <form onSubmit={handleAddTestimonial} className="p-8 space-y-6">
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Student / Parent Name</Label>
                        <Input name="name" placeholder="Pooja Devjani" required className="h-12 rounded-xl border-zinc-200 font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Designation / Relation</Label>
                        <Input name="role" placeholder="Parent of Class 10 student" required className="h-12 rounded-xl border-zinc-200 font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Avatar Image (optional)</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <Label className="cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-black rounded-xl h-12 px-6 font-bold text-[14px] border-none shadow-sm transition-all flex items-center justify-center gap-2 m-0">
                            {isUploadingTestimonial ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            {isUploadingTestimonial ? "Uploading..." : "Select Image"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleTestimonialImageUpload} disabled={isUploadingTestimonial} />
                          </Label>
                          {testimonialImageUrl && <img src={testimonialImageUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-zinc-200 shadow-sm" />}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Review Message</Label>
                        <Textarea
                          name="message"
                          required
                          placeholder="My child loves the teaching style and personal attention..."
                          className="rounded-xl border-zinc-200 min-h-[140px] font-medium"
                        />
                      </div>
                      <Button type="submit" className="w-full h-14 bg-primary text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none mt-4">
                        Publish Testimonial
                      </Button>
                    </form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(settings.testimonials || []).map((t: any) => (
                  <Card key={t.id} className="p-8 rounded-[32px] bg-white border border-zinc-100 shadow-sm relative group hover:shadow-xl transition-all duration-500">
                    <button
                      onClick={() => handleRemoveTestimonial(t.id)}
                      className="absolute top-4 right-4 text-zinc-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-zinc-50 shadow-inner shrink-0">
                        <img src={t.image} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h5 className="font-black text-black tracking-tight">{t.name}</h5>
                        <p className="text-[10px] font-bold text-black tracking-widest">{t.role}</p>
                      </div>
                    </div>
                    <p className="text-[14px] text-black leading-relaxed italic line-clamp-4">"{t.message}"</p>
                  </Card>
                ))}
                {(settings.testimonials || []).length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4 bg-zinc-50/50 rounded-[40px] border-2 border-dashed border-zinc-100">
                    <MessageSquare className="w-10 h-10 text-zinc-200 mx-auto" />
                    <p className="text-[14px] font-bold text-black tracking-widest">No testimonials added yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
            

            {/* ─── BRANDING TAB ──────────────────────────────────────── */}
            <TabsContent value="branding" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 space-y-10">
                  <h4 className="text-lg font-normal text-black font-public-sans flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <Type className="w-5 h-5 text-primary" /> Typography Settings
                  </h4>
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Global Font Family</Label>
                      <Select
                        value={settings.styling.fontFamily}
                        onValueChange={(v) => handleUpdateSetting('styling', 'fontFamily', v)}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black bg-zinc-50/50 shadow-inner text-[15px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map(font => (
                            <SelectItem key={font.value} value={font.value} className="font-bold">{font.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Hero Title Font</Label>
                      <Select
                        value={settings.styling.heroTitleFontFamily || settings.styling.fontFamily}
                        onValueChange={(v) => handleUpdateSetting('styling', 'heroTitleFontFamily', v)}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black bg-zinc-50/50 shadow-inner text-[15px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map(font => (
                            <SelectItem key={font.value} value={font.value} className="font-bold">{font.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Hero Description Font</Label>
                      <Select
                        value={settings.styling.heroDescFontFamily || settings.styling.fontFamily}
                        onValueChange={(v) => handleUpdateSetting('styling', 'heroDescFontFamily', v)}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black bg-zinc-50/50 shadow-inner text-[15px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map(font => (
                            <SelectItem key={font.value} value={font.value} className="font-bold">{font.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-[15px] font-bold text-black tracking-widest">Headline Size</Label>
                          <span className="text-[15px] font-bold text-primary">{settings.styling.titleFontSize}px</span>
                        </div>
                        <Slider
                          value={[settings.styling.titleFontSize]}
                          min={32} max={120} step={1}
                          onValueChange={(v) => handleUpdateSetting('styling', 'titleFontSize', v[0])}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-[15px] font-bold text-black tracking-widest">Description Size</Label>
                          <span className="text-[15px] font-bold text-primary">{settings.styling.descFontSize}px</span>
                        </div>
                        <Slider
                          value={[settings.styling.descFontSize]}
                          min={12} max={32} step={1}
                          onValueChange={(v) => handleUpdateSetting('styling', 'descFontSize', v[0])}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 space-y-10">
                  <h4 className="text-lg font-normal text-black font-public-sans flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <Shapes className="w-5 h-5 text-primary" /> Layout & Spacing
                  </h4>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-[15px] font-bold text-black tracking-widest">Hero Height</Label>
                        <span className="text-[15px] font-bold text-primary">{settings.styling.heroImageHeight}px</span>
                      </div>
                      <Slider
                        value={[settings.styling.heroImageHeight]}
                        min={400} max={1000} step={10}
                        onValueChange={(v) => handleUpdateSetting('styling', 'heroImageHeight', v[0])}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-[15px] font-bold text-black tracking-widest">Slider Height</Label>
                        <span className="text-[15px] font-bold text-primary">{settings.styling.sliderHeight}px</span>
                      </div>
                      <Slider
                        value={[settings.styling.sliderHeight]}
                        min={200} max={800} step={10}
                        onValueChange={(v) => handleUpdateSetting('styling', 'sliderHeight', v[0])}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-[15px] font-bold text-black tracking-widest">Slider Width (%)</Label>
                        <span className="text-[15px] font-bold text-primary">{settings.styling.sliderWidth}%</span>
                      </div>
                      <Slider
                        value={[settings.styling.sliderWidth]}
                        min={20} max={100} step={5}
                        onValueChange={(v) => handleUpdateSetting('styling', 'sliderWidth', v[0])}
                      />
                    </div>

                    <div className="pt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-[15px] font-bold text-black tracking-widest">Section Spacing</Label>
                        <span className="text-[15px] font-bold text-primary">{settings.styling.sectionSpacing}px</span>
                      </div>
                      <Slider
                        value={[settings.styling.sectionSpacing]}
                        min={40} max={200} step={8}
                        onValueChange={(v) => handleUpdateSetting('styling', 'sectionSpacing', v[0])}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ─── GALLERY TAB ───────────────────────────────────────── */}
            <TabsContent value="gallery" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10 space-y-10">
                <div className="flex items-center justify-between border-b border-zinc-50 pb-6">
                  <div>
                    <h4 className="text-xl font-normal text-black font-public-sans flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" /> Photo Gallery
                    </h4>
                    <p className="text-[14px] text-black font-medium mt-1">Upload campus, event & activity photos.</p>
                  </div>
                  <div className="flex gap-3 items-end">
                    <Label className="cursor-pointer bg-primary text-white rounded-xl h-10 px-6 font-bold text-[14px] border-none shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                      {isUploadingGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-1" />}
                      {isUploadingGallery ? "Uploading..." : "Upload Photo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAddGalleryFile} disabled={isUploadingGallery} />
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {(settings.gallery || []).map((img: any, idx: number) => (
                    <Card key={idx} className="relative group overflow-hidden rounded-2xl border-none shadow-sm aspect-square bg-zinc-50">
                      <img
                        src={img.url}
                        alt="Gallery"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={() => {
                            const g = [...settings.gallery];
                            g.splice(idx, 1);
                            setSettings({ ...settings, gallery: g });
                          }}
                          variant="destructive"
                          size="icon"
                          className="rounded-full shadow-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {(settings.gallery || []).length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-4 bg-zinc-50/50 rounded-3xl border-2 border-dashed border-zinc-100">
                      <ImageIcon className="w-10 h-10 text-zinc-200 mx-auto" />
                      <p className="text-[14px] font-bold text-black tracking-widest">No photos in gallery yet</p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* ─── SOCIAL LINKS TAB ──────────────────────────────────── */}
            <TabsContent value="social" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10 space-y-10">
                <div className="flex items-center gap-3 border-b border-zinc-50 pb-6">
                  <Share2 className="w-5 h-5 text-rose-500" />
                  <h4 className="text-xl font-normal text-black font-public-sans">Social Media Links</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                  <SocialInput
                    label="Facebook URL"
                    icon={<Facebook className="text-[#1877F2]" />}
                    value={settings.social?.facebook}
                    onChange={(v) => handleUpdateSetting('social', 'facebook', v)}
                  />
                  <SocialInput
                    label="Instagram URL"
                    icon={<Instagram className="text-[#E4405F]" />}
                    value={settings.social?.instagram}
                    onChange={(v) => handleUpdateSetting('social', 'instagram', v)}
                  />
                  <SocialInput
                    label="X (Twitter) URL"
                    icon={<Twitter className="text-[#1DA1F2]" />}
                    value={settings.social?.twitter}
                    onChange={(v) => handleUpdateSetting('social', 'twitter', v)}
                  />
                  <SocialInput
                    label="YouTube Channel"
                    icon={<Youtube className="text-[#FF0000]" />}
                    value={settings.social?.youtube}
                    onChange={(v) => handleUpdateSetting('social', 'youtube', v)}
                  />
                  <SocialInput
                    label="LinkedIn Page"
                    icon={<Linkedin className="text-[#0A66C2]" />}
                    value={settings.social?.linkedin}
                    onChange={(v) => handleUpdateSetting('social', 'linkedin', v)}
                  />
                  <SocialInput
                    label="Official Email"
                    icon={<Mail className="text-black" />}
                    value={settings.social?.email}
                    onChange={(v) => handleUpdateSetting('social', 'email', v)}
                  />
                </div>

                <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 flex items-start gap-4">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[13px] font-bold text-black leading-relaxed">
                    These links appear in footer, blog sharing buttons, and contact section. Empty links are hidden automatically.
                  </p>
                </div>
              </Card>
            </TabsContent>


            {/* ─── MARQUEE TAB ────────────────────────────────────────── */}
            <TabsContent value="marquee" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10 space-y-12">
                <div className="space-y-10">
                  <h4 className="text-xl font-normal text-black font-public-sans flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-primary" /> Marquee Line Section
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    <div className="space-y-2 col-span-full">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Marquee Text</Label>
                      <Input
                        value={settings.marquee?.text}
                        onChange={(e) => handleUpdateSetting('marquee', 'text', e.target.value)}
                        className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"
                        placeholder="Enter scrolling text..."
                      />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Redirect Link</Label>
                      <Input
                        value={settings.marquee?.link}
                        onChange={(e) => handleUpdateSetting('marquee', 'link', e.target.value)}
                        className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"
                        placeholder="https://... or /admission"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Text Color</Label>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={settings.marquee?.textColor}
                          onChange={(e) => handleUpdateSetting('marquee', 'textColor', e.target.value)}
                          className="w-12 h-12 p-1 rounded-xl border-zinc-200 cursor-pointer"
                        />
                        <Input
                          value={settings.marquee?.textColor}
                          onChange={(e) => handleUpdateSetting('marquee', 'textColor', e.target.value)}
                          className="flex-1 h-12 rounded-xl border-zinc-200 font-public-sans text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Background Color</Label>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={settings.marquee?.backgroundColor}
                          onChange={(e) => handleUpdateSetting('marquee', 'backgroundColor', e.target.value)}
                          className="w-12 h-12 p-1 rounded-xl border-zinc-200 cursor-pointer"
                        />
                        <Input
                          value={settings.marquee?.backgroundColor}
                          onChange={(e) => handleUpdateSetting('marquee', 'backgroundColor', e.target.value)}
                          className="flex-1 h-12 rounded-xl border-zinc-200 font-public-sans text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Font Family</Label>
                      <Select
                        value={settings.marquee?.fontFamily}
                        onValueChange={(v) => handleUpdateSetting('marquee', 'fontFamily', v)}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black bg-zinc-50/50 shadow-inner text-[15px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map(font => (
                            <SelectItem key={font.value} value={font.value} className="font-bold">{font.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Scroll Speed</Label>
                      <div className="flex items-center gap-4 pt-2">
                        <Slider
                          value={[settings.marquee?.speed || 50]}
                          min={10}
                          max={200}
                          step={5}
                          onValueChange={([v]) => handleUpdateSetting('marquee', 'speed', v)}
                          className="flex-1"
                        />
                        <span className="font-public-sans font-bold w-12 text-center text-primary">{settings.marquee?.speed || 50}</span>
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-zinc-50 col-span-full">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Background Image</Label>
                          <p className="text-[14px] text-black font-medium mt-1">Overlay image for the marquee section.</p>
                        </div>
                        <Label className="cursor-pointer bg-primary text-white rounded-xl h-10 px-6 font-bold text-[14px] border-none shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                          {isUploadingMarqueeBg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1" />}
                          {isUploadingMarqueeBg ? "Uploading..." : "Upload BG Image"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleAddMarqueeBgFile} disabled={isUploadingMarqueeBg} />
                        </Label>
                      </div>

                      {settings.marquee?.backgroundImage && (
                        <div className="relative w-full h-24 rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50 group">
                          <img src={settings.marquee.backgroundImage} className="w-full h-full object-cover" alt="Marquee Background" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              onClick={() => handleUpdateSetting('marquee', 'backgroundImage', '')}
                              variant="destructive"
                              size="icon"
                              className="rounded-full h-8 w-8"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="pt-10 border-t border-zinc-100">
                   <Label className="text-[15px] font-bold text-black tracking-widest ml-1 block mb-4">Live Preview</Label>
                   <div 
                    className="w-full h-12 rounded-xl flex items-center overflow-hidden relative"
                    style={{ 
                      backgroundColor: settings.marquee?.backgroundColor,
                      backgroundImage: settings.marquee?.backgroundImage ? `url(${settings.marquee.backgroundImage})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      fontFamily: `'${settings.marquee?.fontFamily}', sans-serif`
                    }}
                   >
                     <div className="absolute inset-0 flex items-center px-6">
                        <span style={{ color: settings.marquee?.textColor }} className="font-bold text-[14px] whitespace-nowrap">
                          {settings.marquee?.text}
                        </span>
                     </div>
                   </div>
                </div>
              </Card>
            </TabsContent>

            {/* ─── VISIBILITY / MODULES TAB ───────────────────────────── */}
            <TabsContent value="visibility" className="mt-0">
              <Card className="border-none shadow-sm rounded-[40px] bg-white p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.keys(settings.visibility || {}).map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-8 bg-zinc-50/50 rounded-3xl border border-zinc-100 group hover:border-primary/20 transition-all"
                  >
                    <Label className="text-[15px] font-bold text-black tracking-widest">
                      {key.replace('_', ' ')}
                    </Label>
                    <Switch
                      checked={settings.visibility[key]}
                      onCheckedChange={(v) => {
                        const newVis = { ...settings.visibility, [key]: v };
                        setSettings({ ...settings, visibility: newVis });
                      }}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                ))}
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

function SocialInput({ label, icon, value, onChange }: { label: string, icon: any, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">{label}</Label>
      <div className="relative group">
        <div className="absolute left-4 top-3.5 group-focus-witahin:scale-110 transition-transform">{icon}</div>
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="pl-12 h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold text-black text-[15px] focus-visible:ring-1 focus-visible:ring-black"
        />
      </div>
    </div>
  )
}
