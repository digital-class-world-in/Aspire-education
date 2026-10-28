
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  FileText, 
  PenTool, 
  X, 
  Globe, 
  Loader2,
  TrendingUp,
  History,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  Clock,
  Target,
  ShieldCheck,
  Newspaper,
  Layout,
  Type,
  PlusCircle,
  MinusCircle,
  Link as LinkIcon,
  Eye
} from "lucide-react"
import Link from "next/link"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ImageUpload } from "@/components/ImageUpload"

interface BlogSection {
  title: string;
  image: string;
  content: string;
}

export default function BlogSeoManagementPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const pathname = usePathname()
  const { resolvedId, isLoading: idLoading } = useResolvedId()

  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')
  const id = resolvedId || user?.uid || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"
  
  const [blogs, setBlogs] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [heroImage, setHeroImage] = useState("")

  // Dynamic Sections State
  const [sections, setSections] = useState<BlogSection[]>([
    { title: "", image: "", content: "" }
  ])

  useEffect(() => {
    if (!database || !id) return
    const dbRef = ref(database, `Institutes/${id}/website_blogs`)
    
    const unsub = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setBlogs(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setBlogs([])
      }
      setIsLoading(false)
    })
    return () => unsub()
  }, [database, user?.uid])

  const filtered = useMemo(() => {
    return blogs.filter(b => b.title?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [blogs, searchTerm])

  const handleAddSection = () => {
    setSections([...sections, { title: "", image: "", content: "" }])
  }

  const handleRemoveSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index))
    }
  }

  const handleUpdateSection = (index: number, field: keyof BlogSection, value: string) => {
    const updated = [...sections]
    updated[index][field] = value
    setSections(updated)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database || isSubmitting) return
    
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const blogData = {
      title: formData.get("title") as string,
      slug: (formData.get("slug") as string || (formData.get("title") as string).toLowerCase().replace(/ /g, '-')),
      category: formData.get("category") as string,
      author: formData.get("author") as string,
      readTime: formData.get("readTime") as string,
      image: formData.get("image") as string,
      description: formData.get("description") as string,
      intro: formData.get("intro") as string,
      sections: sections,
      conclusion: formData.get("conclusion") as string,
      metaTitle: formData.get("metaTitle") as string,
      metaDescription: formData.get("metaDescription") as string,
      date: editingItem?.date || format(new Date(), "MMM dd, yyyy"),
      updatedAt: Date.now()
    }

    try {
      const dbPath = `Institutes/${id}/website_blogs`
      if (editingItem) {
        await update(ref(database, `${dbPath}/${editingItem.id}`), blogData)
      } else {
        await push(ref(database, dbPath), { ...blogData, createdAt: Date.now() })
      }
      setIsModalOpen(false)
      setEditingItem(null)
      toast({ title: "Blog Published", description: "Article successfully synchronized." })
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditor = (blog: any = null) => {
    if (blog) {
      setEditingItem(blog)
      // Migration logic: if they have old section1/2/3, convert them to the array
      if (blog.sections) {
        setSections(blog.sections)
      } else {
        const migrated = []
        if (blog.section1Title || blog.section1Content) migrated.push({ title: blog.section1Title || "", image: blog.section1Image || "", content: blog.section1Content || "" })
        if (blog.section2Title || blog.section2Content) migrated.push({ title: blog.section2Title || "", image: blog.section2Image || "", content: blog.section2Content || "" })
        if (blog.section3Title || blog.section3Content) migrated.push({ title: blog.section3Title || "", image: blog.section3Image || "", content: blog.section3Content || "" })
        setSections(migrated.length > 0 ? migrated : [{ title: "", image: "", content: "" }])
      }
      setHeroImage(blog.image || "")
    } else {
      setEditingItem(null)
      setHeroImage("")
      setSections([{ title: "", image: "", content: "" }])
    }
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!database || !user) return
    if (confirm("Permanently delete this article?")) {
      await remove(ref(database, `Institutes/${id}/website_blogs/${id}`))
      toast({ title: "Article removed" })
    }
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
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Blog & SEO Studio</h2>
              <p className="text-[14px] text-black font-medium mt-1">Publish structured articles and optimize for global search</p>
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
              <Button onClick={() => openEditor()} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all">
                <PenTool className="h-4 w-4" /> Compose News
              </Button>
            </div>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-6">
            <div className="relative group max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across articles..." 
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
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">ARTICLE INFO</TableHead>
                    <TableHead className="text-[15px] font-bold text-black tracking-widest h-14">SECTIONS</TableHead>
                    <TableHead className="text-right pr-10 text-[15px] font-bold text-black tracking-widest h-14">OPERATIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, idx) => (
                    <TableRow key={item.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                      <TableCell className="text-[15px] font-bold text-black pl-10">{idx + 1}</TableCell>
                      <TableCell className="py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner border border-zinc-50">
                            <img src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} className="w-full h-full object-cover" alt="Blog" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[15px] font-bold text-black tracking-tight line-clamp-1">{item.title}</span>
                            <span className="text-[11px] font-bold text-primary flex items-center gap-1.5"><Globe className="w-3 h-3" /> /{item.slug}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg px-3 py-1 font-bold text-[11px] border-zinc-100">
                          {item.sections?.length || 0} Dynamic Sections
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditor(item)} className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="h-3.5 w-3.5" /></Button>
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
            <DialogContent className="w-[95vw] sm:max-w-5xl p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
              <div className="bg-white px-6 md:px-10 py-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 z-50">
                <DialogTitle className="text-xl font-black tracking-tight">
                  {editingItem ? 'Refine Article' : 'New Publication'}
                </DialogTitle>
              </div>
              <ScrollArea className="flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200 text-black">
                <form onSubmit={handleSave} className="p-10 space-y-12">
                  {/* General Details */}
                  <div className="space-y-8">
                    <h3 className="text-[14px] font-normal text-primary font-public-sans border-b border-zinc-50 pb-2">1. Identity & Excerpt</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Title</Label>
                        <Input name="title" defaultValue={editingItem?.title} required className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[15px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Category</Label>
                        <Input name="category" defaultValue={editingItem?.category} placeholder="Career / Technology" required className="h-12 rounded-xl text-[15px] font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Author Name</Label>
                        <Input name="author" defaultValue={editingItem?.author} placeholder="Academic Board" className="h-12 rounded-xl text-[15px] font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Read Time</Label>
                        <Input name="readTime" defaultValue={editingItem?.readTime} placeholder="5 min" className="h-12 rounded-xl text-[15px] font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Hero Image</Label>
                        <ImageUpload value={heroImage} onChange={setHeroImage} />
                        <input type="hidden" name="image" value={heroImage} />
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Short Excerpt (Grid Preview)</Label>
                        <Textarea name="description" defaultValue={editingItem?.description} className="rounded-xl border-zinc-200 min-h-[80px] font-bold text-[15px]" required />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Sections */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                      <h3 className="text-[14px] font-normal text-indigo-600 font-public-sans">2. Article Content Structure</h3>
                      <Button type="button" onClick={handleAddSection} variant="outline" className="h-9 px-4 rounded-xl border-indigo-100 text-indigo-600 font-black text-[10px] tracking-widest gap-2">
                        <PlusCircle className="w-3.5 h-3.5" /> Add Content Section
                      </Button>
                    </div>
                    
                    <div className="space-y-10">
                      <div className="space-y-4">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Introduction Paragraph</Label>
                        <Textarea name="intro" defaultValue={editingItem?.intro} className="rounded-xl border-zinc-200 min-h-[100px] font-bold text-[15px]" />
                      </div>

                      <div className="space-y-8">
                        {sections.map((sec, idx) => (
                          <Card key={idx} className="p-8 border-zinc-100 bg-zinc-50/30 rounded-[32px] space-y-6 relative group/section">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-[#1e3a8a] text-white border-none text-[9px] font-black tracking-widest px-3">Section {idx + 1}</Badge>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveSection(idx)} 
                                className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all opacity-0 group-hover/section:opacity-100"
                              >
                                <MinusCircle className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-[11px] font-bold text-black tracking-widest">Section Heading</Label>
                                <Input 
                                  value={sec.title} 
                                  onChange={(e) => handleUpdateSection(idx, 'title', e.target.value)} 
                                  className="h-11 rounded-xl bg-white" 
                                />
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-[11px] font-bold text-black tracking-widest">Section Image</Label>
                                <ImageUpload value={sec.image} onChange={(url) => handleUpdateSection(idx, 'image', url)} />
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <Label className="text-[11px] font-bold text-black tracking-widest">Section Narrative Content</Label>
                                <Textarea 
                                  value={sec.content} 
                                  onChange={(e) => handleUpdateSection(idx, 'content', e.target.value)} 
                                  className="rounded-xl bg-white min-h-[150px]" 
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Conclusion Paragraph</Label>
                        <Textarea name="conclusion" defaultValue={editingItem?.conclusion} className="rounded-xl border-zinc-200 min-h-[100px] font-bold text-[15px]" />
                      </div>
                    </div>
                  </div>

                  {/* SEO Meta */}
                  <div className="space-y-8">
                    <h3 className="text-[14px] font-normal text-[hsl(var(--primary))] font-public-sans border-b border-zinc-50 pb-2">3. Search Optimization (SEO)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Url Slug</Label>
                        <Input name="slug" defaultValue={editingItem?.slug} placeholder="top-career-options" className="h-12 rounded-xl font-public-sans text-[15px] font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Meta Page Title</Label>
                        <Input name="metaTitle" defaultValue={editingItem?.metaTitle} className="h-12 rounded-xl text-[15px] font-bold" />
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Meta Description</Label>
                        <Textarea name="metaDescription" defaultValue={editingItem?.metaDescription} className="rounded-xl border-zinc-200 min-h-[80px] font-bold text-[15px]" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 pb-10">
                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-primary hover:opacity-90 text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl border-none active:scale-95 transition-all">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-3" />} 
                      {editingItem ? 'Update Publication' : 'Publish to Live Site'}
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
