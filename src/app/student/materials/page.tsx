
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { 
  BookOpen, 
  Search, 
  Download, 
  Eye, 
  FileText, 
  Video, 
  User, 
  Calendar, 
  ChevronRight,
  PlayCircle,
  Clock,
  Layers,
  Info,
  ExternalLink,
  History
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function StudentMaterialsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [contentList, setContent] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    
    // Resolve Student context
    const instRef = ref(database, `Institutes`)
    onValue(instRef, (snap) => {
      const institutes = snap.val() || {}
      let foundStudent = null
      let adminUid = null

      Object.keys(institutes).forEach(id => {
        const adms = institutes[id].admissions || {}
        Object.keys(adms).forEach(aid => {
          if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
            foundStudent = { ...adms[aid], id: aid }
            adminUid = id
          }
        })
      })

      if (foundStudent && adminUid) {
        setStudent(foundStudent)
        const rootPath = `Institutes/${adminUid}/content`
        
        onValue(ref(database, rootPath), (s) => {
          const data = s.val() || {}
          const list = Object.keys(data)
            .map(k => ({ ...data[k], id: k }))
            .filter(item => 
              item.batch === foundStudent.batch && 
              item.class === foundStudent.class && 
              item.course === foundStudent.course
            )
          setContent(list.reverse())
        })
      }
      setIsLoading(false)
    })
  }, [database, user])

  const filteredContent = useMemo(() => {
    if (!searchTerm) return contentList
    const lower = searchTerm.toLowerCase()
    return contentList.filter(item => 
      item.title?.toLowerCase().includes(lower) || 
      item.chapters?.some((c: any) => c.title.toLowerCase().includes(lower))
    )
  }, [contentList, searchTerm])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.3em] animate-pulse">Initializing Knowledge Base...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black text-[14px]">
      
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[28px] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <BookOpen className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">Learning Registry</h2>
              <p className="text-[10px] font-bold text-black tracking-[0.2em]">{student?.batch} • {student?.course} Resources</p>
            </div>
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search chapters or topics..." 
              className="pl-12 h-12 rounded-2xl border-zinc-100 bg-zinc-50 focus:ring-2 focus:ring-emerald-500/20 outline-none text-[14px] font-bold shadow-inner" 
            />
          </div>
        </div>
      </Card>

      <div className="space-y-10">
        {filteredContent.map((module) => (
          <div key={module.id} className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-4 px-2">
              <div className="w-1.5 h-8 bg-primary rounded-full" />
              <div>
                <h3 className="text-xl font-black text-black tracking-tight">{module.title}</h3>
                <div className="flex gap-3 mt-1">
                  <Badge className="bg-zinc-50 text-black border-none text-[8px] font-black px-2">{module.chapters?.length || 0} Chapters</Badge>
                  <Badge className="bg-zinc-50 text-black border-none text-[8px] font-black px-2">Node: {module.id.substring(0,6)}</Badge>
                </div>
              </div>
            </div>

            <Accordion type="single" collapsible className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {(module.chapters || []).map((chapter: any, cIdx: number) => (
                <AccordionItem key={chapter.id} value={chapter.id} className="border-none">
                  <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden transition-all hover:shadow-xl hover:border-primary/20">
                    <AccordionTrigger className="hover:no-underline p-8">
                      <div className="flex items-center gap-6 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-black font-black text-[14px] shadow-inner">
                          {cIdx + 1}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-black tracking-tight leading-tight">{chapter.title}</h4>
                          <p className="text-[10px] font-bold text-black tracking-widest mt-1">{chapter.topics?.length || 0} Academic Topics</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-8 pb-8 pt-0">
                      <div className="space-y-4 pt-4 border-t border-zinc-50">
                        {chapter.topics?.map((topic: any, tIdx: number) => (
                          <div key={topic.id} className="p-5 rounded-2xl bg-zinc-50/50 border border-transparent hover:bg-white hover:border-zinc-100 hover:shadow-lg transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-primary">Topic {tIdx + 1}</span>
                                  <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                                  <span className="text-[14px] font-bold text-black tracking-tight group-hover:text-black transition-colors">{topic.title}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {topic.videoUrl && (
                                  <Button 
                                    onClick={() => window.open(topic.videoUrl, '_blank')}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl h-9 px-4 font-black text-[9px] tracking-widest gap-2 transition-all border-none"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5" /> Watch Video
                                  </Button>
                                )}
                                {topic.documentUrl && (
                                  <Button 
                                    onClick={() => window.open(topic.documentUrl, '_blank')}
                                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl h-9 px-4 font-black text-[9px] tracking-widest gap-2 transition-all border-none"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> Get {topic.docType?.toUpperCase() || 'Doc'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}

        {filteredContent.length === 0 && (
          <div className="py-24 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
            <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mx-auto text-zinc-200 shadow-inner">
              <History className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-black tracking-tight">Repository Empty</h3>
              <p className="text-[14px] text-black max-w-xs mx-auto font-medium tracking-widest leading-relaxed">No study modules have been published for your specific batch and course yet.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
