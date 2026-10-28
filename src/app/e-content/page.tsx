
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger, 
  DialogTitle, 
  DialogClose 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Plus, 
  Search, 
  Trash2, 
  FileVideo, 
  FileText, 
  PlusCircle, 
  MinusCircle, 
  Layers, 
  BookOpen, 
  Video,
  X,
  Save,
  Loader2,
  Eye,
  Edit2,
  Settings2
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, push, remove, off, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"

interface Resource {
  id: string
  title: string
  videoUrl: string
  documentUrl: string
  docType: 'pdf' | 'excel' | 'word' | 'url'
}

interface Chapter {
  id: string
  title: string
  topics: Resource[]
}

export default function EContentPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const { database } = useFirebase()
  const { resolvedId, branchId, isBranch, isStaff, staffId } = useResolvedId()

  const [contentItems, setContent] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [viewingModule, setViewingModule] = useState<any>(null)

  const [chapters, setChapters] = useState<Chapter[]>([
    { id: 'c1', title: "", topics: [{ id: 't1', title: "", videoUrl: "", documentUrl: "", docType: "url" }] }
  ])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    onValue(ref(database, `${rootPath}/content`), (s) => {
      const data = s.val()
      if (data) setContent(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      else setContent([])
      setIsLoading(false)
    })

    onValue(ref(database, `${rootPath}/batches`), (s) => {
      const data = s.val() || {}
      setBatches(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })

    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => { 
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value })) 
      })
      setDropdownData(processed)
    })
  }, [database, resolvedId])

  const filteredContent = useMemo(() => {
    return contentItems.filter(item => 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.course?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [contentItems, searchTerm])

  const handleAddChapter = () => {
    setChapters([...chapters, { 
      id: `chap-${Date.now()}`, 
      title: "", 
      topics: [{ id: `top-${Date.now()}`, title: "", videoUrl: "", documentUrl: "", docType: "url" }] 
    }])
  }

  const handleAddTopic = (chapterId: string) => {
    setChapters(chapters.map(c => {
      if (c.id === chapterId) {
        return { ...c, topics: [...c.topics, { id: `top-${Date.now()}`, title: "", videoUrl: "", documentUrl: "", docType: "url" }] }
      }
      return c
    }))
  }

  const handleUpdateChapter = (chapterId: string, title: string) => {
    setChapters(chapters.map(c => c.id === chapterId ? { ...c, title } : c))
  }

  const handleUpdateTopic = (chapterId: string, topicId: string, field: keyof Resource, value: string) => {
    setChapters(chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          topics: c.topics.map(t => t.id === topicId ? { ...t, [field]: value } : t)
        }
      }
      return c
    }))
  }

  const handleRemoveChapter = (id: string) => {
    if (chapters.length > 1) setChapters(chapters.filter(c => c.id !== id))
  }

  const handleRemoveTopic = (chapterId: string, topicId: string) => {
    setChapters(chapters.map(c => {
      if (c.id === chapterId && c.topics.length > 1) {
        return { ...c, topics: c.topics.filter(t => t.id !== topicId) }
      }
      return c
    }))
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const sanitizedChapters = chapters
      .filter(c => c.title.trim() !== "")
      .map(c => ({
        ...c,
        topics: c.topics.filter(t => t.title.trim() !== "")
      }))

    if (sanitizedChapters.length === 0) {
      toast({ variant: "destructive", title: "Incomplete Data", description: "Please add at least one chapter with a title." })
      setIsSubmitting(false)
      return
    }

    const data = {
      title: formData.get("title") as string,
      class: formData.get("class") as string,
      section: formData.get("section") as string,
      batch: formData.get("batch") as string,
      course: formData.get("course") as string,
      chapters: sanitizedChapters,
      branchId: isBranch ? branchId : null,
      createdBy: isStaff ? staffId : 'admin',
      createdAt: Date.now()
    }

    try {
      await push(ref(database, `Institutes/${resolvedId}/content`), data)
      toast({ title: "Module Published", description: "Curriculum successfully saved to registry." })
      setIsModalOpen(false)
      setChapters([{ id: 'c1', title: "", topics: [{ id: 't1', title: "", videoUrl: "", documentUrl: "", docType: "url" }] }])
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    if (!database || !resolvedId) return
    if (confirm("Permanently remove this academic module?")) {
      remove(ref(database, `Institutes/${resolvedId}/content/${id}`))
        .then(() => toast({ title: "Deleted" }))
    }
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black text-[14px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Curriculum Store</h2>
          <p className="text-[14px] text-black font-medium mt-1.5">Manage institutional academic nodes and study materials</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:opacity-90 text-white rounded-xl h-9 px-6 font-black text-[10px] tracking-widest border-none shadow-lg active:scale-95 transition-all">
              <Plus className="h-3.5 w-3.5 mr-2" /> Add Module
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-[60vw] sm:max-w-[55vw] p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl flex flex-col h-[90vh]"
          >
            <div className="bg-[#1e3a8a] px-10 py-8 text-white relative shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <DialogTitle className="text-3xl font-black tracking-tight font-public-sans">Content Builder</DialogTitle>
              <p className="text-blue-200 text-[14px] font-bold tracking-widest mt-1">Institutional Academic Repository Node</p>
              
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 min-h-0 bg-white">
                <div className="p-10 space-y-16 pb-24">
                  <div className="space-y-8">
                    <h3 className="text-[14px] font-black text-[#1e3a8a] tracking-widest border-b border-zinc-100 pb-3">
                      1. Identification & Batch Mapping
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-[14px] font-bold text-black tracking-widest ml-1">
                          Module Title *
                        </Label>
                        <Input 
                          name="title" 
                          required 
                          placeholder="e.g. Modern Physics Complete Course" 
                          className="h-12 rounded-xl border-zinc-200 font-bold text-[14px]" 
                        />
                      </div>
                      <FormSelect label="Class" name="class" options={dropdownData['class'] || []} required />
                      <FormSelect label="Section" name="section" options={dropdownData['section'] || []} />
                      <FormSelect label="Target Batch" name="batch" options={batches.map(b => ({ id: b.id, value: b.batchName }))} required />
                      <FormSelect label="Course Mapping" name="course" options={dropdownData['course'] || []} required />
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <h3 className="text-[14px] font-black text-[#1e3a8a] tracking-widest">
                        2. Chapters & Academic Topics
                      </h3>
                    </div>
                    <div className="space-y-12">
                      {chapters.map((chapter, cIdx) => (
                        <Card key={chapter.id} className="border-2 border-zinc-100 rounded-[32px] overflow-hidden bg-white shadow-sm">
                          <div className="bg-zinc-50 px-8 py-4 border-b border-zinc-100 flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <span className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-black text-[14px]">
                                C{cIdx + 1}
                              </span>
                              <Input 
                                value={chapter.title} 
                                onChange={(e) => handleUpdateChapter(chapter.id, e.target.value)}
                                placeholder="Enter Chapter Title..." 
                                className="bg-transparent border-none font-black tracking-tight text-lg focus-visible:ring-0 p-0 h-auto w-full max-w-md text-[14px]" 
                              />
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveChapter(chapter.id)} 
                              className="text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="p-8 space-y-8">
                            {chapter.topics.map((topic, tIdx) => (
                              <div 
                                key={topic.id} 
                                className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pb-8 border-b border-zinc-50 last:border-0 last:pb-0 relative"
                              >
                                <div className="md:col-span-1 flex flex-col items-center gap-2 pt-2">
                                  <span className="text-[10px] font-black text-zinc-300">T{tIdx+1}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveTopic(chapter.id, topic.id)} 
                                    className="text-rose-300 hover:text-rose-500 transition-colors border-none bg-transparent outline-none cursor-pointer"
                                  >
                                    <MinusCircle className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                <div className="md:col-span-11 grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="md:col-span-2 space-y-1.5">
                                    <Label className="text-[12px] font-bold text-black tracking-widest">
                                      Topic Name *
                                    </Label>
                                    <Input 
                                      value={topic.title} 
                                      onChange={e => handleUpdateTopic(chapter.id, topic.id, 'title', e.target.value)} 
                                      required 
                                      className="h-11 rounded-xl font-bold bg-zinc-50/50 border-zinc-100 text-[14px]" 
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[12px] font-bold text-black tracking-widest">
                                      Video Link (YT)
                                    </Label>
                                    <Input 
                                      value={topic.videoUrl} 
                                      onChange={e => handleUpdateTopic(chapter.id, topic.id, 'videoUrl', e.target.value)} 
                                      placeholder="YouTube URL" 
                                      className="h-11 rounded-xl bg-zinc-50/50 border-zinc-100 text-[14px] font-bold" 
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[12px] font-bold text-black tracking-widest">
                                      Document Link
                                    </Label>
                                    <Input 
                                      value={topic.documentUrl} 
                                      onChange={e => handleUpdateTopic(chapter.id, topic.id, 'documentUrl', e.target.value)} 
                                      placeholder="PDF/Excel URL" 
                                      className="h-11 rounded-xl bg-zinc-50/50 border-zinc-100 text-[14px] font-bold" 
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => handleAddTopic(chapter.id)} 
                              className="w-full h-9 border-dashed border-2 border-zinc-200 rounded-2xl text-primary font-black text-[9px] tracking-widest gap-2 hover:bg-zinc-50"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Add Topic Node
                            </Button>
                          </div>
                        </Card>
                      ))}
                      <Button 
                        type="button" 
                        onClick={handleAddChapter} 
                        className="w-full h-10 bg-zinc-900 hover:bg-black text-white rounded-[24px] font-black text-[10px] tracking-[0.2em] shadow-xl border-none"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Initialize New Chapter Node
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-8 border-t border-zinc-100 bg-white flex justify-end shrink-0">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="h-10 px-10 bg-primary hover:opacity-90 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl border-none active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-3" /> 
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-3" /> 
                      Publish Academic Module
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <div className="relative w-full md:w-96 group px-2">
          <Search className="absolute left-6 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search Modules..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-white border-zinc-100 rounded-full text-[14px] font-bold shadow-sm transition-none focus-visible:ring-primary"
          />
        </div>

        <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="border-zinc-100 hover:bg-transparent">
                  <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-10 w-20">SR NO.</TableHead>
                  <TableHead className="text-[11px] font-black text-black tracking-widest h-14">MODULE TITLE</TableHead>
                  <TableHead className="text-[11px] font-black text-black tracking-widest h-14">BATCH / CLASS</TableHead>
                  <TableHead className="text-[11px] font-black text-black tracking-widest text-center">CHAPTERS</TableHead>
                  <TableHead className="text-right pr-10 text-[11px] font-black text-black tracking-widest h-14">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContent.map((item, idx) => (
                  <TableRow key={item.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group text-black">
                    <TableCell className="pl-10 font-bold text-black">{(idx + 1)}</TableCell>
                    <TableCell className="py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-primary shadow-inner">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="text-[15px] font-bold text-black tracking-tight">{item.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-black">{item.batch}</span>
                        <span className="text-[10px] font-bold text-black tracking-widest">{item.course} • Section {item.section || 'A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-black text-black">{item.chapters?.length || 0}</TableCell>
                    <TableCell className="text-right pr-10">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setViewingModule(item)} className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Dialog open={!!viewingModule} onOpenChange={() => setViewingModule(null)}>
        <DialogContent className="max-w-[60vw] sm:max-w-[95vw] p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl flex flex-col h-[85vh]">
          {viewingModule && (
            <>
              <div className="bg-[#1e3a8a] p-10 text-white relative shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <DialogTitle className="text-2xl font-black tracking-tight">{viewingModule.title}</DialogTitle>
                <p className="text-blue-200 text-[14px] font-bold tracking-widest mt-1">Syllabus Overview • {viewingModule.batch}</p>
                
              </div>
              <ScrollArea className="flex-1 bg-white">
                <div className="p-10 space-y-8">
                  {viewingModule.chapters?.map((chapter: any, cIdx: number) => (
                    <div key={chapter.id} className="space-y-4">
                      <h4 className="text-[14px] font-black text-black tracking-widest flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center text-[10px]">C{cIdx + 1}</span>
                        {chapter.title}
                      </h4>
                      <div className="pl-9 space-y-2">
                        {chapter.topics?.map((topic: any, tIdx: number) => (
                          <div key={topic.id} className="p-4 bg-zinc-50 rounded-2xl flex items-center justify-between border border-zinc-100 group hover:bg-white hover:shadow-lg transition-all">
                            <span className="text-[14px] font-bold text-black">{topic.title}</span>
                            <div className="flex gap-2">
                              {topic.videoUrl && (
                                <Button onClick={() => window.open(topic.videoUrl, '_blank')} size="icon" variant="ghost" className="h-6 w-6 text-blue-500">
                                  <Video className="h-4 w-4" />
                                </Button>
                              )}
                              {topic.documentUrl && (
                                <Button onClick={() => window.open(topic.documentUrl, '_blank')} size="icon" variant="ghost" className="h-6 w-6 text-emerald-500">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function FormSelect({ label, name, options, required = false }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-bold text-black tracking-widest ml-1">
        {label} {required && "*"}
      </Label>
      <Select name={name} required={required}>
        <SelectTrigger className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 font-bold text-black text-[14px] focus:ring-1">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
          {options.map((opt: any) => (
            <SelectItem key={opt.id} value={opt.value} className="font-bold text-[14px]">
              {opt.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
