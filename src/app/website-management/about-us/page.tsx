
"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Globe,
  Monitor,
  Zap,
  BookOpen,
  Clock,
  Star,
  Users,
  Award,
  GraduationCap,
  Loader2,
  Save,
  FileText,
  Target,
  Plus,
  ImageIcon,
  Info,
  X,
  Eye
} from "lucide-react"
import Link from "next/link"
import { ImageUpload } from "@/components/ImageUpload"
import { useFirebase, useUser } from "@/firebase"
import { ref, get, set, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AboutUsManagementPage() {
  const { database, storage } = useFirebase()
  const { user } = useUser()
  const pathname = usePathname()
  const { resolvedId, isLoading: idLoading } = useResolvedId()

  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')
  const id = resolvedId || user?.uid || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newMissionPoint, setNewMissionValue] = useState("")

  const [about, setAbout] = useState<any>({
    badge: "Institutional Overview",
    title: "Pioneering Academic Excellence",
    description1: "",
    description2: "",
    vision: "",
    mission: "",
    whyChooseUs: [
      { title: "Years of Excellence", description: "25+ years of academic quality.", icon: "Award" },
      { title: "Expert Faculty", description: "Qualified teachers focused on student success.", icon: "Users" },
      { title: "Smart Learning", description: "Digital classroom infrastructure.", icon: "Monitor" },
      { title: "Global Recognition", description: "Industry partnerships and recognized degrees.", icon: "Globe" }
    ],
    imageUrl: "https://images.unsplash.com/photo-1523050853064-8521a3930ff4?q=80&w=2070&auto=format&fit=crop",
    directorMessages: [
      { name: "", designation: "Managing Director", message: "", imageUrl: "" },
      { name: "", designation: "Executive Director", message: "", imageUrl: "" }
    ]
  })

  useEffect(() => {
    if (!database || !id) return
    const rootPath = `Institutes/${id}/website_settings/about`

    get(ref(database, rootPath)).then((snapshot) => {
      const data = snapshot.val()
      if (data) {
        setAbout((prev: any) => ({ 
          ...prev, 
          ...data,
          badge: data.badge !== undefined ? data.badge : "",
          title: data.title !== undefined ? data.title : "",
          description1: data.description1 !== undefined ? data.description1 : "",
          description2: data.description2 !== undefined ? data.description2 : "",
          vision: data.vision !== undefined ? data.vision : "",
          mission: data.mission !== undefined ? data.mission : "",
        }))
      }
      setIsLoading(false)
    }).catch(console.error)
  }, [database, user])

  const handleUpdate = (field: string, value: any) => {
    setAbout((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleDirectorUpdate = (index: number, field: string, value: string) => {
    const newItems = [...(about.directorMessages || [{}, {}])]
    if (!newItems[index]) newItems[index] = { name: "", designation: "", message: "", imageUrl: "" }
    newItems[index][field] = value
    handleUpdate('directorMessages', newItems)
  }

  const handleWhyUpdate = (index: number, field: string, value: string) => {
    const newItems = [...(about.whyChooseUs || [])]
    if (!newItems[index]) newItems[index] = { title: "", description: "", icon: "📚" }
    newItems[index][field] = value
    handleUpdate('whyChooseUs', newItems)
  }

  const handleAddWhy = () => {
    const newItems = [...(about.whyChooseUs || []), { title: "New Item", description: "Short description", icon: "Star" }]
    handleUpdate('whyChooseUs', newItems)
  }

  const handleRemoveWhy = (index: number) => {
    const newItems = [...(about.whyChooseUs || [])]
    newItems.splice(index, 1)
    handleUpdate('whyChooseUs', newItems)
  }



  const handleSave = async () => {
    if (!database || !id) return
    setIsSaving(true)
    try {
      await update(ref(database, `Institutes/${id}/website_settings/about`), about)
      toast({ title: "About us synchronized", description: "Public portal updated successfully." })
    } catch (e) {
      toast({ variant: "destructive", title: "Sync failed" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || idLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing node connection...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 w-full overflow-x-hidden", !isPortal && "lg:pl-[300px]")}>
        {!isPortal && <TopNav />}
        <main className={cn("flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full font-public-sans text-[15px] font-bold text-black", !isPortal ? "pb-32" : "pt-4 pb-10")}>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">About us page setup</h2>
              <p className="text-[14px] text-black font-medium mt-1">Configure institutional mission, vision, and core narrative</p>
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
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="h-4 w-4" />} {isSaving ? "Publishing..." : "Publish content"}
              </Button>
            </div>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-10">
                <div className="space-y-6">
                  <h4 className="text-lg font-normal text-black font-public-sans flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <FileText className="w-5 h-5 text-primary" /> Core narrative
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Section badge</Label>
                      <Input value={about.badge} onChange={(e) => handleUpdate('badge', e.target.value)} className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Main heading</Label>
                      <Input value={about.title} onChange={(e) => handleUpdate('title', e.target.value)} className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Paragraph 1 (Primary)</Label>
                      <Textarea value={about.description1} onChange={(e) => handleUpdate('description1', e.target.value)} className="rounded-xl border-zinc-200 min-h-[100px] text-black font-bold text-[15px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Paragraph 2 (Secondary)</Label>
                      <Textarea value={about.description2} onChange={(e) => handleUpdate('description2', e.target.value)} className="rounded-xl border-zinc-200 min-h-[100px] text-black font-bold text-[15px]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-lg font-normal text-black font-public-sans flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <Target className="w-5 h-5 text-primary" /> Vision & Mission
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Vision Statement</Label>
                      <Textarea value={about.vision || ""} onChange={(e) => handleUpdate('vision', e.target.value)} className="rounded-xl border-zinc-200 min-h-[100px] text-black font-bold text-[15px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Mission Statement</Label>
                      <Textarea value={about.mission || ""} onChange={(e) => handleUpdate('mission', e.target.value)} className="rounded-xl border-zinc-200 min-h-[100px] text-black font-bold text-[15px]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                    <h4 className="text-lg font-normal text-black font-public-sans flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" /> Why Choose Us Cards
                    </h4>
                    <Button onClick={handleAddWhy} variant="outline" size="sm" className="h-8 rounded-lg text-[14px] font-bold">
                      <Plus className="w-3 h-3 mr-1" /> Add Card
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {(about.whyChooseUs || []).map((item: any, i: number) => (
                      <div key={i} className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3 relative group">
                        <button onClick={() => handleRemoveWhy(i)} className="absolute top-4 right-4 text-rose-500 hover:bg-rose-100 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-[120px_1fr] gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[14px] font-bold text-black">Icon</Label>
                            <Select value={item.icon || "Award"} onValueChange={(v: string) => handleWhyUpdate(i, 'icon', v)}>
                              <SelectTrigger className="h-11 rounded-xl border-zinc-200 font-bold bg-white text-[14px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Award">Award</SelectItem>
                                <SelectItem value="Users">Users</SelectItem>
                                <SelectItem value="Monitor">Monitor</SelectItem>
                                <SelectItem value="Globe">Globe</SelectItem>
                                <SelectItem value="GraduationCap">Degree</SelectItem>
                                <SelectItem value="Zap">Zap/Fast</SelectItem>
                                <SelectItem value="BookOpen">Learning</SelectItem>
                                <SelectItem value="Clock">Clock/Time</SelectItem>
                                <SelectItem value="Star">Star/Top</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[14px] font-bold text-black">Card Title</Label>
                            <Input value={item.title || ""} onChange={(e) => handleWhyUpdate(i, 'title', e.target.value)} className="h-11 rounded-xl font-bold bg-white text-[14px]" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[14px] font-bold text-black">Card Description</Label>
                          <Textarea value={item.description || ""} onChange={(e) => handleWhyUpdate(i, 'description', e.target.value)} className="rounded-xl bg-white min-h-[60px] font-bold text-[14px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-10">


                <div className="space-y-6">
                  <h4 className="text-lg font-normal text-black font-public-sans flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <ImageIcon className="w-5 h-5 text-primary" /> Visual Assets
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Institute Tagline</Label>
                      <Input value={about.instituteTagline || ""} onChange={(e) => handleUpdate('instituteTagline', e.target.value)} placeholder="Empowering Students Through Quality Education" className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[14px] font-bold text-black ml-1">About Section Image</Label>
                      <ImageUpload
                        value={about.imageUrl}
                        onChange={(url) => handleUpdate('imageUrl', url)}
                        label="Upload About Asset"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-lg font-normal text-black font-public-sans flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <Info className="w-5 h-5 text-primary" /> Learning Section
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Section Title</Label>
                      <Input value={about.learningTitle || ""} onChange={(e) => handleUpdate('learningTitle', e.target.value)} placeholder="Learning Without Limits" className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Description</Label>
                      <Textarea value={about.learningDescription || ""} onChange={(e) => handleUpdate('learningDescription', e.target.value)} placeholder="Describe your flexible learning approach..." className="rounded-xl border-zinc-200 min-h-[100px] text-black font-bold text-[15px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[14px] font-bold text-black ml-1">Learning Section Image</Label>
                      <ImageUpload
                        value={about.learningImage || ""}
                        onChange={(url) => handleUpdate('learningImage', url)}
                        label="Upload Learning Image"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-lg font-normal text-black font-public-sans flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <Users className="w-5 h-5 text-primary" /> Director Messages
                  </h4>
                  <div className="grid grid-cols-1 gap-6">
                    {(about.directorMessages || [{}, {}]).slice(0, 2).map((director: any, i: number) => (
                      <div key={i} className="p-6 bg-zinc-50 rounded-[28px] border border-zinc-100 space-y-5">
                        <div className="flex items-center gap-4 border-b border-zinc-200/50 pb-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                            {i + 1}
                          </div>
                          <h5 className="font-black text-black tracking-tight">Director {i + 1} Profile</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <Label className="text-[14px] font-bold text-black ml-1">Full Name</Label>
                              <Input value={director.name || ""} onChange={(e) => handleDirectorUpdate(i, 'name', e.target.value)} placeholder="e.g. Dr. John Doe" className="h-11 rounded-xl bg-white font-bold" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[14px] font-bold text-black ml-1">Designation</Label>
                              <Input value={director.designation || ""} onChange={(e) => handleDirectorUpdate(i, 'designation', e.target.value)} placeholder="e.g. Managing Director" className="h-11 rounded-xl bg-white font-bold" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[14px] font-bold text-black ml-1">Director Photo</Label>
                             <ImageUpload
                               value={director.imageUrl || ""}
                               onChange={(url) => handleDirectorUpdate(i, 'imageUrl', url)}
                               label={`Photo ${i + 1}`}
                             />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[14px] font-bold text-black ml-1">Institutional Message</Label>
                          <Textarea value={director.message || ""} onChange={(e) => handleDirectorUpdate(i, 'message', e.target.value)} placeholder="Enter the director's inspiring message to students..." className="min-h-[120px] rounded-xl bg-white font-bold text-[14px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
