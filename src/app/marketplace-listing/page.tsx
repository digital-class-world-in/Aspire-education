
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogClose,
  DialogDescription 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Globe, 
  Building2, 
  CheckCircle2, 
  Loader2, 
  Save, 
  X, 
  PlusCircle, 
  GraduationCap, 
  Clock, 
  BookOpen, 
  MessageSquare, 
  MinusCircle, 
  ImageIcon,
  MapPin,
  Phone,
  Mail,
  User,
  ExternalLink,
  ShieldCheck,
  Info,
  FileText,
  Share2,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  History,
  Eye,
  Store,
  Users2,
  Star,
  TrendingUp,
  Heart,
  IndianRupee,
  Link as LinkIcon
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, set, update, push, remove, off } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { format } from "date-fns"
import { ImageUpload } from "@/components/ImageUpload"

const BUSINESS_TYPES = ["Institute", "School", "University", "College", "Coaching Center"]

const ICON_OPTIONS = [
  { id: 'Users2', label: 'Experience', icon: Users2 },
  { id: 'TrendingUp', label: 'Success', icon: TrendingUp },
  { id: 'UserCheck', label: 'Faculty', icon: ShieldCheck },
  { id: 'Heart', label: 'Attention', icon: Heart },
  { id: 'IndianRupee', label: 'Fees', icon: IndianRupee },
  { id: 'CheckCircle2', label: 'Verified', icon: CheckCircle2 },
]

