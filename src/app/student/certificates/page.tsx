"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Award, 
  Download, 
  Eye, 
  Search, 
  History, 
  ShieldCheck, 
  Loader2, 
  X, 
  ZoomIn, 
  ZoomOut,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { toPng } from 'html-to-image'
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import CertificateTemplate from "@/components/certificates/CertificateTemplate"

export default function StudentCertificatesPage() {
  const { database } = useFirebase()
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const [student, setStudent] = useState<any>(null)
  const [awards, setAwards] = useState<any[]>([])
  const [instituteProfile, setInstituteProfile] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  
  const [viewingAward, setViewingAward] = useState<any>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(0.8)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (!database) return
    
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    if (!sessionStr) return

    try {
      const session = JSON.parse(sessionStr)
      const adminUid = session.adminUid
      const studentId = session.studentId

      if (adminUid && studentId) {
        const rootPath = `Institutes/${adminUid}`
        
        onValue(ref(database, `${rootPath}/admissions/${studentId}`), (s) => {
          if (s.exists()) {
            setStudent({ ...s.val(), id: studentId })
          }
        })

        // Fetch Awards (New Path)
        onValue(ref(database, `${rootPath}/awarded-certificates/${studentId}`), (s) => {
          const data = s.val() || {}
          setAwards(Object.values(data).reverse())
          setIsLoading(false)
        })

        // Fetch Institute Profile
        onValue(ref(database, `${rootPath}/profile`), (s) => {
          setInstituteProfile(s.val())
        })
      }
    } catch (e) {
      console.error("Session parse error", e)
      setIsLoading(false)
    }
  }, [database])

  const filteredAwards = useMemo(() => {
    if (!searchTerm) return awards
    const lower = searchTerm.toLowerCase()
    return awards.filter(a => 
      a.achievementTitle?.toLowerCase().includes(lower) || 
      a.certificateNo?.toLowerCase().includes(lower)
    )
  }, [awards, searchTerm])

  const handleDownload = async () => {
    if (!canvasRef.current || !viewingAward) return
    setIsDownloading(true)
    try {
      // Temporarily set zoom to 1 for high-res capture
      const originalZoom = zoomLevel
      setZoomLevel(1)
      await new Promise(r => setTimeout(r, 100))
      
      const dataUrl = await toPng(canvasRef.current, { 
        quality: 1.0, 
        pixelRatio: 3, 
        width: 1123, 
        height: 794 
      })
      const link = document.createElement('a')
      link.download = `Certificate_${student.studentName.replace(/\s+/g, '_')}_${viewingAward.certificateNo}.png`
      link.href = dataUrl
      link.click()
      setZoomLevel(originalZoom)
    } catch (err) {
      console.error(err)
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.2em] animate-pulse">Establishing Academic Credentials...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">
      
      {/* 🏅 HEADER */}
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[28px] bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner">
              <Award className="w-10 h-10" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">Awards & Certificates</h2>
              <p className="text-[10px] font-bold text-black tracking-[0.2em] uppercase">Verified Institutional Credentials</p>
            </div>
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[#1e3a8a] transition-colors" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search awards..." 
              className="pl-12 h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 focus-visible:ring-[#1e3a8a] shadow-inner text-[14px] font-bold" 
            />
          </div>
        </div>
      </Card>

      {/* 🏅 AWARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredAwards.map((award) => (
          <Card key={award.id} className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <div className="h-48 bg-zinc-50 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
              <Award className="w-16 h-16 text-[#1e3a8a]/10 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-zinc-900/40 backdrop-blur-sm">
                <Button 
                  onClick={() => { setViewingAward(award); setIsViewerOpen(true); }}
                  className="bg-white text-black rounded-2xl h-12 px-8 font-black text-[10px] tracking-widest shadow-2xl border-none hover:bg-[#1e3a8a] hover:text-white transition-all"
                >
                  <Eye className="w-4 h-4 mr-2" /> View Certificate
                </Button>
              </div>
              <Badge className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-emerald-600 border-none text-[8px] font-black px-3 shadow-md">Verified</Badge>
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1">
                <h4 className="text-lg font-black text-black tracking-tight group-hover:text-[#1e3a8a] transition-colors line-clamp-1">{award.achievementTitle}</h4>
                <div className="flex items-center gap-2 text-[10px] font-black text-black tracking-widest">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> {award.certificateNo}
                </div>
              </div>
              <div className="pt-6 border-t border-zinc-50 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-zinc-300 tracking-widest uppercase">Issued On</span>
                  <p className="text-[14px] font-bold text-black">{award.issuedAt ? format(new Date(award.issuedAt), "PPP") : "-"}</p>
                </div>
                <Badge className="bg-zinc-50 text-[#1e3a8a] border-none font-black text-[9px] px-3">{award.academicYear}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAwards.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
            <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mx-auto text-zinc-200">
              <History className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-black tracking-tight leading-none">No Awards Found</h3>
              <p className="text-[14px] text-black max-w-xs mx-auto font-medium tracking-widest leading-relaxed uppercase opacity-40">Your digital credentials will appear here once issued.</p>
            </div>
          </div>
        )}
      </div>

      {/* 📥 CERTIFICATE VIEWER MODAL */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 border-none rounded-[40px] overflow-hidden bg-zinc-900 shadow-2xl flex flex-col">
          <div className="h-20 bg-white/5 border-b border-white/5 px-10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white"><Award className="w-5 h-5" /></div>
              <div>
                <h3 className="text-white font-black tracking-tight leading-none text-[14px]">{viewingAward?.achievementTitle}</h3>
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest mt-1 uppercase">{viewingAward?.certificateNo}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/5 rounded-xl px-4 py-2 flex items-center gap-6 text-white/40">
                <button onClick={() => setZoomLevel(z => Math.max(0.1, z - 0.1))} className="hover:text-white transition-colors border-none bg-transparent outline-none cursor-pointer"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-[10px] font-black">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className="hover:text-white transition-colors border-none bg-transparent outline-none cursor-pointer"><ZoomIn className="w-4 h-4" /></button>
              </div>
              <Button onClick={handleDownload} disabled={isDownloading} className="bg-[#1e3a8a] text-white h-10 px-6 rounded-xl font-black text-[10px] tracking-widest border-none shadow-xl active:scale-95 transition-all">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Export PNG
              </Button>
              <button 
                onClick={() => setIsViewerOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all border-none outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 bg-zinc-800 overflow-auto relative flex flex-col items-center p-20 scrollbar-none">
            {viewingAward ? (
              <div 
                className="relative transition-all duration-300 origin-center"
                style={{ 
                  width: `1123px`, 
                  height: `794px`,
                  transform: `scale(${zoomLevel})`
                }}
              >
                <CertificateTemplate 
                  containerRef={canvasRef}
                  studentName={student?.studentName}
                  achievementTitle={viewingAward.achievementTitle}
                  academicYear={viewingAward.academicYear}
                  certificateNo={viewingAward.certificateNo}
                  date={format(new Date(viewingAward.issuedAt), "MMMM dd, yyyy")}
                  instituteName={instituteProfile?.instituteName}
                  logoUrl={instituteProfile?.logoUrl}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white gap-4">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="text-[14px] font-black tracking-widest uppercase">Syncing HD Template...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </main>
  )
}
