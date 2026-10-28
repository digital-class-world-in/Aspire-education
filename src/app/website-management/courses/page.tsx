
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  GraduationCap, 
  Save, 
  Loader2,
  X,
  ImageIcon,
  CheckCircle2,
  PlusCircle,
  Settings2,
  BookOpen,
  MessageSquare,
  MinusCircle,
  Link as LinkIcon,
  Layers,
  Layout,
  FileText,
  Timer,
  Clock,
  CreditCard,
  Globe,
  FileEdit,
  ShieldCheck,
  Type,
  Target,
  Zap,
  Sparkles,
  Video,
  Smartphone,
  Eye
} from "lucide-react"
import Link from "next/link"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, update, remove, off, set } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/ImageUpload"

interface FAQItem {
  id: string;
  q: string;
  a: string;
}

interface SyllabusChapter {
  id: string;
  title: string;
  content: string;
}

interface VideoLesson {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
}

export default function CoursesSetupPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const pathname = usePathname()
  const { resolvedId, isLoading: idLoading } = useResolvedId()

  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')
  const id = resolvedId || user?.uid || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"
  
  const [courses, setCourses] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cardImage, setCardImage] = useState("")

  // Pricing State for live discount calculation
  const [origPrice, setOrigPrice] = useState<string>("")
  const [sellPrice, setSellPrice] = useState<string>("")

  // Dynamic Sections State
  const [outcomes, setOutcomes] = useState<string[]>([])
  const [newOutcome, setNewOutcome] = useState("")
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [faqs, setFaqs] = useState<FAQItem[]>([{ id: '1', q: "", a: "" }])
  const [syllabusChapters, setSyllabusChapters] = useState<SyllabusChapter[]>([
    { id: '1', title: "", content: "" }
  ])
  const [lessons, setLessons] = useState<VideoLesson[]>([
    { id: '1', title: "", duration: "", videoUrl: "" }
  ])

  // Manage Dropdown States
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [activeManageField, setActiveManageField] = useState<{key: string, label: string} | null>(null)
  const [newOptionValue, setNewOptionValue] = useState("")
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})

  useEffect(() => {
    if (!database || !id) return
    const rootPath = `Institutes/${id}`
    
    const unsubCourses = onValue(ref(database, `${rootPath}/website_courses`), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setCourses(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setCourses([])
      }
      setIsLoading(false)
    })

    const unsubDropdowns = onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => { 
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value })) 
      })
      setDropdownData(processed)
    })

    return () => {
      unsubDropdowns();
    }
  }, [database, id])

  const filtered = useMemo(() => {
    return courses.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [courses, searchTerm])

  const discountPercent = useMemo(() => {
    const op = Number(origPrice)
    const sp = Number(sellPrice)
    if (!op || !sp || op <= sp) return 0
    return Math.round(((op - sp) / op) * 100)
  }, [origPrice, sellPrice])

  const handleAddOutcome = () => {
    if (!newOutcome.trim()) return
    setOutcomes([...outcomes, newOutcome.trim()])
    setNewOutcome("")
  }

  const handleRemoveOutcome = (idx: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== idx))
  }

  const handleAddFaq = () => {
    setFaqs([...faqs, { id: Date.now().toString(), q: "", a: "" }])
  }

  const handleRemoveFaq = (id: string) => {
    if (faqs.length > 1) setFaqs(faqs.filter(f => f.id !== id))
  }

  const handleUpdateFaq = (id: string, field: 'q' | 'a', value: string) => {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  const handleAddSyllabus = () => {
    setSyllabusChapters([...syllabusChapters, { id: Date.now().toString(), title: "", content: "" }])
  }

  const handleRemoveSyllabus = (id: string) => {
    if (syllabusChapters.length > 1) setSyllabusChapters(syllabusChapters.filter(s => s.id !== id))
  }

  const handleUpdateSyllabus = (id: string, field: 'title' | 'content', value: string) => {
    setSyllabusChapters(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const handleAddLesson = () => {
    setLessons([...lessons, { id: Date.now().toString(), title: "", duration: "", videoUrl: "" }])
  }

  const handleRemoveLesson = (id: string) => {
    if (lessons.length > 1) setLessons(lessons.filter(s => s.id !== id))
  }

  const handleUpdateLesson = (id: string, field: 'title' | 'duration' | 'videoUrl', value: string) => {
    setLessons(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!id || !database || isSubmitting) return
    
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const courseData: any = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      status: formData.get("status") as string || "Published",
      image: formData.get("image") as string,
      backgroundImage: formData.get("backgroundImage") as string || "",
      description: formData.get("description") as string,
      syllabus: syllabusChapters.filter(s => s.title.trim() !== ""),
      lessons: lessons.filter(l => l.title.trim() !== ""),
      languages: selectedLanguages,
      provideCertificate: formData.get("provideCertificate") as string,
      originalPrice: Number(origPrice),
      sellingPrice: Number(sellPrice),
      duration: formData.get("duration") as string,
      hours: formData.get("hours") as string,
      totalChapters: formData.get("totalChapters") as string,
      totalVideos: formData.get("totalVideos") as string || "0",
      pdfResources: formData.get("pdfResources") as string || "No",
      deviceAccess: formData.get("deviceAccess") as string || "No",
      digitalCredential: formData.get("digitalCredential") as string || "No",
      courseMode: formData.get("courseMode") as string || "Self-Paced",
      paymentMode: formData.get("paymentMode") as string,
      showOnHomepage: formData.get("showOnHomepage") === "on",
      outcomeHeading: formData.get("outcomeHeading") as string || "What you'll achieve",
      outcomes: outcomes,
      faqs: faqs.filter(f => f.q.trim() !== ""),
      updatedAt: Date.now()
    }

    try {
      const dbPath = `Institutes/${id}/website_courses`
      if (editingItem && editingItem.id) {
        await update(ref(database, `${dbPath}/${editingItem.id}`), courseData)
        toast({ title: "Course Updated", description: "Changes synchronized successfully." })
      } else {
        const newRef = push(ref(database, dbPath))
        await set(newRef, { ...courseData, createdAt: Date.now() })
        toast({ title: "Course Added", description: "New program published to catalog." })
      }
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEdit = (course: any) => {
    setEditingItem(course)
    setCardImage(course.image || "")
    setOrigPrice(course.originalPrice?.toString() || "")
    setSellPrice(course.sellingPrice?.toString() || course.price?.toString() || "")
    setOutcomes(course.outcomes || [])
    setSelectedLanguages(course.languages || [])
    setSyllabusChapters(Array.isArray(course.syllabus) ? course.syllabus : [{ id: '1', title: "", content: "" }])
    setLessons(Array.isArray(course.lessons) ? course.lessons : [{ id: '1', title: "", duration: "", videoUrl: "" }])
    setFaqs(Array.isArray(course.faqs) ? course.faqs : [{ id: '1', q: "", a: "" }])
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingItem(null); 
    setCardImage("");
    setOrigPrice("");
    setSellPrice("");
    setOutcomes([]); 
    setSelectedLanguages([]); 
    setSyllabusChapters([{ id: '1', title: "", content: "" }]);
    setLessons([{ id: '1', title: "", duration: "", videoUrl: "" }]);
    setFaqs([{ id: '1', q: "", a: "" }]);
    setIsModalOpen(true);
  }

  const handleDelete = async (id_to_delete: string) => {
    if (!database || !id) return
    if (confirm("Permanently remove this course?")) {
      await remove(ref(database, `Institutes/${id}/website_courses/${id_to_delete}`))
      toast({ title: "Record deleted" })
    }
  }

  const handleSaveOption = () => {
    if (!newOptionValue.trim() || !id || !database || !activeManageField) return
    const dbPath = `Institutes/${id}/dropdowns/${activeManageField.key}`
    if (editingOptionId) {
      update(ref(database, `${dbPath}/${editingOptionId}`), { value: newOptionValue.trim() })
        .then(() => { setNewOptionValue(""); setEditingOptionId(null); })
    } else {
      push(ref(database, dbPath), { value: newOptionValue.trim() }).then(() => setNewOptionValue(""))
    }
  }

  const openManageModal = (key: string, label: string) => { 
    setActiveManageField({ key, label }); 
    setNewOptionValue(""); 
    setEditingOptionId(null); 
    setIsManageOpen(true); 
  }

  if (isLoading || idLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing secure node sync...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 w-full overflow-x-hidden", !isPortal && "lg:pl-[300px]")}>
        {!isPortal && <TopNav />}
        <main className={cn("flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full font-public-sans text-[15px] font-bold text-black", !isPortal ? "pb-32" : "pt-4 pb-10")}>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Courses setup</h2>
              <p className="text-[14px] text-black font-medium mt-1">Manage academic programs and detailed parameters for your public portal</p>
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
              <Button onClick={resetForm} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95">
                <Plus className="h-4 w-4" /> Add course
              </Button>
            </div>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-6">
            <div className="relative group max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search catalog..." 
                className="pl-12 h-12 rounded-xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold text-black focus-visible:ring-1 focus-visible:ring-black text-[15px]" 
              />
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14 pl-10 w-20">SR NO.</TableHead>
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">COURSE INFO</TableHead>
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">STATUS</TableHead>
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">PRICE (INR)</TableHead>
                    <TableHead className="text-right pr-10 text-[15px] font-bold text-black tracking-widest h-14">OPERATIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, idx) => (
                    <TableRow key={item.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                      <TableCell className="text-[15px] font-bold text-black pl-10">{idx + 1}</TableCell>
                      <TableCell className="py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-inner border border-zinc-50 shrink-0 bg-zinc-100 flex items-center justify-center">
                            {item.image ? (
                              <img src={item.image} className="w-full h-full object-cover" alt="Course" />
                            ) : (
                              <GraduationCap className="w-8 h-8 text-zinc-300" />
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[15px] font-bold text-black tracking-tight">{item.name}</span>
                            <p className="text-[11px] font-bold text-black tracking-widest">
                              {item.duration || '0'} Mo • {item.hours || '0'} Hours
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "rounded-lg px-3 py-1 text-[9px] font-black  border-none shadow-none transition-none",
                          item.status === 'Draft' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}>{item.status || 'Published'}</Badge>
                      </TableCell>
                      <TableCell className="text-[15px] font-bold text-black">₹{Number(item.sellingPrice || item.price).toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="h-3.5 w-3.5" /></Button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all border-none bg-transparent cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Dialog open={isModalOpen} onOpenChange={(o) => { setIsModalOpen(o); if(!o) setEditingItem(null); }}>
            <DialogContent className="w-[95vw] sm:max-w-4xl p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
              <div className="overflow-y-auto flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200">
                <div className="bg-white px-6 md:px-10 py-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 z-50">
                  <DialogTitle className="text-xl font-black tracking-tight">
                    {editingItem ? 'Refine course parameters' : 'New enrollment node'}
                  </DialogTitle>
                </div>
                <form key={editingItem?.id || 'new-course-form'} onSubmit={handleSave} className="p-10 space-y-16">
                  
                  {/* Section 1: Identity & Status */}
                  <div className="space-y-10">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner"><Type className="w-5 h-5" /></div>
                      <h3 className="text-lg font-black tracking-tight">1. Core Identity & Visibility</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Course name *</Label>
                        <Input name="name" defaultValue={editingItem?.name} required className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Course status *</Label>
                        <Select name="status" defaultValue={editingItem?.status || "Published"}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Published" className="text-[15px] font-bold">Published (Public)</SelectItem>
                            <SelectItem value="Draft" className="text-[15px] font-bold">Draft (Hidden)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="lg:col-span-2 space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Card visual *</Label>
                        <ImageUpload value={cardImage} onChange={setCardImage} />
                        <input type="hidden" name="image" value={cardImage} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Course type *</Label>
                        <Select name="type" defaultValue={editingItem?.type || "Online"}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Online" className="text-[15px] font-bold">Online</SelectItem>
                            <SelectItem value="Offline" className="text-[15px] font-bold">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="lg:col-span-3 space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Main description *</Label>
                        <Textarea name="description" defaultValue={editingItem?.description} required className="rounded-xl border-zinc-200 min-h-[120px] text-black font-bold text-[15px]" />
                      </div>
                      <div className="lg:col-span-3 space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Supported Languages *</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["English", "Hindi", "Marathi", "Gujarati", "Bengali", "Tamil", "Telugu"].map(lang => (
                            <div 
                              key={lang} 
                              onClick={() => setSelectedLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])}
                              className={cn("px-4 py-2 border rounded-xl cursor-pointer font-bold text-[14px] transition-all shadow-sm", selectedLanguages.includes(lang) ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white text-black hover:border-zinc-300")}
                            >
                              {lang}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="lg:col-span-3 flex items-center space-x-3 p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                        <Checkbox id="showOnHomepage" name="showOnHomepage" defaultChecked={editingItem?.showOnHomepage !== false} />
                        <Label htmlFor="showOnHomepage" className="text-[14px] font-black tracking-widest cursor-pointer text-black">Promote on institutional homepage scroller</Label>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Pricing & Full Package Specs */}
                  <div className="space-y-10">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner"><CreditCard className="w-5 h-5" /></div>
                      <h3 className="text-lg font-black tracking-tight">2. Pricing & Full Package Specifications</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Original price (INR)</Label>
                        <Input 
                          name="originalPrice" 
                          type="number" 
                          value={origPrice} 
                          onChange={(e) => setOrigPrice(e.target.value)} 
                          placeholder="5000" 
                          className="h-12 rounded-xl border-zinc-200 font-bold text-[15px]" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                          <Label className="text-[13px] font-bold text-black tracking-widest">Selling price (INR) *</Label>
                          {discountPercent > 0 && <span className="text-[10px] font-black text-orange-500">{discountPercent}% OFF</span>}
                        </div>
                        <Input 
                          name="sellingPrice" 
                          type="number" 
                          value={sellPrice} 
                          onChange={(e) => setSellPrice(e.target.value)} 
                          required 
                          placeholder="2999" 
                          className="h-12 rounded-xl border-zinc-200 font-black text-emerald-600 text-[15px]" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Duration (Months)</Label>
                        <Input name="duration" type="number" defaultValue={editingItem?.duration} className="h-12 rounded-xl border-zinc-200 font-bold text-[15px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Total academic hours *</Label>
                        <Input name="hours" type="number" defaultValue={editingItem?.hours} required placeholder="120" className="h-12 rounded-xl border-zinc-200 font-bold text-[15px]" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Video lectures count</Label>
                        <div className="relative">
                          <Video className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-300" />
                          <Input name="totalVideos" type="number" defaultValue={editingItem?.totalVideos || editingItem?.totalChapters || "0"} className="pl-10 h-12 rounded-xl border-zinc-200 font-bold text-[15px]" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Learning mode</Label>
                        <Select name="courseMode" defaultValue={editingItem?.courseMode || "Self-Paced"}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Self-Paced" className="font-bold">Self-Paced</SelectItem>
                            <SelectItem value="Live Online" className="font-bold">Live Online</SelectItem>
                            <SelectItem value="Physical Batch" className="font-bold">Physical Batch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">PDF Resources</Label>
                        <Select name="pdfResources" defaultValue={editingItem?.pdfResources || "Yes"}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes" className="font-bold">Yes, Provided</SelectItem>
                            <SelectItem value="No" className="font-bold">No PDF Resources</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Device Access</Label>
                        <Select name="deviceAccess" defaultValue={editingItem?.deviceAccess || "Yes"}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes" className="font-bold">Mobile & Desktop</SelectItem>
                            <SelectItem value="No" className="font-bold">Desktop Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Digital Credential</Label>
                        <Select name="digitalCredential" defaultValue={editingItem?.digitalCredential || editingItem?.provideCertificate || "Yes"}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes" className="font-bold">Official Credential</SelectItem>
                            <SelectItem value="No" className="font-bold">No Certification</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Payment mode</Label>
                        <Select name="paymentMode" defaultValue={editingItem?.paymentMode || "Full Payment"}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full Payment" className="font-bold">Full Payment</SelectItem>
                            <SelectItem value="Installments" className="font-bold">Installments Available</SelectItem>
                            <SelectItem value="Subscription" className="font-bold">Subscription</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Learning Outcomes */}
                  <div className="space-y-10">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner"><Target className="w-5 h-5" /></div>
                      <h3 className="text-lg font-black tracking-tight">3. Learning Outcomes</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Section heading</Label>
                        <Input name="outcomeHeading" defaultValue={editingItem?.outcomeHeading || "What you'll achieve"} className="h-12 rounded-xl border-zinc-200 font-black text-primary text-[15px]" />
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Outcome items</Label>
                        <div className="flex gap-3">
                          <Input value={newOutcome} onChange={e => setNewOutcome(e.target.value)} placeholder="e.g. Master React Hooks Architecture" className="h-12 rounded-xl bg-zinc-50 border-none font-bold" />
                          <button type="button" onClick={handleAddOutcome} className="bg-primary text-white rounded-xl h-12 px-8 border-none cursor-pointer flex items-center justify-center transition-all active:scale-95 shadow-lg"><PlusCircle className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {outcomes.map((point, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group transition-all hover:bg-white hover:shadow-md">
                              <span className="text-[13px] font-bold text-black flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {point}</span>
                              <button type="button" onClick={() => handleRemoveOutcome(i)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"><X className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Syllabus */}
                  <div className="space-y-10">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner"><Layers className="w-5 h-5" /></div>
                        <h3 className="text-lg font-black tracking-tight">4. Detailed Syllabus</h3>
                      </div>
                      <Button type="button" onClick={handleAddSyllabus} variant="outline" className="h-9 px-6 rounded-xl border-purple-100 text-purple-600 font-black text-[10px] tracking-widest gap-2">
                        <Plus className="w-3.5 h-3.5" /> Add chapter
                      </Button>
                    </div>
                    <div className="space-y-8">
                      {syllabusChapters.map((s, i) => (
                        <div key={s.id} className="p-8 bg-zinc-50 rounded-[32px] border border-zinc-100 relative group/syl transition-all hover:bg-white hover:shadow-xl">
                          <button type="button" onClick={() => handleRemoveSyllabus(s.id)} className="absolute top-6 right-6 text-rose-500 opacity-0 group-hover/syl:opacity-100 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"><MinusCircle className="w-5 h-5" /></button>
                          <div className="space-y-6">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-black text-black tracking-[0.2em] ml-1">Chapter {i + 1} Title</Label>
                              <Input value={s.title} onChange={e => handleUpdateSyllabus(s.id, 'title', e.target.value)} className="h-12 rounded-xl bg-white border-zinc-200 font-bold" placeholder="e.g. Introduction to Neural Networks" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-black text-black tracking-[0.2em] ml-1">Detailed Content</Label>
                              <Textarea value={s.content} onChange={e => handleUpdateSyllabus(s.id, 'content', e.target.value)} className="rounded-xl bg-white border-zinc-200 min-h-[120px] font-medium" placeholder="Breakdown the specific topics covered in this chapter..." />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 4.5: Video Lessons */}
                  <div className="space-y-10">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner"><Video className="w-5 h-5" /></div>
                        <h3 className="text-lg font-black tracking-tight">5. Video Lessons Curriculum</h3>
                      </div>
                      <Button type="button" onClick={handleAddLesson} variant="outline" className="h-9 px-6 rounded-xl border-indigo-100 text-indigo-600 font-black text-[10px] tracking-widest gap-2">
                        <Plus className="w-3.5 h-3.5" /> Add Video
                      </Button>
                    </div>
                    <div className="space-y-8">
                      {lessons.map((l, i) => (
                        <div key={l.id} className="p-8 bg-zinc-50 rounded-[32px] border border-zinc-100 relative group/les transition-all hover:bg-white hover:shadow-xl">
                          <button type="button" onClick={() => handleRemoveLesson(l.id)} className="absolute top-6 right-6 text-rose-500 opacity-0 group-hover/les:opacity-100 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"><MinusCircle className="w-5 h-5" /></button>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5 md:col-span-2">
                              <Label className="text-[11px] font-black text-black tracking-[0.2em] ml-1">Lesson {i + 1} Title</Label>
                              <Input value={l.title} onChange={e => handleUpdateLesson(l.id, 'title', e.target.value)} className="h-12 rounded-xl bg-white border-zinc-200 font-bold" placeholder="e.g. Getting Started with the Environment" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-black text-black tracking-[0.2em] ml-1">Video Duration</Label>
                              <Input value={l.duration} onChange={e => handleUpdateLesson(l.id, 'duration', e.target.value)} className="h-12 rounded-xl bg-white border-zinc-200 font-bold" placeholder="e.g. 15m 30s" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-black text-black tracking-[0.2em] ml-1">Video URL / Link</Label>
                              <Input value={l.videoUrl} onChange={e => handleUpdateLesson(l.id, 'videoUrl', e.target.value)} className="h-12 rounded-xl bg-white border-zinc-200 font-bold" placeholder="e.g. https://youtu.be/..." />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 5: FAQ */}
                  <div className="space-y-10">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner"><MessageSquare className="w-5 h-5" /></div>
                        <h3 className="text-lg font-black tracking-tight">5. Common Questions (FAQ)</h3>
                      </div>
                      <Button type="button" onClick={handleAddFaq} variant="outline" className="h-9 px-6 rounded-xl border-rose-100 text-rose-600 font-black text-[10px] tracking-widest gap-2">
                        <Plus className="w-3.5 h-3.5" /> Add FAQ
                      </Button>
                    </div>
                    <div className="space-y-8">
                      {faqs.map((f, i) => (
                        <div key={f.id} className="p-8 bg-zinc-50 rounded-[32px] border border-zinc-100 relative group/faq transition-all hover:bg-white hover:shadow-xl">
                          <button type="button" onClick={() => handleRemoveFaq(f.id)} className="absolute top-6 right-6 text-rose-500 opacity-0 group-hover/faq:opacity-100 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"><MinusCircle className="w-5 h-5" /></button>
                          <div className="space-y-6">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-black text-black tracking-[0.2em] ml-1">Question {i + 1}</Label>
                              <Input value={f.q} onChange={e => handleUpdateFaq(f.id, 'q', e.target.value)} className="h-12 rounded-xl bg-white border-zinc-200 font-bold" placeholder="e.g. Is any prior coding knowledge required?" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-black text-black tracking-[0.2em] ml-1">Official Response</Label>
                              <Textarea value={f.a} onChange={e => handleUpdateFaq(f.id, 'a', e.target.value)} className="rounded-xl bg-white border-zinc-200 min-h-[100px] font-medium" placeholder="Provide a detailed answer for the candidate..." />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-10 border-t border-zinc-100">
                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-primary hover:opacity-90 text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl shadow-teal-900/40 border-none active:scale-95 transition-all">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />} 
                      {editingItem ? 'Synchronize All Updates' : 'Publish Academic Program'}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogContent className="w-[95vw] sm:max-w-md rounded-[32px] p-0 bg-white border-none shadow-2xl max-h-[95vh] flex flex-col">
              <div className="overflow-y-auto flex-1 w-full p-6 md:p-10 scrollbar-thin scrollbar-thumb-zinc-200 text-black">
              <div className="flex items-center justify-between mb-8"><DialogTitle className="text-xl font-black tracking-tight">Manage {activeManageField?.label}</DialogTitle></div>
              <div className="flex gap-2 mb-8"><Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="Enter new entry..." className="rounded-xl h-12" /><Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none shadow-lg">Add</Button></div>
              <ScrollArea className="h-64 pr-4">
                <div className="space-y-2">
                  {(dropdownData[activeManageField?.key || ''] || []).map(opt => (
                    <div key={opt.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all">
                      <span className="text-[14px] font-normal text-black">{opt.value}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="text-blue-500 h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${id}/dropdowns/${activeManageField!.key}/${opt.id}`))} className="text-rose-500 h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

function FormSelect({ label, name, options, onManage, defaultValue, required = false }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <Label className="text-[13px] font-bold text-black tracking-widest">{label} {required && "*"}</Label>
        <button type="button" onClick={onManage} className="text-[11px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
      </div>
      <Select name={name} defaultValue={defaultValue} required={required}>
        <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black focus:ring-primary transition-none bg-white text-[15px]"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent className="rounded-xl border-zinc-100 shadow-xl">{options.map((opt: any) => (<SelectItem key={opt.id} value={opt.value} className="rounded-lg text-[15px] font-bold">{opt.value}</SelectItem>))}</SelectContent>
      </Select>
    </div>
  )
}
