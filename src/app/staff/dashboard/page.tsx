
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Video,
  Sparkles,
  Clock,
  User,
  Mail,
  Phone,
  Layers,
  ShieldCheck,
  CalendarDays,
  GraduationCap,
  Wallet,
  Award,
  IdCard,
  MapPin,
  Landmark,
  FileText,
  History,
  TrendingUp,
  Download,
  Info,
  CheckCircle2,
  X,
  Loader2,
  ExternalLink,
  Check,
  Megaphone,
  ScanFace
} from "lucide-react"
import { useFirebase, useUser, useTranslation } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { toPng } from 'html-to-image'

export default function StaffDashboardPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, staffId, isLoading: idLoading } = useResolvedId()
  const { t } = useTranslation()
  const idCardRef = useRef<HTMLDivElement>(null)

  const [staffProfile, setStaffProfile] = useState<any>(null)
  const [instituteProfile, setInstituteProfile] = useState<any>(null)
  const [myClasses, setMyClasses] = useState<any[]>([])
  const [leaveHistory, setLeaveHistory] = useState<any[]>([])
  const [salaryHistory, setSalaryHistory] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloadingId, setIsDownloadingId] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    const currentStaffId = staffId || session?.staffId
    const currentAdminUid = resolvedId || session?.adminUid

    if (!database || !currentAdminUid || !currentStaffId) {
      if (!idLoading && !currentStaffId) setIsLoading(false)
      return
    }

    const rootPath = `Institutes/${currentAdminUid}`

    // 1. Fetch Institute Profile
    onValue(ref(database, `${rootPath}/profile`), (s) => {
      setInstituteProfile(s.val())
    })

    // 2. Fetch Staff Profile
    const employeeRef = ref(database, `${rootPath}/employees/${currentStaffId}`)
    onValue(employeeRef, (snapshot) => {
      if (snapshot.exists()) {
        const profile = { ...snapshot.val(), id: currentStaffId }
        setStaffProfile(profile)

        // 3. Fetch Assigned Classes
        onValue(ref(database, `${rootPath}/live-classes`), (snap) => {
          const data = snap.val() || {}
          const list = Object.values(data).filter((c: any) =>
            c.faculty === `${profile.firstName} ${profile.lastName}` || c.createdBy === currentStaffId
          )
          setMyClasses(list)
        })

        // 4. Fetch Leave Requests
        onValue(ref(database, `${rootPath}/leave-requests`), (snap) => {
          const data = snap.val() || {}
          const list = Object.keys(data)
            .map(k => ({ ...data[k], id: k }))
            .filter(r => r.requesterId === currentStaffId)
          setLeaveHistory(list.reverse())
        })

        // 5. Fetch Salary History
        onValue(ref(database, `${rootPath}/payroll-history`), (snap) => {
          const data = snap.val() || {}
          const list = Object.keys(data)
            .map(k => ({ ...data[k], id: k }))
            .filter(p => p.staffId === currentStaffId)
          setSalaryHistory(list.reverse())
        })

        // 6. Fetch Announcements
        onValue(ref(database, `${rootPath}/announcements`), (snap) => {
          const data = snap.val() || {}
          const list = Object.keys(data)
            .map(k => ({ ...data[k], id: k }))
            .filter(a => a.target === 'Everyone' || a.target === 'Staff')
          setAnnouncements(list.reverse().slice(0, 3))
        })
      }
      setIsLoading(false)
    })

    return () => off(employeeRef)
  }, [database, resolvedId, staffId, idLoading])

  const handleDownloadId = async () => {
    if (!idCardRef.current) return
    setIsDownloadingId(true)
    try {
      const dataUrl = await toPng(idCardRef.current, { quality: 1.0, pixelRatio: 3, skipFonts: true })
      const link = document.createElement('a')
      link.download = `Staff_ID_${staffProfile?.firstName}_${staffProfile?.employeeId}.png`
      link.href = dataUrl
      link.click()
    } catch (err) { console.error(err) }
    finally { setIsDownloadingId(false) }
  }

  if (idLoading || isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-widest animate-pulse">Establishing Faculty Node...</div>

  if (!staffProfile) return <div className="p-20 text-center text-black font-bold">Profile Resolution Failed</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black text-[14px]">

      {/* 🚀 WELCOME BANNER */}
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden relative">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-50">
          <div className="flex-1 p-10 flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">Welcome, {staffProfile.firstName}!</h2>
            </div>
            <p className="text-black font-medium leading-relaxed italic max-w-md">"Excellence is not an act, but a habit. Your institutional dashboard is live."</p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Badge className="bg-blue-50 text-primary border-none text-[9px] font-black tracking-widest px-4 py-1.5">ID: {staffProfile.employeeId}</Badge>
              <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black tracking-widest px-4 py-1.5">Status: Verified</Badge>
            </div>
            <div className="pt-4">

            </div>
          </div>
          <div className="w-full md:w-[350px] p-0 bg-zinc-50/20 flex items-center justify-center overflow-hidden relative">
            <Image
              src="https://ik.imagekit.io/2wtn9m5bl/a-man-teacher-working-on-laptop-illustration.png"
              alt="Faculty Banner"
              width={280}
              height={180}
              className="object-contain"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          {/* 📊 TABS INTERFACE */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white p-2 rounded-[24px] h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100">
              <DashboardTabTrigger value="profile" label="MY PROFILE" icon={<User className="w-4 h-4" />} />
              <DashboardTabTrigger value="schedule" label="MY SCHEDULE" icon={<Clock className="w-4 h-4" />} />
              <DashboardTabTrigger value="leaves" label="LEAVE REGISTRY" icon={<CalendarDays className="w-4 h-4" />} />
              <DashboardTabTrigger value="payroll" label="PAYROLL HUB" icon={<Wallet className="w-4 h-4" />} />
              <DashboardTabTrigger value="idcard" label="STAFF ID CARD" icon={<IdCard className="w-4 h-4" />} />
            </TabsList>

            <div className="mt-8">
              {/* 👤 PROFILE TAB */}
              <TabsContent value="profile" className="mt-0 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <Card className="lg:col-span-5 border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 flex flex-col items-center text-center h-fit">
                    <Avatar className="h-32 w-32 rounded-[40px] border-8 border-zinc-50 shadow-xl mb-6">
                      <AvatarFallback className="bg-primary text-white text-4xl font-black">{staffProfile.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-black text-black tracking-tight">{staffProfile.firstName} {staffProfile.lastName}</h3>
                    <p className="text-[10px] font-bold text-black tracking-widest mt-1">{staffProfile.designation}</p>
                    <div className="w-full pt-8 mt-8 border-t border-zinc-50 space-y-4 text-left">
                      <DetailRow label="DEPARTMENT" value={staffProfile.department} />
                      <DetailRow label="JOIN DATE" value={staffProfile.joiningDate} />
                      <DetailRow label="EXPERIENCE" value={staffProfile.workExperience || 'N/A'} />
                      <DetailRow label="QUALIFICATION" value={staffProfile.qualification || 'N/A'} />
                    </div>
                  </Card>

                  <Card className="lg:col-span-7 border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 space-y-12">
                    <div className="space-y-10">
                      <section className="space-y-8">
                        <SectionHeader icon={<Info className="text-primary" />} title="Personal Context" />
                        <div className="space-y-4">
                          <DetailRow label="GENDER" value={staffProfile.gender} />
                          <DetailRow label="MOTHER NAME" value={staffProfile.motherName || '-'} />
                          <DetailRow label="MARITAL STATUS" value={staffProfile.maritalStatus} />
                          <DetailRow label="CONTACT" value={staffProfile.phone} />
                          <DetailRow label="OFFICIAL EMAIL" value={staffProfile.staffEmail} />
                        </div>
                      </section>
                      <section className="space-y-8 pt-6 border-t border-zinc-50">
                        <SectionHeader icon={<Landmark className="text-amber-500" />} title="Bank Registry" />
                        <div className="space-y-4">
                          <DetailRow label="BANK NAME" value={staffProfile.bankName || '-'} />
                          <DetailRow label="ACCOUNT NO" value={staffProfile.bankAccountNumber ? `XXXX${staffProfile.bankAccountNumber.slice(-4)}` : '-'} />
                          <DetailRow label="IFSC CODE" value={staffProfile.ifscCode || '-'} />
                        </div>
                      </section>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* 📅 SCHEDULE TAB */}
              <TabsContent value="schedule" className="mt-0 animate-in fade-in duration-500 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {myClasses.map((c, i) => (
                    <Card key={i} className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-xl transition-all relative overflow-hidden h-fit">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                      <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-primary mb-6 shadow-inner"><Video className="w-6 h-6" /></div>
                      <h4 className="text-lg font-black text-black tracking-tight mb-2 line-clamp-1">{c.topic}</h4>
                      <p className="text-[10px] font-bold text-black tracking-widest mb-6">{c.targetBatch} • Sec {c.targetSection || 'A'}</p>
                      <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                        <div className="flex items-center gap-2 text-[14px] font-black text-primary"><Clock className="w-4 h-4" /> {c.time}</div>
                        <Badge variant="outline" className="rounded-lg border-zinc-100 text-black text-[9px] font-black">{c.duration} MINS</Badge>
                      </div>
                      <Button onClick={() => window.open(c.meetingUrl, '_blank')} className="w-full mt-6 rounded-2xl h-11 bg-zinc-900 text-white font-black text-[10px] tracking-widest gap-2 active:scale-95 border-none shadow-lg">Launch Node <ExternalLink className="w-3.5 h-3.5" /></Button>
                    </Card>
                  ))}
                  {myClasses.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-zinc-50/50 rounded-[40px] border-2 border-dashed border-zinc-100">
                      <p className="text-[14px] font-bold text-black tracking-widest">No live sessions scheduled for your profile</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 📋 LEAVES TAB */}
              <TabsContent value="leaves" className="mt-0 animate-in fade-in duration-500">
                <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                  <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                    <h3 className="text-[14px] font-black text-black tracking-widest">Personal Leave History</h3>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black">Authorized Record</Badge>
                  </div>
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black pl-8 h-14">Category</TableHead>
                        <TableHead className="text-[10px] font-black">Schedule</TableHead>
                        <TableHead className="text-[10px] font-black text-center">Days</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveHistory.map((l, i) => (
                        <TableRow key={i} className="border-zinc-50 group hover:bg-zinc-50/30 transition-all">
                          <TableCell className="pl-8 py-4 font-bold text-black">{l.leaveType}</TableCell>
                          <TableCell className="text-[14px] font-bold text-black font-public-sans">{l.fromDate} to {l.toDate}</TableCell>
                          <TableCell className="text-center font-black text-black">{l.totalDays}</TableCell>
                          <TableCell className="text-right pr-8">
                            <Badge className={cn(
                              "rounded-md text-[9px] font-black  border-none",
                              l.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                                l.status === 'Rejected' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                            )}>{l.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {leaveHistory.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="h-48 text-center text-zinc-300 italic text-[10px]">No leave applications in registry</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* 💰 PAYROLL TAB */}
              <TabsContent value="payroll" className="mt-0 animate-in fade-in duration-500">
                <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                  <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                    <h3 className="text-[14px] font-black text-black tracking-widest">Disbursement Ledger</h3>
                    <Badge className="bg-[#1e3a8a] text-white border-none text-[10px] font-black">Digital Sync</Badge>
                  </div>
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black pl-8 h-14">Month & Year</TableHead>
                        <TableHead className="text-[10px] font-black text-center">Working Days</TableHead>
                        <TableHead className="text-[10px] font-black text-center">Net Disbursed</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaryHistory.map((p, i) => (
                        <TableRow key={i} className="border-zinc-50 group hover:bg-zinc-50/20 transition-all">
                          <TableCell className="pl-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner"><Wallet className="w-4 h-4" /></div>
                              <span className="text-[14px] font-bold text-black">{p.month} {p.year}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-black font-public-sans">{p.presentDays} Days</TableCell>
                          <TableCell className="text-center font-black text-emerald-600">₹ {Number(p.netSalary).toLocaleString()}</TableCell>
                          <TableCell className="text-right pr-8">
                            <Button variant="ghost" size="sm" asChild className="h-8 rounded-xl bg-zinc-50 text-black hover:text-primary transition-all font-black text-[9px] tracking-widest gap-2">
                              <Link href={`/hr/payroll/payslip/${p.id}`}><Download className="w-3.5 h-3.5" /> Get Slip</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {salaryHistory.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="h-48 text-center text-zinc-300 italic text-[10px]">No payroll records found in history</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* 💳 ID CARD TAB */}
              <TabsContent value="idcard" className="mt-0 animate-in fade-in duration-500 flex flex-col items-center gap-10">
                <div ref={idCardRef} className="w-[350px] bg-white rounded-[40px] border border-zinc-100 shadow-2xl overflow-hidden flex flex-col print:m-0 print:shadow-none">
                  <div className="bg-[#1e3a8a] p-8 text-center space-y-1 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                    <h3 className="text-white font-black text-[14px] tracking-widest">{instituteProfile?.instituteName || 'ACADEMIC PORTAL'}</h3>
                    <p className="text-white/40 text-[9px] font-bold tracking-[0.3em]">Staff Identity Card</p>
                  </div>
                  <div className="p-10 flex flex-col items-center gap-8">
                    <div className="relative">
                      <Avatar className="h-32 w-32 rounded-[40px] border-8 border-zinc-50 shadow-lg">
                        <AvatarFallback className="bg-primary text-white text-4xl font-black">{staffProfile.firstName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-lg shadow-md border-2 border-white"><Check className="w-3 h-3 stroke-[4px]" /></div>
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="text-2xl font-black text-black tracking-tight leading-none">{staffProfile.firstName} {staffProfile.lastName}</h4>
                      <p className="text-primary font-black text-[14px] tracking-widest">{staffProfile.designation}</p>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-y-6 pt-8 border-t border-zinc-50 text-left">
                      <IdMeta label="EMP ID." value={staffProfile.employeeId} />
                      <IdMeta label="DEPT." value={staffProfile.department} />
                      <IdMeta label="JOIN DATE" value={staffProfile.joiningDate} />
                      <IdMeta label="PHONE" value={staffProfile.phone} />
                    </div>
                  </div>
                  <div className="bg-zinc-50 p-6 border-t border-zinc-100 text-center">
                    <p className="text-[8px] font-bold text-black tracking-widest">{instituteProfile?.address || 'Main Campus, Academic Block'}</p>
                  </div>
                </div>
                <Button onClick={handleDownloadId} disabled={isDownloadingId} className="bg-primary hover:opacity-90 text-white rounded-xl h-14 px-12 font-black text-[14px] tracking-widest shadow-xl border-none gap-2">
                  {isDownloadingId ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />} Download Staff ID PNG
                </Button>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* 📣 RIGHT COLUMN: BROADCASTS FEED */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 space-y-8">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-4">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-primary" />
                <h3 className="text-[14px] font-black text-black tracking-widest">Recent Broadcasts</h3>
              </div>
              <Link href="/staff/announcement" className="text-[10px] font-black text-primary tracking-widest hover:underline">View All</Link>
            </div>

            <div className="space-y-6">
              {announcements.map((a) => (
                <div key={a.id} className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-3 group hover:bg-white hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-blue-50 text-primary border-none text-[8px] font-black px-2">{a.target}</Badge>
                    <span className="text-[9px] font-bold text-zinc-300">{a.date}</span>
                  </div>
                  <h5 className="text-[14px] font-black text-black tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{a.title}</h5>
                  <p className="text-[11px] text-black font-medium leading-relaxed line-clamp-2">{a.message}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="py-10 text-center space-y-3">
                  <Megaphone className="w-8 h-8 text-zinc-100 mx-auto" />
                  <p className="text-[10px] font-bold text-zinc-300 tracking-widest">No active broadcasts</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="border-none shadow-sm rounded-[32px] bg-[#1e3a8a] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-[14px] font-black tracking-widest">Node Compliance</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] font-bold text-white/50 tracking-widest">Access Status</span>
                  <span className="text-[14px] font-black text-emerald-400">OPTIMAL</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] font-bold text-white/50 tracking-widest">Verified Role</span>
                  <span className="text-[14px] font-black text-white">FACULTY</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-50 group">
      <span className="text-[11px] font-bold text-black tracking-widest group-hover:text-black transition-colors">{label}</span>
      <span className="text-[14px] font-black text-black truncate max-w-[200px]">{value || '-'}</span>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: any, title: string }) {
  return (
    <h3 className="text-[14px] font-black text-black flex items-center gap-3 tracking-tight border-b border-zinc-50 pb-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center shadow-inner">{icon}</div>
      {title}
    </h3>
  )
}

function DashboardTabTrigger({ value, label, icon, count }: any) {
  return (
    <TabsTrigger
      value={value}
      className="h-11 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg"
    >
      <span className="flex items-center gap-2">{icon} {label} {count !== undefined && `(${count})`}</span>
    </TabsTrigger>
  )
}

function IdMeta({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-black text-zinc-300 tracking-[0.2em]">{label}</p>
      <p className="text-[14px] font-black text-black tracking-tight truncate">{value}</p>
    </div>
  )
}
