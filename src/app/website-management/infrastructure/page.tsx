
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Building2, 
  Save, 
  Loader2,
  X,
  ImageIcon,
  Layout,
  Monitor,
  PenTool,
  Info,
  MapPin,
  Trophy,
  UserPlus,
  Award,
  BookOpen,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
  Settings2,
  ExternalLink,
  Eye
} from "lucide-react"
import Link from "next/link"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, update, remove, off, set } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/ImageUpload"

const ICON_OPTIONS = [
  { id: 'UserPlus', label: 'User/Admission', icon: UserPlus },
  { id: 'Award', label: 'Award/Orientation', icon: Award },
  { id: 'BookOpen', label: 'Book/Learning', icon: BookOpen },
  { id: 'Monitor', label: 'Monitor/Labs', icon: Monitor },
  { id: 'Briefcase', label: 'Briefcase/Internship', icon: Briefcase },
  { id: 'Trophy', label: 'Trophy/Placement', icon: Trophy },
  { id: 'Star', label: 'Star/Excellence', icon: PenTool },
  { id: 'TrendingUp', label: 'Growth', icon: TrendingUp },
]

export default function InfrastructureManagementPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [activeTab, setActiveTab] = useState("facilities")
  const [items, setItems] = useState<any[]>([])
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [facilityImage, setFacilityImage] = useState("")
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Page Level Settings
  const [heroSettings, setHeroSettings] = useState({
    title: "Campus lifecycle & modern infrastructure",
    description: "Experience a Smart Learning Environment Designed for Excellence. Our campus is a comprehensive ecosystem that supports modern education through digital labs, collaborative spaces, and career-focused infrastructure.",
    buttonText: "Explore facilities",
    buttonLink: "/facilities",
    backgroundImage: ""
  })

  useEffect(() => {
    if (!database || !user?.uid) return
    const rootPath = `Institutes/${user.uid}/website_settings/infrastructure`
    
    // Fetch Hero Settings
    onValue(ref(database, `${rootPath}/hero`), (snapshot) => {
      if (snapshot.exists()) setHeroSettings(snapshot.val())
    })

    // Fetch Facilities Items
    const itemsRef = ref(database, `${rootPath}/items`)
    onValue(itemsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setItems([])
      }
      setIsLoading(false)
    })
  }, [database, user?.uid])

  const filtered = useMemo(() => {
    return items.filter((item: any) => item.title?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [items, searchTerm])

  const handleUpdateHero = async () => {
    if (!user || !database) return
    setIsSubmitting(true)
    try {
      await set(ref(database, `Institutes/${user.uid}/website_settings/infrastructure/hero`), heroSettings)
      toast({ title: "Hero section updated", description: "Header content is now live." })
    } catch (e) {
      toast({ variant: "destructive", title: "Update failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database || isSubmitting) return
    
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      image: formData.get("image") as string,
      updatedAt: Date.now()
    }

    try {
      const dbPath = `Institutes/${user.uid}/website_settings/infrastructure/items`
      if (editingItem) {
        await update(ref(database, `${dbPath}/${editingItem.id}`), data)
      } else {
        await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
      }
      setIsModalOpen(false)
      setEditingItem(null)
      toast({ title: "Facility saved" })
    } catch (err) {
      toast({ variant: "destructive", title: "Sync failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!database || !user) return
    if (confirm("Permanently remove this facility?")) {
      await remove(ref(database, `Institutes/${user.uid}/website_settings/infrastructure/items/${id}`))
      toast({ title: "Facility removed" })
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Synchronizing facilities...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-32 font-public-sans text-[15px] font-bold text-black">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Facility page setup</h2>
              <p className="text-[14px] text-black font-medium mt-1">Design the appearance and content of your facility page</p>
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
              <Button onClick={handleUpdateHero} disabled={isSubmitting} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="h-4 w-4" />} Publish changes
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white p-1.5 rounded-2xl h-14 shadow-sm border border-zinc-100 mb-8 inline-flex items-center">
              <TabsTrigger value="facilities" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Facilities registry</TabsTrigger>
              <TabsTrigger value="hero" className="rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Header settings</TabsTrigger>
            </TabsList>

            <TabsContent value="facilities" className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between px-2">
                <div className="relative group w-full md:w-80">
                  <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                  <Input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search registered facilities..." 
                    className="pl-12 h-12 rounded-xl border-zinc-100 bg-zinc-50/50 shadow-inner font-bold text-black focus-visible:ring-1 focus-visible:ring-black text-[15px]" 
                  />
                  </div>
                <Button onClick={() => { setEditingItem(null); setFacilityImage(""); setIsModalOpen(true); }} className="bg-zinc-900 hover:bg-black text-white rounded-xl h-11 px-8 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all tracking-widest">
                  <Plus className="h-4 w-4" /> Add facility
                </Button>
              </div>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-zinc-100 hover:bg-transparent">
                        <TableHead className="text-[15px] font-bold text-black tracking-widest h-14 pl-10 w-20">SR NO.</TableHead>
                        <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">FACILITY DESCRIPTION</TableHead>
                        <TableHead className="text-right pr-10 text-[15px] font-bold text-black tracking-widest h-14">OPERATIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((item: any, idx: number) => (
                        <TableRow key={item.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                          <TableCell className="text-[15px] font-bold text-black pl-10">{idx + 1}</TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-inner border border-zinc-50 shrink-0">
                                <img src={item.image || `https://picsum.photos/seed/${item.id}/200/200`} className="w-full h-full object-cover" alt="Facility" />
                              </div>
                              <div className="flex flex-col gap-0.5 max-w-md">
                                <span className="text-[15px] font-bold text-black tracking-tight">{item.title}</span>
                                <p className="text-[15px] text-black font-bold line-clamp-2">{item.description}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setFacilityImage(item.image || ""); setIsModalOpen(true); }} className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="h-3.5 w-3.5" /></Button>
                              <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-zinc-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all border-none bg-transparent cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>


            <TabsContent value="hero" className="mt-0">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10 space-y-10">
                <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary shadow-inner">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-normal text-black font-public-sans">Hero section settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Main headline</Label>
                      <Input 
                        value={heroSettings.title} 
                        onChange={(e) => setHeroSettings({...heroSettings, title: e.target.value})}
                        className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Hero description</Label>
                      <Textarea 
                        value={heroSettings.description} 
                        onChange={(e) => setHeroSettings({...heroSettings, description: e.target.value})}
                        className="rounded-xl border-zinc-200 font-bold min-h-[120px] text-black leading-relaxed text-[15px]" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Button text</Label>
                      <Input 
                        value={heroSettings.buttonText} 
                        onChange={(e) => setHeroSettings({...heroSettings, buttonText: e.target.value})}
                        placeholder="Explore facilities"
                        className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Button Redirect Link</Label>
                      <div className="relative group">
                        <ExternalLink className="absolute left-4 top-4 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                        <Input 
                          value={heroSettings.buttonLink} 
                          onChange={(e) => setHeroSettings({...heroSettings, buttonLink: e.target.value})}
                          placeholder="/facilities"
                          className="pl-12 h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Background Image</Label>
                      <ImageUpload 
                        value={heroSettings.backgroundImage || ""} 
                        onChange={(v) => setHeroSettings({...heroSettings, backgroundImage: v})} 
                      />
                    </div>
                  </div>

                  <div className="bg-zinc-50 rounded-3xl p-8 border border-zinc-100 flex flex-col justify-center space-y-6">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      <span className="text-[15px] font-bold text-black tracking-widest">Layout preview</span>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-2xl font-normal text-black leading-none font-public-sans">{heroSettings.title}</h4>
                      <p className="text-[15px] text-black font-bold leading-relaxed italic line-clamp-3">"{heroSettings.description}"</p>
                      <Button variant="outline" className="h-10 px-6 rounded-xl border-zinc-900 text-black font-black text-[11px] tracking-widest pointer-events-none">
                        {heroSettings.buttonText}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* FACILITY MODAL */}
          <Dialog open={isModalOpen} onOpenChange={(o) => { setIsModalOpen(o); if(!o) setEditingItem(null); }}>
            <DialogContent className="w-[95vw] sm:max-w-xl p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
              <div className="overflow-y-auto flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200">
                <div className="bg-white px-6 md:px-10 py-6 border-b border-zinc-100 flex items-center justify-between">
                  <DialogTitle className="text-xl font-black tracking-tight">{editingItem ? 'Refine facility' : 'New infrastructure'}</DialogTitle>
                </div>
                <form onSubmit={handleSaveItem} className="p-10 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Facility name</Label>
                      <Input name="title" defaultValue={editingItem?.title} required placeholder="e.g. Advanced Robotics Lab" className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Facility Image</Label>
                      <ImageUpload value={facilityImage} onChange={setFacilityImage} />
                      <input type="hidden" name="image" value={facilityImage} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Short description</Label>
                      <Textarea name="description" defaultValue={editingItem?.description} className="rounded-xl border-zinc-200 min-h-[100px] text-black font-bold text-[15px]" required />
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-primary hover:opacity-90 text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none active:scale-95 transition-all">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save facility
                  </Button>
                </form>
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
        <Label className="text-[15px] font-bold text-black tracking-widest">{label} {required && "*"}</Label>
        <button type="button" onClick={onManage} className="text-[11px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
      </div>
      <Select name={name} defaultValue={defaultValue} required={required}>
        <SelectTrigger className="h-11 rounded-xl border-zinc-200 font-bold text-black focus:ring-primary transition-none bg-white text-[15px]"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent className="rounded-xl border-zinc-100 shadow-xl">{options.map((opt: any) => (<SelectItem key={opt.id} value={opt.value} className="rounded-lg text-[15px] font-bold">{opt.value}</SelectItem>))}</SelectContent>
      </Select>
    </div>
  )
}
