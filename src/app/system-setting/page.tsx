
"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Building2, 
  Mail, 
  Phone, 
  Save, 
  Upload, 
  Palette, 
  Check,
  Loader2,
  Languages,
  Globe,
  Type,
  Link as LinkIcon,
  Lock,
  ShieldCheck,
  User,
  AlertCircle,
  MapPin,
  Compass,
  Info,
  X,
  Eye,
  EyeOff,
  Hash,
  CaseSensitive,
  MessageSquare,
  Smartphone,
  Send
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, update, set, remove, get } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { verifyBeforeUpdateEmail, updatePassword, sendPasswordResetEmail } from "firebase/auth"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { hexToHslValues } from "@/lib/theme-utils"
import Image from "next/image"
import { usePathname } from "next/navigation"

const THEME_COLORS = [
  { name: "Teal", color: "hsl(var(--primary))" },
  { name: "Blue", color: "hsl(var(--primary))" },
  { name: "Indigo", color: "#6366F1" },
  { name: "Purple", color: "#8B5CF6" },
  { name: "Pink", color: "#EC4899" },
  { name: "Red", color: "#EF4444" },
  { name: "Orange", color: "#F97316" },
  { name: "Amber", color: "#F59E0B" },
  { name: "Green", color: "#10B981" },
  { name: "Slate", color: "#64748B" }
]

const FONT_FAMILIES = [
  { label: "Public Sans (Standard)", value: "Public Sans" },
  { label: "Poppins (Modern)", value: "Poppins" },
  { label: "Inter (UI Focus)", value: "Inter" },
  { label: "Montserrat (Bold)", value: "Montserrat" },
  { label: "Playfair Display (Academic)", value: "Playfair Display" },
  { label: "Roboto (Classic)", value: "Roboto" },
  { label: "Open Sans (Legible)", value: "Open Sans" },
  { label: "Lato (Minimal)", value: "Lato" },
  { label: "Oswald (Condensed)", value: "Oswald" },
  { label: "Merriweather (Serif)", value: "Merriweather" },
  { label: "Noto Sans (Universal)", value: "Noto Sans" },
  { label: "Nunito (Rounded)", value: "Nunito" },
  { label: "Raleway (Elegant)", value: "Raleway" },
  { label: "Ubuntu (Soft)", value: "Ubuntu" },
  { label: "PT Sans (Crisp)", value: "PT Sans" },
  { label: "Rubik (Friendly)", value: "Rubik" },
  { label: "Quicksand (Round)", value: "Quicksand" },
  { label: "Work Sans (Tech)", value: "Work Sans" },
  { label: "Fira Sans (Dev)", value: "Fira Sans" },
  { label: "IBM Plex Sans (Corporate)", value: "IBM Plex Sans" },
  { label: "Josefin Sans (Artistic)", value: "Josefin Sans" },
  { label: "Karla (Compact)", value: "Karla" },
  { label: "Libre Franklin (News)", value: "Libre Franklin" },
  { label: "Manrope (Modern UI)", value: "Manrope" },
  { label: "Space Grotesk (Neo-Grotesk)", value: "Space Grotesk" },
  { label: "DM Sans (Minimalist)", value: "DM Sans" },
  { label: "Cabin (Humane)", value: "Cabin" },
  { label: "Archivo (Display)", value: "Archivo" },
  { label: "Comfortaa (Playful)", value: "Comfortaa" },
  { label: "Kanit (Display Bold)", value: "Kanit" },
]

const SUPPORTED_LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Hindi (हिंदी)", value: "hi" },
  { label: "Gujarati (ગુજરાતી)", value: "gu" },
  { label: "Malayalam (മലയാളം)", value: "ml" },
  { label: "Tamil (தமிழ்)", value: "ta" },
  { label: "Telugu (తెలుగు)", value: "te" },
]