export default function BusinessListingManagementPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [activeRegistryTab, setActiveRegistryTab] = useState("registry")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [listings, setListings] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  
  const [activeFormTab, setActiveFormTab] = useState("basic")
  const [formData, setFormData] = useState<any>({
    businessName: "",
    authorisedPerson: "",
    businessType: "Institute",
    businessCategory: "",
    establishedYear: "2006",
    sulekhaScore: "5.9",
    rating: "4.1",
    reviewsCount: "10",
    keywords: "",
    address: "",
    googleLocation: "",
    mobile: "",
    whatsapp: "",
    email: "",
    overview: "",
    slug: "",
    logoUrl: "",
    courses: [],
    gallery: [],
    faqs: [],
    highlights: [],
    faculty: [],
    social: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
      youtube: ""
    }
  })

  const [newCourse, setNewCourse] = useState({ name: "", duration: "", fees: "", description: "" })
  const [newFaq, setNewFaq] = useState({ q: "", a: "" })
  const [newHighlight, setNewHighlight] = useState({ title: "", sub: "", icon: "CheckCircle2" })
  const [newFaculty, setNewFaculty] = useState({ name: "", role: "", image: "" })
  const [newImageUrl, setNewImageUrl] = useState("")

  useEffect(() => {
    if (!database || !user) return
    const rootPath = `Institutes/${user.uid}`
    
    onValue(ref(database, `${rootPath}/marketplace_listing`), (snapshot) => {
      const data = snapshot.val()
      if (data) setListings(Object.keys(data).map(k => ({ ...data[k], id: k })))
      else setListings([])
      setIsLoading(false)
    })

    onValue(ref(database, `${rootPath}/website_inquiries`), (snapshot) => {
      const data = snapshot.val()
      if (data) setInquiries(Object.keys(data).map(k => ({ ...data[k], id: k })).filter(i => i.businessSlug).reverse())
      else setInquiries([])
    })
  }, [database, user])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value }
      if (field === 'businessName' && !editingItem) {
        updated.slug = value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
      }
      return updated
    })
  }

  const handleAddCourse = () => {
    if (!newCourse.name) return
    handleInputChange('courses', [...(formData.courses || []), { ...newCourse, id: Date.now() }])
    setNewCourse({ name: "", duration: "", fees: "", description: "" })
  }

  const handleAddFaq = () => {
    if (!newFaq.q) return
    handleInputChange('faqs', [...(formData.faqs || []), { ...newFaq, id: Date.now() }])
    setNewFaq({ q: "", a: "" })
  }

  const handleAddHighlight = () => {
    if (!newHighlight.title) return
    handleInputChange('highlights', [...(formData.highlights || []), { ...newHighlight, id: Date.now() }])
    setNewHighlight({ title: "", sub: "", icon: "CheckCircle2" })
  }

  const handleAddFaculty = () => {
    if (!newFaculty.name) return
    handleInputChange('faculty', [...(formData.faculty || []), { ...newFaculty, id: Date.now() }])
    setNewFaculty({ name: "", role: "", image: "" })
  }

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return
    handleInputChange('gallery', [...(formData.gallery || []), { url: newImageUrl.trim(), id: Date.now() }])
    setNewImageUrl("")
  }

  const handleSaveListing = async () => {
    if (!database || !user) return
    setIsSubmitting(true)
    try {
      const cleanSlug = formData.slug.toLowerCase().trim()
      const listingId = editingItem?.id || 'main'
      const updates: any = {
        [`Institutes/${user.uid}/marketplace_listing/${listingId}`]: { ...formData, id: listingId, slug: cleanSlug, updatedAt: Date.now() },
        [`MasterBusinessListings/${cleanSlug}`]: { ...formData, slug: cleanSlug, ownerId: user.uid, updatedAt: Date.now() },
        [`Slugs/business/${cleanSlug}`]: user.uid
      }
      await update(ref(database), updates)
      toast({ title: "Synchronized", description: "Marketplace listing updated." })
      setIsModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredListings = useMemo(() => {
    return listings.filter(l => l.businessName?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [listings, searchTerm])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing Hub Link...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-10 max-w-7xl mx-auto w-full pb-32 font-public-sans text-[15px] font-bold text-black">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Business Listings</h2>
              <p className="text-[14px] text-black font-medium mt-1">Manage institutional presence nodes on the global education marketplace</p>
            </div>
            <Button onClick={() => { setEditingItem(null); setActiveFormTab('basic'); setIsModalOpen(true); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all tracking-widest">
              <Plus className="h-4 w-4" /> Add New Listing
            </Button>
          </div>

          <Tabs value={activeRegistryTab} onValueChange={setActiveRegistryTab} className="w-full space-y-8">
            <TabsList className="bg-white p-1.5 rounded-2xl h-14 shadow-sm border border-zinc-100 flex items-center w-fit">
              <TabsTrigger value="registry" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-[14px] tracking-widest transition-all">Listing Registry</TabsTrigger>
              <TabsTrigger value="inquiries" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-[14px] tracking-widest transition-all">Marketplace Inquiries</TabsTrigger>
            </TabsList>

            <TabsContent value="registry" className="mt-0">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="p-8 border-b border-zinc-50 flex items-center justify-between gap-4">
                  <div className="relative flex-1 group max-w-md">
                    <Search className="absolute left-4 top-3 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                    <Input placeholder="Search Registry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 h-12 rounded-xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-zinc-100">
                        <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-10 w-20">SR NO.</TableHead>
                        <TableHead className="text-[11px] font-black text-black tracking-widest h-14">BUSINESS IDENTITY</TableHead>
                        <TableHead className="text-[11px] font-black text-black tracking-widest h-14">PUBLIC LINK (SEO)</TableHead>
                        <TableHead className="text-right pr-10 text-[11px] font-black text-black tracking-widest h-14">OPERATIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredListings.map((item, idx) => (
                        <TableRow key={item.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group text-black">
                          <TableCell className="pl-10 text-[14px] font-bold text-zinc-300">{idx + 1}</TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center text-[#1e3a8a] shadow-inner overflow-hidden border border-zinc-100">
                                {item.logoUrl ? <img src={item.logoUrl} className="w-full h-full object-contain" alt="Logo" /> : <Building2 className="w-6 h-6" />}
                              </div>
                              <div>
                                <span className="text-[15px] font-black text-black tracking-tight">{item.businessName}</span>
                                <p className="text-[10px] font-bold text-black tracking-widest">{item.businessType} • {item.businessCategory}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/business/${item.slug}`} target="_blank" className="inline-flex items-center gap-2 group/link">
                              <Badge variant="outline" className="rounded-lg border-primary/20 text-primary font-black text-[9px] hover:bg-primary hover:text-white transition-all">/business/{item.slug}</Badge>
                              <ExternalLink className="w-3 h-3 text-zinc-300 group-hover/link:text-primary transition-colors" />
                            </Link>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" asChild className="h-9 w-9 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="View Public Page">
                                <Link href={`/business/${item.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setFormData(item); setActiveFormTab('basic'); setIsModalOpen(true); }} className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${user!.uid}/marketplace_listing/${item.id}`))} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="inquiries" className="mt-0">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="p-10 border-b border-zinc-50 flex items-center justify-between">
                  <h3 className="text-[14px] font-black text-black tracking-widest">Marketplace Leads</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow>
                        <TableHead className="pl-10 text-[10px] font-black h-14">Candidate Info</TableHead>
                        <TableHead className="text-[10px] font-black">Application Details</TableHead>
                        <TableHead className="text-right pr-10 text-[10px] font-black">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inquiries.map((inq, i) => (
                        <TableRow key={i} className="border-zinc-50">
                          <TableCell className="pl-10 py-6">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[15px] font-black text-black">{inq.name}</span>
                              <span className="text-[10px] font-bold text-black">{inq.phone} • {inq.city}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <p className="text-[11px] font-black text-[#1e3a8a] tracking-tight">{inq.course} ({inq.mode})</p>
                              <p className="text-[10px] text-black font-medium italic line-clamp-1">"{inq.message}"</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-10 text-[10px] font-bold text-zinc-300">{inq.submittedAt ? format(new Date(inq.submittedAt), "PPp") : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-5xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl flex flex-col max-h-[95vh]">
              <div className="bg-[#1e3a8a] px-10 py-8 text-white relative shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <DialogTitle className="text-3xl font-black tracking-tight font-public-sans">Listing Configuration</DialogTitle>
                <DialogDescription className="text-blue-200 text-[14px] font-bold tracking-widest mt-1">Marketplace Node Deployment Protocol</DialogDescription>
                
              </div>

              <div className="px-10 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center gap-4 shrink-0 overflow-x-auto scrollbar-none">
                <FormTabBtn active={activeFormTab === 'basic'} onClick={() => setActiveFormTab('basic')} label="Identity" icon={<Info className="w-4 h-4" />} />
                <FormTabBtn active={activeFormTab === 'overview'} onClick={() => setActiveFormTab('overview')} label="Narrative & SEO" icon={<Globe className="w-4 h-4" />} />
                <FormTabBtn active={activeFormTab === 'highlights'} onClick={() => setActiveFormTab('highlights')} label="Why Choose Us" icon={<Heart className="w-4 h-4" />} />
                <FormTabBtn active={activeFormTab === 'faculty'} onClick={() => setActiveFormTab('faculty')} label="Faculty" icon={<Users2 className="w-4 h-4" />} />
                <FormTabBtn active={activeFormTab === 'courses'} onClick={() => setActiveFormTab('courses')} label="Programs & Fees" icon={<GraduationCap className="w-4 h-4" />} />
                <FormTabBtn active={activeFormTab === 'gallery'} onClick={() => setActiveFormTab('gallery')} label="Media Archive" icon={<ImageIcon className="w-4 h-4" />} />
                <FormTabBtn active={activeFormTab === 'social'} onClick={() => setActiveFormTab('social')} label="Social Presence" icon={<Share2 className="w-4 h-4" />} />
                <FormTabBtn active={activeFormTab === 'faqs'} onClick={() => setActiveFormTab('faqs')} label="FAQ Registry" icon={<MessageSquare className="w-4 h-4" />} />
              </div>

              <ScrollArea className="flex-1">
                <div className="p-10 space-y-12 pb-24">
                  {activeFormTab === 'basic' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Business Name *</Label>
                          <Input value={formData.businessName} onChange={e => handleInputChange('businessName', e.target.value)} required className="h-14 rounded-2xl font-black text-lg shadow-inner" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Authorised Person</Label>
                          <Input value={formData.authorisedPerson} onChange={e => handleInputChange('authorisedPerson', e.target.value)} className="h-14 rounded-2xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Business Type</Label>
                          <Select value={formData.businessType} onValueChange={v => handleInputChange('businessType', v)}>
                            <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">{BUSINESS_TYPES.map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Category</Label>
                          <Input value={formData.businessCategory} onChange={e => handleInputChange('businessCategory', e.target.value)} placeholder="IT / Medical / Language" className="h-12 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Established Year</Label>
                          <Input value={formData.establishedYear} onChange={e => handleInputChange('establishedYear', e.target.value)} className="h-12 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Mobile</Label>
                          <Input value={formData.mobile} onChange={e => handleInputChange('mobile', e.target.value)} className="h-12 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">WhatsApp</Label>
                          <Input value={formData.whatsapp} onChange={e => handleInputChange('whatsapp', e.target.value)} className="h-12 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Email Node</Label>
                          <Input value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="h-12 rounded-xl font-bold lowercase" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Full Physical Address</Label>
                          <Textarea value={formData.address} onChange={e => handleInputChange('address', e.target.value)} className="rounded-2xl min-h-[100px]" />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Logo</Label>
                          <ImageUpload value={formData.logoUrl} onChange={(url) => handleInputChange('logoUrl', url)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFormTab === 'highlights' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-500">
                      <Card className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 space-y-6 shadow-inner">
                        <h4 className="text-[14px] font-black tracking-widest text-black">Add Highlight Node</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input value={newHighlight.title} onChange={e => setNewHighlight({...newHighlight, title: e.target.value})} placeholder="Title (e.g., 90%)" className="h-11 rounded-xl bg-white border-none font-bold" />
                          <Input value={newHighlight.sub} onChange={e => setNewHighlight({...newHighlight, sub: e.target.value})} placeholder="Subtitle (e.g., Success Rate)" className="h-11 rounded-xl bg-white border-none font-bold" />
                          <div className="flex gap-2">
                            <Select value={newHighlight.icon} onValueChange={v => setNewHighlight({...newHighlight, icon: v})}>
                              <SelectTrigger className="h-11 rounded-xl bg-white border-none font-bold flex-1"><SelectValue /></SelectTrigger>
                              <SelectContent>{ICON_OPTIONS.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="button" onClick={handleAddHighlight} className="bg-primary text-white rounded-xl h-11 px-6 border-none shadow-lg"><Plus className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </Card>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(formData.highlights || []).map((h: any, i: number) => {
                          const IconObj = ICON_OPTIONS.find(o => o.id === h.icon);
                          const IconComp = IconObj?.icon || CheckCircle2;
                          return (
                            <div key={i} className="p-6 bg-white rounded-3xl border border-zinc-100 flex items-center justify-between group shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-primary shadow-inner">
                                  <IconComp className="w-5 h-5" />
                                </div>
                                <div><p className="text-[14px] font-black text-black">{h.title}</p><p className="text-[10px] font-bold text-black">{h.sub}</p></div>
                              </div>
                              <button type="button" onClick={() => { const updated = [...formData.highlights]; updated.splice(i, 1); handleInputChange('highlights', updated); }} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {activeFormTab === 'faculty' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-500">
                      <Card className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 space-y-6 shadow-inner">
                        <h4 className="text-[14px] font-black tracking-widest text-black">Add Faculty Member</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input value={newFaculty.name} onChange={e => setNewFaculty({...newFaculty, name: e.target.value})} placeholder="Full Name" className="h-11 rounded-xl bg-white border-none font-bold" />
                            <Input value={newFaculty.role} onChange={e => setNewFaculty({...newFaculty, role: e.target.value})} placeholder="Designation" className="h-11 rounded-xl bg-white border-none font-bold" />
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <ImageUpload value={newFaculty.image} onChange={url => setNewFaculty({...newFaculty, image: url})} label="Upload Photo" />
                            <Button type="button" onClick={handleAddFaculty} className="bg-primary text-white rounded-xl h-11 px-6 border-none shadow-lg mt-2"><Plus className="w-4 h-4 mr-2" /> Add Faculty</Button>
                          </div>
                        </div>
                      </Card>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(formData.faculty || []).map((f: any, i: number) => (
                          <div key={i} className="p-6 bg-white rounded-3xl border border-zinc-100 flex flex-col items-center text-center group shadow-sm hover:shadow-md transition-all">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-4 border-zinc-50 shadow-inner">
                              <img src={f.image || `https://picsum.photos/seed/${f.name}/100/100`} className="w-full h-full object-cover" alt="Faculty" />
                            </div>
                            <h5 className="text-[14px] font-black text-black tracking-tight">{f.name}</h5>
                            <p className="text-[10px] font-bold text-black tracking-widest">{f.role}</p>
                            <button type="button" onClick={() => { const updated = [...formData.faculty]; updated.splice(i, 1); handleInputChange('faculty', updated); }} className="mt-4 p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFormTab === 'overview' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-500">
                      <div className="space-y-4">
                        <Label className="text-xl font-black text-black tracking-tight flex items-center gap-2 border-b pb-2"><FileText className="w-5 h-5 text-primary" /> Narrative Overview</Label>
                        <Textarea value={formData.overview} onChange={e => handleInputChange('overview', e.target.value)} placeholder="Describe your institute's strengths, history, and USPs..." className="min-h-[250px] rounded-3xl p-8 font-medium leading-relaxed bg-zinc-50 border-none shadow-inner" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">SEO Slug *</Label>
                          <Input value={formData.slug} onChange={e => handleInputChange('slug', e.target.value)} className="h-14 rounded-2xl font-black text-primary border-primary/20" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Meta Title</Label>
                          <Input value={formData.metaTitle} onChange={e => handleInputChange('metaTitle', e.target.value)} className="h-14 rounded-2xl" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-[11px] font-black text-black tracking-widest ml-1">Meta Description</Label>
                          <Textarea value={formData.metaDescription} onChange={e => handleInputChange('metaDescription', e.target.value)} className="rounded-2xl" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFormTab === 'courses' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-500">
                      <Card className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 space-y-6 shadow-inner">
                        <h4 className="text-[14px] font-black tracking-widest text-black">Add Academic Node</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Input value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})} placeholder="Program Name" className="h-11 rounded-xl bg-white border-none font-bold" />
                          <Input value={newCourse.duration} onChange={e => setNewCourse({...newCourse, duration: e.target.value})} placeholder="Duration" className="h-11 rounded-xl bg-white border-none font-bold" />
                          <Input value={newCourse.fees} onChange={e => setNewCourse({...newCourse, fees: e.target.value})} placeholder="Fees (INR)" className="h-11 rounded-xl bg-white border-none font-bold" />
                          <Button type="button" onClick={handleAddCourse} className="bg-primary text-white rounded-xl h-11 px-6 border-none shadow-lg"><Plus className="w-4 h-4" /></Button>
                        </div>
                      </Card>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(formData.courses || []).map((c: any, i: number) => (
                          <div key={i} className="p-6 bg-white rounded-3xl border border-zinc-100 flex items-center justify-between group shadow-sm transition-all hover:shadow-md">
                            <div><p className="text-[14px] font-black text-black tracking-tight">{c.name}</p><p className="text-[10px] font-bold text-black tracking-widest">{c.duration} • ₹{c.fees}</p></div>
                            <button type="button" onClick={() => { const updated = [...formData.courses]; updated.splice(i, 1); handleInputChange('courses', updated); }} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFormTab === 'gallery' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-500">
                      <div className="flex items-center gap-4">
                        <ImageUpload value={newImageUrl} onChange={setNewImageUrl} label="Upload Image" />
                        <Button type="button" onClick={handleAddImage} disabled={!newImageUrl} className="bg-primary text-white h-12 rounded-xl px-8 border-none shadow-xl mt-2"><Plus className="w-5 h-5 mr-2" /> Add to Gallery</Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {(formData.gallery || []).map((img: any, i: number) => (
                          <div key={i} className="aspect-square rounded-[32px] overflow-hidden bg-zinc-50 border border-zinc-100 relative group">
                            <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Gallery" />
                            <button type="button" onClick={() => { const updated = [...formData.gallery]; updated.splice(i, 1); handleInputChange('gallery', updated); }} className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all border-none shadow-lg cursor-pointer"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFormTab === 'social' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SocialInput label="Facebook" value={formData.social?.facebook} onChange={v => setFormData({...formData, social: {...formData.social, facebook: v}})} />
                        <SocialInput label="Twitter" value={formData.social?.twitter} onChange={v => setFormData({...formData, social: {...formData.social, twitter: v}})} />
                        <SocialInput label="Instagram" value={formData.social?.instagram} onChange={v => setFormData({...formData, social: {...formData.social, instagram: v}})} />
                        <SocialInput label="LinkedIn" value={formData.social?.linkedin} onChange={v => setFormData({...formData, social: {...formData.social, linkedin: v}})} />
                        <SocialInput label="YouTube" value={formData.social?.youtube} onChange={v => setFormData({...formData, social: {...formData.social, youtube: v}})} />
                      </div>
                    </div>
                  )}

                  {activeFormTab === 'faqs' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-500">
                      <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 space-y-6 shadow-inner">
                        <div className="space-y-4">
                          <Input value={newFaq.q} onChange={e => setNewFaq({...newFaq, q: e.target.value})} placeholder="Question" className="h-12 rounded-xl bg-white border-none font-bold" />
                          <Textarea value={newFaq.a} onChange={e => setNewFaq({...newFaq, a: e.target.value})} placeholder="Answer" className="rounded-xl bg-white border-none font-medium min-h-[100px]" />
                          <Button type="button" onClick={handleAddFaq} className="w-full bg-primary text-white rounded-xl h-12 border-none shadow-lg">Add Question Node</Button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {(formData.faqs || []).map((faq: any, i: number) => (
                          <div key={i} className="p-6 bg-white rounded-3xl border border-zinc-100 group transition-all hover:bg-zinc-50/50">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2"><p className="text-[14px] font-black text-black">Q: {faq.q}</p><p className="text-[14px] text-black font-medium leading-relaxed">A: {faq.a}</p></div>
                              <button type="button" onClick={() => { const updated = [...formData.faqs]; updated.splice(i, 1); handleInputChange('faqs', updated); }} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-10 border-t border-zinc-100 bg-white shrink-0 flex justify-end">
                <Button onClick={handleSaveListing} disabled={isSubmitting} className="h-16 px-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all border-none gap-3">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} Synchronize Marketplace Node
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

function FormTabBtn({ active, onClick, label, icon }: any) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black  tracking-widest transition-all border-none outline-none cursor-pointer",
        active ? "bg-[#1e3a8a] text-white shadow-lg shadow-blue-900/20 scale-105" : "text-black hover:text-black"
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function SocialInput({ label, icon, value, onChange }: { label: string, icon?: any, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-black text-black tracking-widest ml-1">{label} URL</Label>
      <div className="relative group">
        <LinkIcon className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
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