export default function SystemSettingPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const { database, storage, auth } = useFirebase()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSecuritySaving, setIsSecuritySaving] = useState(false)
  const [isResetSending, setIsResetSending] = useState(false)
  
  const [settings, setSettings] = useState<any>({
    instituteName: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
    websiteUrl: "",
    address: "",
    city: "",
    state: "",
    themeColor: "hsl(var(--primary))",
    logoUrl: "",
    language: "en",
    fontFamily: "Public Sans",
    capitalizeTitles: false,
    showItemCounts: false,
    communication: {
      whatsapp: { provider: "", apiKey: "", instanceId: "", url: "" },
      sms: { provider: "", apiKey: "", senderId: "" },
      email: { host: "", port: "", user: "", pass: "", from: "" },
      triggers: {
        afterAdmission: { whatsapp: false, sms: false, email: false, template: "" },
        afterSignup: { whatsapp: false, sms: false, email: false, template: "" },
        feePayment: { whatsapp: false, sms: false, email: false, template: "" },
        forgotPassword: { whatsapp: false, sms: false, email: false, template: "" }
      }
    }
  })

  const [newLoginEmail, setNewLoginEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [oldSlug, setOldSlug] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")

  useEffect(() => {
    if (!database || !user) return
    const settingsRef = ref(database, `Institutes/${user.uid}/profile`)
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setSettings({
          instituteName: data.instituteName || "",
          slug: data.slug || "",
          contactEmail: data.contactEmail || data.email || "",
          contactPhone: data.contactPhone || data.phone || "",
          websiteUrl: data.websiteUrl || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          themeColor: data.themeColor || "hsl(var(--primary))",
          logoUrl: data.logoUrl || "",
          language: data.language || "en",
          fontFamily: data.fontFamily || "Public Sans",
          capitalizeTitles: !!data.capitalizeTitles,
          showItemCounts: !!data.showItemCounts,
          communication: data.communication || {
            whatsapp: { provider: "", apiKey: "", instanceId: "", url: "" },
            sms: { provider: "", apiKey: "", senderId: "" },
            email: { host: "", port: "", user: "", pass: "", from: "" },
            triggers: {
              afterAdmission: { whatsapp: false, sms: false, email: false, template: "" },
              afterSignup: { whatsapp: false, sms: false, email: false, template: "" },
              feePayment: { whatsapp: false, sms: false, email: false, template: "" },
              forgotPassword: { whatsapp: false, sms: false, email: false, template: "" }
            }
          }
        })
        setOldSlug(data.slug || "")
        if (data.logoUrl) setPreviewUrl(data.logoUrl)
        setNewLoginEmail(user.email || "")
      }
      setIsLoading(false)
    })
    return () => off(settingsRef)
  }, [database, user])

  useEffect(() => {
    if (settings.themeColor) {
      const hslValues = hexToHslValues(settings.themeColor)
      document.documentElement.style.setProperty('--primary', hslValues)
      document.documentElement.style.setProperty('--ring', hslValues)
      document.documentElement.style.setProperty('--chart-1', hslValues)
    }
    if (settings.fontFamily) {
      document.documentElement.style.setProperty('--font-dynamic', `'${settings.fontFamily}', sans-serif`)
    }
  }, [settings.themeColor, settings.fontFamily])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !database) return

    setIsSaving(true)
    try {
      let finalLogoUrl = settings.logoUrl
      if (selectedFile) {
        const res = await uploadFileToImageKit(selectedFile, `/institutes/${user.uid}/logo`)
        finalLogoUrl = res.url
      }

      let currentSlug = settings.slug
      if (currentSlug && currentSlug !== oldSlug) {
        const cleanSlug = currentSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
        const slugRef = ref(database, `Slugs/${cleanSlug}`)
        const existing = await get(slugRef)
        if (existing.exists() && existing.val() !== user.uid) {
          toast({ variant: "destructive", title: "URL Unavailable", description: "This slug is already taken." })
          setIsSaving(false)
          return
        }
        if (oldSlug) await remove(ref(database, `Slugs/${oldSlug}`))
        await set(ref(database, `Slugs/${cleanSlug}`), user.uid)
        currentSlug = cleanSlug
      }

      await update(ref(database, `Institutes/${user.uid}/profile`), {
        ...settings,
        slug: currentSlug,
        logoUrl: finalLogoUrl,
        updatedAt: Date.now()
      })
      
      toast({ title: "Profile Updated" })
      setOldSlug(currentSlug)
    } catch (error) {
      toast({ variant: "destructive", title: "Sync failed" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!auth.currentUser?.email) return
    setIsResetSending(true)
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email)
      toast({ title: "Reset Email Sent", description: `A password reset link has been sent to ${auth.currentUser.email}.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsResetSending(false)
    }
  }

  const handleUpdateSecurity = async () => {
    if (!auth.currentUser) return
    setIsSecuritySaving(true)
    try {
      if (newLoginEmail.toLowerCase().trim() !== auth.currentUser.email?.toLowerCase().trim()) {
        await verifyBeforeUpdateEmail(auth.currentUser, newLoginEmail.trim())
        toast({ title: "Verification Sent", description: "Check your new email inbox." })
      }
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast({ variant: "destructive", title: "Mismatch" })
          setIsSecuritySaving(false)
          return
        }
        await updatePassword(auth.currentUser, newPassword)
        toast({ title: "Password Updated" })
        setNewPassword(""); setConfirmPassword("");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Restricted", description: "Firebase requires a recent login to update passwords directly." })
    } finally {
      setIsSecuritySaving(false)
    }
  }

  const updateComm = (category: string, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      communication: {
        ...prev.communication,
        [category]: {
          ...prev.communication?.[category],
          [field]: value
        }
      }
    }))
  }

  const updateTrigger = (triggerName: string, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      communication: {
        ...prev.communication,
        triggers: {
          ...prev.communication?.triggers,
          [triggerName]: {
            ...prev.communication?.triggers?.[triggerName],
            [field]: value
          }
        }
      }
    }))
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing secure link...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-32 font-public-sans text-black text-[14px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-3xl font-black text-black font-public-sans tracking-tight leading-none">Institute Settings</h2>
              <p className="text-[14px] text-black font-medium mt-1">Configure global identity, branding, and access credentials</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-primary hover:opacity-90 text-white rounded-xl h-12 px-8 font-black text-[10px] tracking-widest shadow-xl border-none transition-all active:scale-95"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Profile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 flex flex-col items-center gap-8">
                <h3 className="font-black text-black text-[10px] tracking-[0.3em] border-b border-zinc-50 pb-4 w-full text-center">Institutional Logo</h3>
                <div className="relative group">
                  <div className="w-48 h-48 bg-zinc-50 rounded-[48px] border-4 border-zinc-50 shadow-inner flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 overflow-hidden transition-all group-hover:scale-[1.02]">
                    {previewUrl ? (
                      <div className="relative w-full h-full p-6">
                        <img src={previewUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-zinc-200 mb-2" />
                        <p className="text-[10px] font-black text-zinc-300 tracking-widest text-center px-4">Upload Master Asset</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const sizeKB = file.size / 1024;
                          if (sizeKB < 100 || sizeKB > 1024) {
                            toast({ 
                              variant: "destructive", 
                              title: "Invalid File Size", 
                              description: "Institutional Logo must be between 100KB and 1MB." 
                            });
                            return;
                          }
                          setSelectedFile(file);
                          setPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      accept="image/*"
                    />
                  </div>
                </div>
                <div className="w-full space-y-2">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Logo Link (CDN)</Label>
                  <div className="relative group">
                    <LinkIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                    <Input 
                      value={settings.logoUrl}
                      onChange={(e) => {
                        setSettings({ ...settings, logoUrl: e.target.value });
                        setPreviewUrl(e.target.value);
                      }}
                      placeholder="https://..."
                      className="pl-11 h-12 rounded-xl border-zinc-100 bg-zinc-50 font-bold"
                    />
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 space-y-8">
                <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
                  <Palette className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-black text-[10px] tracking-widest">Interface Theme</h3>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {THEME_COLORS.map((tc) => (
                    <button
                      key={tc.name}
                      onClick={() => setSettings({ ...settings, themeColor: tc.color })}
                      className={cn(
                        "w-full aspect-square rounded-xl transition-all hover:scale-110 flex items-center justify-center border-4",
                        settings.themeColor === tc.color ? "border-zinc-100 shadow-lg" : "border-transparent"
                      )}
                      style={{ backgroundColor: tc.color }}
                    >
                      {settings.themeColor === tc.color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 space-y-8">
                <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
                  <Type className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-black text-[10px] tracking-widest">Global Typography</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Universal Font Family</Label>
                    <Select value={settings.fontFamily} onValueChange={(val) => setSettings({ ...settings, fontFamily: val })}>
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                        <ScrollArea className="h-80">
                          {FONT_FAMILIES.map(font => (
                            <SelectItem key={font.value} value={font.value} className="font-bold py-3">
                              <span style={{ fontFamily: `'${font.value}', sans-serif` }}>{font.label}</span>
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 space-y-8">
                <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
                  <Languages className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-black text-[10px] tracking-widest">Universal Language</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Interface Language</Label>
                    <Select value={settings.language} onValueChange={(val) => setSettings({ ...settings, language: val })}>
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                        {SUPPORTED_LANGUAGES.map(lang => (
                          <SelectItem key={lang.value} value={lang.value} className="font-bold">
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-8 space-y-10">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="bg-zinc-50 px-10 py-6 border-b border-zinc-100 flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-black text-[14px] tracking-widest">General Identity</h3>
                </div>
                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-black tracking-widest ml-1">Institute Full Name</Label>
                      <Input 
                        value={settings.instituteName} 
                        onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                        className="rounded-xl h-14 border-zinc-100 bg-zinc-50/50 text-lg font-black text-black" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-black tracking-widest ml-1">Public URL Slug</Label>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-4.5 h-5 w-5 text-zinc-300 group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={settings.slug} 
                          onChange={(e) => setSettings({ ...settings, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-') })}
                          placeholder="my-academy"
                          className="pl-12 rounded-xl h-14 border-zinc-100 bg-zinc-50/50 font-black text-primary" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="bg-zinc-50 px-10 py-6 border-b border-zinc-100 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#1e3a8a]" />
                  <h3 className="font-black text-black text-[14px] tracking-widest">UI Customization</h3>
                </div>
                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100 group transition-all hover:bg-white hover:shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                          <CaseSensitive className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-black">Capitalize Titles</p>
                          <p className="text-[10px] font-bold text-black tracking-widest">First Letter Capital</p>
                        </div>
                      </div>
                      <Switch 
                        checked={settings.capitalizeTitles}
                        onCheckedChange={(v) => setSettings({ ...settings, capitalizeTitles: v })}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100 group transition-all hover:bg-white hover:shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                          <Hash className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-black">Show Item Counts</p>
                          <p className="text-[10px] font-bold text-black tracking-widest">Display Module Totals</p>
                        </div>
                      </div>
                      <Switch 
                        checked={settings.showItemCounts}
                        onCheckedChange={(v) => setSettings({ ...settings, showItemCounts: v })}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="bg-zinc-50 px-10 py-6 border-b border-zinc-100 flex items-center gap-3">
                  <Compass className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-black text-[14px] tracking-widest">Website Contact Details</h3>
                </div>
                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-black tracking-widest ml-1">Public Support Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-4 h-5 w-5 text-zinc-300 group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={settings.contactEmail} 
                          onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                          placeholder="support@institute.com"
                          className="pl-12 h-14 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-black tracking-widest ml-1">Inquiry Mobile Number</Label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-4 h-5 w-5 text-zinc-300 group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={settings.contactPhone} 
                          onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value.replace(/[^0-9]/g, '') })}
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          className="pl-12 h-14 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Campus Address</Label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-4 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                      <Textarea 
                        value={settings.address} 
                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                        placeholder="Official physical address..."
                        className="pl-12 pt-4 rounded-[24px] min-h-[120px] border-zinc-100 bg-zinc-50/50 font-bold" 
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="bg-zinc-50 px-10 py-6 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h3 className="font-black text-black text-[14px] tracking-widest">Communication Integrations</h3>
                  </div>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold tracking-widest text-[9px]">Beta</Badge>
                </div>
                <div className="p-10">
                  <Tabs defaultValue="whatsapp" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-zinc-50 p-1 rounded-2xl h-14">
                      <TabsTrigger value="whatsapp" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all h-full">WhatsApp</TabsTrigger>
                      <TabsTrigger value="sms" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all h-full">SMS Gateway</TabsTrigger>
                      <TabsTrigger value="email" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all h-full">Email SMTP</TabsTrigger>
                      <TabsTrigger value="triggers" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-rose-500 data-[state=active]:shadow-sm transition-all h-full">Triggers & Templates</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="whatsapp" className="mt-8 space-y-6 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">Provider Name</Label>
                          <Input value={settings.communication?.whatsapp?.provider || ""} onChange={(e) => updateComm('whatsapp', 'provider', e.target.value)} placeholder="e.g. WATI, Twilio" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">API Key / Access Token</Label>
                          <Input value={settings.communication?.whatsapp?.apiKey || ""} onChange={(e) => updateComm('whatsapp', 'apiKey', e.target.value)} type="password" placeholder="sk-..." className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">Instance ID / Phone ID</Label>
                          <Input value={settings.communication?.whatsapp?.instanceId || ""} onChange={(e) => updateComm('whatsapp', 'instanceId', e.target.value)} placeholder="Instance ID" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">Endpoint URL</Label>
                          <Input value={settings.communication?.whatsapp?.url || ""} onChange={(e) => updateComm('whatsapp', 'url', e.target.value)} placeholder="https://api..." className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="sms" className="mt-8 space-y-6 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">SMS Provider</Label>
                          <Input value={settings.communication?.sms?.provider || ""} onChange={(e) => updateComm('sms', 'provider', e.target.value)} placeholder="e.g. TextLocal, MSG91" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">API Key</Label>
                          <Input value={settings.communication?.sms?.apiKey || ""} onChange={(e) => updateComm('sms', 'apiKey', e.target.value)} type="password" placeholder="API Key" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">Sender ID (6 Chars)</Label>
                          <Input value={settings.communication?.sms?.senderId || ""} onChange={(e) => updateComm('sms', 'senderId', e.target.value)} maxLength={6} placeholder="VCECED" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="email" className="mt-8 space-y-6 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">SMTP Host</Label>
                          <Input value={settings.communication?.email?.host || ""} onChange={(e) => updateComm('email', 'host', e.target.value)} placeholder="smtp.gmail.com" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">SMTP Port</Label>
                          <Input value={settings.communication?.email?.port || ""} onChange={(e) => updateComm('email', 'port', e.target.value)} placeholder="587 / 465" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">SMTP Username</Label>
                          <Input value={settings.communication?.email?.user || ""} onChange={(e) => updateComm('email', 'user', e.target.value)} placeholder="username@domain.com" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">SMTP Password / App Password</Label>
                          <Input value={settings.communication?.email?.pass || ""} onChange={(e) => updateComm('email', 'pass', e.target.value)} type="password" placeholder="••••••••" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-[10px] font-black text-black tracking-widest ml-1">From Email Address</Label>
                          <Input value={settings.communication?.email?.from || ""} onChange={(e) => updateComm('email', 'from', e.target.value)} placeholder="no-reply@institute.com" className="h-14 bg-zinc-50/50 border-zinc-100 rounded-xl font-bold" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="triggers" className="mt-8 space-y-8 animate-in fade-in duration-500">
                      {[
                        { key: 'afterAdmission', title: 'After Admission', desc: 'Triggered when a new student is admitted fully.' },
                        { key: 'afterSignup', title: 'After Portal Signup', desc: 'Triggered when someone signs up on the portal.' },
                        { key: 'feePayment', title: 'Fee Payment Receipt', desc: 'Triggered when a fee payment is successfully collected.' },
                        { key: 'forgotPassword', title: 'Password Recovery Email', desc: 'Triggered when a user requests a password reset link.' }
                      ].map(trigger => (
                        <div key={trigger.key} className="p-6 border border-zinc-100 rounded-3xl bg-zinc-50/30 space-y-6">
                          <div>
                            <h4 className="font-bold text-black text-[14px]">{trigger.title}</h4>
                            <p className="text-[14px] text-black mt-1">{trigger.desc}</p>
                          </div>
                          <div className="flex items-center gap-6 border-y border-zinc-100 py-4">
                             <div className="flex items-center gap-3">
                               <Switch checked={!!settings.communication?.triggers?.[trigger.key]?.whatsapp} onCheckedChange={(v) => updateTrigger(trigger.key, 'whatsapp', v)} />
                               <Label className="text-[14px] font-bold text-black">WhatsApp</Label>
                             </div>
                             <div className="flex items-center gap-3">
                               <Switch checked={!!settings.communication?.triggers?.[trigger.key]?.sms} onCheckedChange={(v) => updateTrigger(trigger.key, 'sms', v)} />
                               <Label className="text-[14px] font-bold text-black">SMS</Label>
                             </div>
                             <div className="flex items-center gap-3">
                               <Switch checked={!!settings.communication?.triggers?.[trigger.key]?.email} onCheckedChange={(v) => updateTrigger(trigger.key, 'email', v)} />
                               <Label className="text-[14px] font-bold text-black">Email</Label>
                             </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-black tracking-widest ml-1">Message Template</Label>
                            <Textarea 
                              value={settings.communication?.triggers?.[trigger.key]?.template || ""} 
                              onChange={(e) => updateTrigger(trigger.key, 'template', e.target.value)}
                              placeholder="Hello {{name}}, welcome to our institute!..."
                              className="bg-white border-zinc-200 rounded-2xl min-h-[100px] resize-none"
                            />
                            <p className="text-[10px] font-bold text-primary mt-2">Available variables: {'{{name}}, {{email}}, {{phone}}, {{amount}}, {{date}}'}</p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </div>
              </Card>

              <Card className="border-zinc-100 shadow-sm rounded-[32px] bg-zinc-900 px-10 py-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 flex flex-col space-y-8">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6 text-amber-500" />
                    <h3 className="text-xl font-black tracking-tight">Access Control (Security)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-black tracking-widest">Login Email</Label>
                      <Input value={newLoginEmail} onChange={e => setNewLoginEmail(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-black tracking-widest">New Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-black">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-black tracking-widest">Repeat Password</Label>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold pr-10" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3.5 text-black">{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
                    <button 
                      onClick={handleForgotPassword}
                      disabled={isResetSending}
                      className="text-[10px] font-black text-primary hover:underline tracking-widest transition-all flex items-center gap-2 border-none bg-transparent"
                    >
                      {isResetSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertCircle className="w-3 h-3" />}
                      Send Emergency Reset Link
                    </button>
                    <Button onClick={handleUpdateSecurity} disabled={isSecuritySaving} className="bg-primary hover:opacity-90 text-white rounded-2xl h-14 px-12 font-black text-[10px] tracking-widest shadow-xl border-none active:scale-95 transition-all">
                      {isSecuritySaving ? <Loader2 className="animate-spin w-4 h-4" /> : "Update Security Node"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
