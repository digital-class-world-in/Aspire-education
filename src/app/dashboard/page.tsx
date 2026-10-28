"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { WelcomeBanner } from "@/components/dashboard/welcome-banner"
import { OnboardingPopup } from "@/components/onboarding/plan-popup"
import { Card } from "@/components/ui/card"
import { 
  Users, 
  Wallet, 
  UserCheck, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  CalendarDays, 
  MonitorPlay, 
  Sparkles, 
  Globe, 
  UserPlus, 
  FileText, 
  Megaphone, 
  Award, 
  ClipboardList, 
  Receipt, 
  MapPin, 
  Video, 
  UserX, 
  UserMinus, 
  ShieldCheck, 
  Cake, 
  LayoutDashboard,
  Search,
  ChevronRight,
  Menu,
  Download,
  FileSpreadsheet,
  ImageIcon,
  Users2,
  MoreVertical,
  Eye,
  Activity,
  Calendar,
  X,
  Trophy
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList,
  Line,
  ReferenceLine
} from "recharts"
import { cn } from "@/lib/utils"
import { useFirebase, useUser, useTranslation } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const CHART_COLORS = ['#1e3a8a', 'hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6', '#f97316', '#6366f1', '#d946ef']

export default function DashboardPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, branchId, isBranch, isLoading: isIdLoading } = useResolvedId()
  const { t } = useTranslation()
  const { toast } = useToast()
  
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [profile, setProfile] = useState<any>(null)
  const [showPlanPopup, setShowPlanPopup] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [selectedYear, setSelectedYear] = useState("2026")
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"income" | "expenses" | "profit">("income")
  
  const [stats, setStats] = useState({
    totalEnquiry: 0,
    totalAdmission: 0,
    totalStaff: 0,
    totalBranch: 0,
    totalFee: 0,
    collectedFee: 0,
    income: 0,
    expenses: 0,
    websiteVisitors: 0,
    todayCollection: 0
  })

  const [admissions, setAdmissions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [otherIncome, setOtherIncome] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<any[]>([])
  const [attendanceStats, setAttendanceStats] = useState({
    studentPresentToday: 0,
    staffPresentToday: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  useEffect(() => {
    const justUpgraded = localStorage.getItem('just_upgraded')
    if (justUpgraded === 'true') {
      setShowCelebration(true)
      localStorage.removeItem('just_upgraded')
    }
  }, [])

  useEffect(() => {
    if (!database || !resolvedId) return

    const rootPath = `Institutes/${resolvedId}`
    
    const profileRef = ref(database, `${rootPath}/profile`)
    const unsubscribeProfile = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setProfile(data)
        setInstituteName(data.instituteName || "Your Institute")
        
        if (data.plan_selected === false || data.plan_selected === undefined) {
          setShowPlanPopup(true)
        } else {
          setShowPlanPopup(false)
        }
      } else {
        setShowPlanPopup(true)
      }
    })

    onValue(ref(database, `${rootPath}/enquiries`), (s) => {
      const data = s.val() || {}
      let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      if (isBranch && branchId) list = list.filter(e => e.branchId === branchId)
      setStats(prev => ({ ...prev, totalEnquiry: list.length }))
    })
    
    onValue(ref(database, `${rootPath}/admissions`), (s) => {
      const data = s.val() || {}
      let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      if (isBranch && branchId) list = list.filter(a => a.branchId === branchId)
      setAdmissions(list)
      const totalFee = list.reduce((sum, item) => sum + (Number(item.netFees) || 0), 0)
      setStats(prev => ({ ...prev, totalAdmission: list.length, totalFee }))
    })

    onValue(ref(database, `${rootPath}/analytics/websiteVisitors`), (snapshot) => {
      if (snapshot.exists()) {
        setStats(prev => ({ ...prev, websiteVisitors: snapshot.val() }))
      }
    })

    onValue(ref(database, `${rootPath}/employees`), (s) => {
      const data = s.val() || {}
      let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      if (isBranch && branchId) list = list.filter(e => e.branchId === branchId)
      setStats(prev => ({ ...prev, totalStaff: list.length }))
    })

    onValue(ref(database, `${rootPath}/branches`), (s) => {
       const data = s.val() || {}
       let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
       if (isBranch && branchId) list = list.filter(b => b.id === branchId)
       setStats(prev => ({ ...prev, totalBranch: list.length }))
    })
    
    onValue(ref(database, `${rootPath}/fees`), (s) => {
      const data = s.val() || {}
      let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      if (isBranch && branchId) list = list.filter(p => p.branchId === branchId)
      setPayments(list)
      const totalCollected = list.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      const todayColl = list.filter(p => p.date === todayStr).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      setStats(prev => ({ ...prev, collectedFee: totalCollected, todayCollection: todayColl }))
    })

    onValue(ref(database, `${rootPath}/income`), (s) => {
      const data = s.val() || {}
      let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      if (isBranch && branchId) list = list.filter(i => i.branchId === branchId)
      setOtherIncome(list)
      setStats(prev => ({ ...prev, income: list.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) }))
    })

    onValue(ref(database, `${rootPath}/expenses`), (s) => {
      const data = s.val() || {}
      let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      if (isBranch && branchId) list = list.filter(e => e.branchId === branchId)
      setAllExpenses(list)
      setStats(prev => ({ ...prev, expenses: list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) }))
    })

    onValue(ref(database, `${rootPath}/attendance`), (snapshot) => {
      const data = snapshot.val() || {}
      let sPToday = 0, stPToday = 0

      if (data.Student && data.Student[todayStr]) {
        Object.values(data.Student[todayStr]).forEach((batch: any) => {
          Object.values(batch).forEach((record: any) => {
            if (isBranch && branchId && record.branchId !== branchId) return
            if (record.status === 'Present') sPToday++
          })
        })
      }

      if (data.Staff && data.Staff[todayStr]) {
        Object.values(data.Staff[todayStr]).forEach((record: any) => {
          if (isBranch && branchId && record.branchId !== branchId) return
          if (record.status === 'Present') stPToday++
        })
      }

      setAttendanceStats({ 
        studentPresentToday: sPToday,
        staffPresentToday: stPToday
      })
      setIsLoading(false)
    })

    return () => {
      off(profileRef)
    }
  }, [database, resolvedId, todayStr])

  const studentFinancials = useMemo(() => {
    return admissions.map(student => {
      const studentPayments = payments.filter(p => p.studentId === student.id)
      const collected = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      const total = Number(student.netFees) || 0
      return { ...student, collectedFees: collected, dueFees: Math.max(0, total - collected) }
    })
  }, [admissions, payments])

  const todayDueStudents = useMemo(() => {
    return studentFinancials.filter(s => s.feeDueDate === todayStr && s.dueFees > 0)
  }, [studentFinancials, todayStr])

  const upcomingBirthdays = useMemo(() => {
    return admissions.filter(s => {
      if (!s.dob) return false
      const dobDate = new Date(s.dob)
      const todayDate = new Date()
      const bDay = dobDate.getDate()
      const bMonth = dobDate.getMonth()
      const tDay = todayDate.getDate()
      const tMonth = todayDate.getMonth()
      return bMonth === tMonth && bDay >= tDay && bDay <= tDay + 7
    })
  }, [admissions])

  // Monthly collected fees (used in main chart)
  const feeCollectionData = useMemo(() => {
    const monthsData = SHORT_MONTHS.map(m => ({ name: m, collection: 0 }))
    
    payments.forEach(p => {
      if (p.date) {
        const date = parseISO(p.date)
        if (date.getFullYear().toString() === selectedYear) {
          monthsData[date.getMonth()].collection += Number(p.amount) || 0
        }
      }
    })

    return monthsData
  }, [payments, selectedYear])

  // Total collected fees for selected year (used in both main chart title + financial analysis card)
  const totalCollectionThisYear = useMemo(() => {
    return feeCollectionData.reduce((sum, m) => sum + m.collection, 0)
  }, [feeCollectionData])

  // Analytics for small right card (income/expenses/profit tabs)
  const analyticsData = useMemo(() => {
    const monthsData = SHORT_MONTHS.map(m => ({ name: m, income: 0, expense: 0, profit: 0 }))
    
    payments.forEach(p => {
      if (p.date) {
        const date = parseISO(p.date)
        if (date.getFullYear().toString() === selectedYear) {
          monthsData[date.getMonth()].income += Number(p.amount) || 0
        }
      }
    })

    allExpenses.forEach(e => {
      if (e.date) {
        const date = parseISO(e.date)
        if (date.getFullYear().toString() === selectedYear) {
          monthsData[date.getMonth()].expense += Number(e.amount) || 0
        }
      }
    })

    monthsData.forEach(m => {
      m.profit = m.income - m.expense
    })

    return monthsData
  }, [payments, allExpenses, selectedYear])

  const totalsForYear = useMemo(() => {
    const inc = analyticsData.reduce((s, m) => s + m.income, 0)
    const exp = analyticsData.reduce((s, m) => s + m.expense, 0)
    return { inc, exp, pro: inc - exp }
  }, [analyticsData])

  const chartDataForPnL = useMemo(() => {
    return analyticsData.map(m => ({ ...m, expense: -m.expense }))
  }, [analyticsData])

  // Export for fee collection chart
  const handleExportFeeCollectionExcel = () => {
    const data = feeCollectionData.map(m => ({
      Month: m.name,
      "Fee Collected": m.collection
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Fee Collection")
    XLSX.writeFile(wb, `Fee_Collection_${selectedYear}.xlsx`)
  }

  const handleExportFeeCollectionPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(20).setTextColor(16, 185, 129).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text(`Fee Collection Report - Year ${selectedYear}`, 14, 28)
    const tableData = feeCollectionData.map(m => [m.name, `₹${m.collection.toLocaleString()}`])
    autoTable(doc, {
      startY: 35,
      head: [['Month', 'Collected (INR)']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    })
    doc.save(`Fee_Collection_${selectedYear}.pdf`)
  }

  // Export for right small analysis card
  const handleExportAnalysisExcel = () => {
    const data = analyticsData.map(m => ({
      Month: m.name,
      Income: m.income,
      Expenses: m.expense,
      "Profit/Loss": m.profit
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Analysis")
    XLSX.writeFile(wb, `Analysis_${selectedYear}.xlsx`)
  }

  const handleExportAnalysisPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text(`Financial Analysis - Year ${selectedYear}`, 14, 28)
    const tableData = analyticsData.map(m => [
      m.name, 
      `₹${m.income.toLocaleString()}`, 
      `₹${m.expense.toLocaleString()}`, 
      m.profit >= 0 ? `+₹${m.profit.toLocaleString()}` : `-₹${Math.abs(m.profit).toLocaleString()}`
    ])
    autoTable(doc, {
      startY: 35,
      head: [['Month', 'Income (INR)', 'Expenses (INR)', 'Profit/Loss (INR)']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] }
    })
    doc.save(`Analysis_${selectedYear}.pdf`)
  }

  const getDisplayValues = useMemo(() => {
    let title = ""
    let value = 0
    let colorClass = "text-black"
    if (activeAnalysisTab === "income") {
      title = "Total Income"
      value = totalsForYear.inc
    } else if (activeAnalysisTab === "expenses") {
      title = "Total Expenses"
      value = totalsForYear.exp
    } else {
      title = "Net Profit/Loss"
      value = totalsForYear.pro
      if (value < 0) {
        colorClass = "text-red-500"
        value = Math.abs(value)
      }
    }
    const displayValue = value >= 0 ? `₹${value.toLocaleString()}` : `-₹${value.toLocaleString()}`
    return { title, displayValue, colorClass }
  }, [activeAnalysisTab, totalsForYear])

  const quickLinks = [
    { name: t("admission_enquiry"), href: "/front-office/admission-enquiry", icon: ClipboardList, color: "bg-blue-50 text-blue-600" },
    { name: t("website_mgmt"), href: "/website-management", icon: Globe, color: "bg-indigo-50 text-indigo-600" },
    { name: t("manage_branches"), href: "/branch-management", icon: MapPin, color: "bg-purple-50 text-purple-600" },
    { name: t("live_classes"), href: "/live-classes", icon: Video, color: "bg-rose-50 text-rose-600" },
    { name: t("student_admission"), href: "/student-information/admission", icon: UserPlus, color: "bg-amber-50 text-amber-600" },
    { name: t("fees_collections"), href: "/fees-collections", icon: Wallet, color: "bg-emerald-50 text-emerald-600" },
    { name: t("attendance"), href: "/attendance", icon: UserCheck, color: "bg-teal-50 text-teal-600" },
    { name: t("online_exam"), href: "/examination/online-exam", icon: FileText, color: "bg-sky-50 text-sky-600" },
    { name: t("employee_directory"), href: "/hr/directory", icon: Users, color: "bg-orange-50 text-orange-600" },
    { name: t("account_management"), href: "/accounts", icon: Receipt, color: "bg-zinc-50 text-black" },
    { name: t("announcement"), href: "/announcement", icon: Megaphone, color: "bg-pink-50 text-pink-600" },
    { name: t("certificates"), href: "/certificates", icon: Award, color: "bg-violet-50 text-violet-600" },
  ]

  return (
    <div className="min-h-screen bg-[#f5f5f9] flex font-public-sans relative">
      {showPlanPopup && <OnboardingPopup instituteName={instituteName} />}

      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-zinc-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-12 max-w-lg w-full shadow-2xl text-center space-y-8 border border-zinc-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-2xl" />
              <button onClick={() => setShowCelebration(false)} className="absolute right-8 top-8 text-zinc-300 hover:text-black transition-colors p-2 border-none bg-transparent outline-none"><X className="w-6 h-6" /></button>
              
              <div className="w-24 h-24 rounded-[32px] bg-emerald-50 flex items-center justify-center mx-auto shadow-inner text-emerald-500 animate-bounce">
                <Trophy className="w-12 h-12" />
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-black text-black tracking-tight font-public-sans leading-none">Congratulations!</h2>
                <p className="text-black font-medium leading-relaxed max-w-sm mx-auto">Your institutional node has been successfully upgraded to <span className="text-primary font-black">{profile?.currentPlan}</span> tier.</p>
              </div>

              <div className="bg-zinc-50 p-8 rounded-[32px] border border-zinc-100 space-y-4 text-left">
                <div className="flex justify-between items-center text-[10px] font-black tracking-[0.2em] text-black">
                  <span>Activated Plan</span>
                  <span className="text-emerald-600">LIVE & SYNCED</span>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-12 h-12 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-primary shadow-sm"><ShieldCheck className="w-6 h-6" /></div>
                  <div className="text-left">
                    <p className="text-lg font-black text-black leading-none">{profile?.currentPlan}</p>
                    <p className="text-[10px] font-bold text-black tracking-widest mt-1">Valid Until: {profile?.planExpiryDate ? format(new Date(profile.planExpiryDate), "PPP") : 'Unlimited'}</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setShowCelebration(false)}
                className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl transition-all active:scale-95 border-none"
              >
                Launch Professional Hub
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20 w-full font-public-sans">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <div className="lg:col-span-8 space-y-10">
              <WelcomeBanner />

              <Card className="border border-zinc-100 shadow-sm rounded-3xl bg-white overflow-hidden">
                <div className="p-6 border-b border-zinc-50 bg-zinc-50/30 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-[15px] font-medium text-black tracking-wide font-public-sans">{t("stats_overview")}</h3>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SmallStatCard title={t("total_inquiry")} value={stats.totalEnquiry} icon={<img src="https://img.icons8.com/ultraviolet/40/why-us-male.png" className="w-10 h-10" />} href="/front-office/admission-enquiry" />
                  <SmallStatCard title={t("total_admission")} value={stats.totalAdmission} icon={<img src="https://img.icons8.com/stickers/100/admission.png" className="w-10 h-10" />} href="/student-information/admission" />
                  <SmallStatCard title={t("website_visitor")} value={stats.websiteVisitors} icon={<img src="https://img.icons8.com/cotton/64/website--v1.png" className="w-10 h-10" />} href="/website-management/inquiry" />
                  <SmallStatCard title={t("today_fee_collection")} value={stats.todayCollection} isAmount icon={<img src="https://img.icons8.com/color/96/rupee--v1.png" className="w-10 h-10" />} href="/fees-collections" />
                  <SmallStatCard title={t("today_present_student")} value={attendanceStats.studentPresentToday} icon={<img src="https://img.icons8.com/emoji/96/person-student.png" className="w-10 h-10" />} href="/attendance" />
                  <SmallStatCard title={t("today_present_employee")} value={attendanceStats.staffPresentToday} icon={<img src="https://img.icons8.com/dusk/64/employee-card.png" className="w-10 h-10" />} href="/hr/attendance" />
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="p-6 border-b border-zinc-50 bg-zinc-50/30 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-[15px] font-medium text-black tracking-wide font-public-sans">{t("financial_analysis")}</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <MetricCard title={t("total_fees")} value={stats.totalFee} isAmount icon={<img src="https://img.icons8.com/fluency/48/school.png" className="w-10 h-10" />} href="/fees-collections" />
                  {/* Changed here: show yearly collected fees (same as main chart title) */}
                  <MetricCard title={t("collected_fees")} value={totalCollectionThisYear} isAmount icon={<img src="https://img.icons8.com/fluency/48/checked-user-male.png" className="w-10 h-10" />} href="/fees-collections?status=paid" />
                  <MetricCard title={t("due_fees")} value={stats.totalFee - totalCollectionThisYear} isAmount icon={<img src="https://img.icons8.com/fluency/48/cancel-last-digit.png" className="w-10 h-10" />} href="/fees-collections?status=due" />
                </div>
              </Card>

              {/* MAIN FEE COLLECTION CHART */}
              <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-emerald-50/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-800">Fee Collection Analysis</h3>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      ₹{totalCollectionThisYear.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Menu className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExportFeeCollectionExcel}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportFeeCollectionPdf}>
                          <FileText className="mr-2 h-4 w-4" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="p-10">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={feeCollectionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000000', fontSize: 10, fontWeight: 'bold', fontFamily: 'Public Sans'}} dy={10} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}} 
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Collected Fees']}
                        />
                        <Bar 
                          dataKey="collection" 
                          fill="#10b981" 
                          radius={[6, 6, 0, 0]} 
                          barSize={32}
                        >
                          <LabelList 
                            dataKey="collection" 
                            position="top" 
                            formatter={(v: number) => v > 0 ? `₹${v.toLocaleString()}` : ''} 
                            style={{ fill: '#000000', fontSize: 12, fontWeight: 'bold', fontFamily: 'Public Sans' }} 
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
                  <h4 className="text-[15px] font-medium text-black tracking-wide font-public-sans">{t("quick_links")}</h4>
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                </div>
                <div className="p-6 grid grid-cols-3 gap-x-4 gap-y-10">
                  {quickLinks.map((link, idx) => (
                    <Link key={idx} href={link.href} className="flex flex-col items-center gap-3 group">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all group-hover:scale-110 active:scale-95", link.color)}><link.icon className="w-6 h-6" /></div>
                      <span className="text-[13px] font-medium text-black tracking-tight text-center leading-none font-public-sans lowercase">{link.name}</span>
                    </Link>
                  ))}
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="p-4 border-b border-zinc-50 bg-zinc-50/20">
                  <div className="flex items-center gap-3 p-2 bg-white rounded-3xl border border-zinc-100 shadow-sm">
                    {["income", "expenses", "profit"].map((tab) => (
                      <button key={tab} onClick={() => setActiveAnalysisTab(tab as any)} className={cn("flex-1 py-3 rounded-2xl text-[15px] font-bold transition-all font-public-sans lowercase ", activeAnalysisTab === tab ? "bg-primary text-white shadow-xl shadow-teal-900/20" : "text-black hover:bg-zinc-50")}>{tab}</button>
                    ))}
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner"><Wallet className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[15px] font-medium text-black font-public-sans leading-none mb-1">{getDisplayValues.title}</p>
                        <h4 className={cn("text-[20px] font-black stats-digit leading-none", getDisplayValues.colorClass)}>{getDisplayValues.displayValue}</h4>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2.5 hover:bg-zinc-50 rounded-xl transition-all border border-zinc-100 bg-white outline-none"><Menu className="w-5 h-5 text-black" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-zinc-100 p-2 shadow-xl w-56">
                        <DropdownMenuItem onClick={handleExportAnalysisExcel} className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-black gap-3 cursor-pointer tracking-widest">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Download Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportAnalysisPdf} className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-black gap-3 cursor-pointer tracking-widest">
                          <FileText className="w-4 h-4 text-rose-500" /> Download PDF Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {activeAnalysisTab === 'profit' ? (
                        <BarChart data={chartDataForPnL}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000000', fontSize: 10, fontWeight: 'bold', fontFamily: 'Public Sans'}} />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                            formatter={(value: number, name: string) => [name === 'income' ? `+₹${value.toLocaleString()}` : `₹${Math.abs(value).toLocaleString()}`, name === 'income' ? 'Income' : 'Expenses']}
                          />
                          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                          <Bar dataKey="income" radius={[3, 3, 0, 0]} barSize={16} fill="#10b981">
                            <LabelList 
                              dataKey="income" 
                              position="top" 
                              formatter={(v: number) => `₹${v.toLocaleString()}`} 
                              style={{ fill: '#000000', fontSize: 8, fontWeight: 'bold', fontFamily: 'Public Sans' }} 
                            />
                          </Bar>
                          <Bar dataKey="expense" radius={[3, 3, 0, 0]} barSize={16} fill="#ef4444">
                            <LabelList 
                              dataKey="expense" 
                              position="bottom" 
                              formatter={(v: number) => `₹${Math.abs(v).toLocaleString()}`} 
                              style={{ fill: '#000000', fontSize: 8, fontWeight: 'bold', fontFamily: 'Public Sans' }} 
                            />
                          </Bar>
                        </BarChart>
                      ) : (
                        <BarChart data={analyticsData}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000000', fontSize: 10, fontWeight: 'bold', fontFamily: 'Public Sans'}} />
                          <YAxis hide />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey={activeAnalysisTab} radius={[3, 3, 0, 0]} barSize={16} fill={CHART_COLORS[0]}>
                            <LabelList 
                              dataKey={activeAnalysisTab} 
                              position="top" 
                              formatter={(v: number) => `₹${v.toLocaleString()}`} 
                              style={{ fill: '#000000', fontSize: 8, fontWeight: 'bold', fontFamily: 'Public Sans' }} 
                            />
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  <div className="pt-4 border-t border-zinc-100">
                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-[13px] font-medium text-emerald-700">Today's Fee Collection</span>
                      <span className="text-[16px] font-black text-emerald-600">₹{stats.todayCollection.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                  <h4 className="text-[15px] font-medium text-black tracking-wide font-public-sans">{t("today_due_fees")}</h4>
                  <Calendar className="w-4 h-4 text-rose-400" />
                </div>
                <div className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-zinc-100 hover:bg-transparent">
                        <TableHead className="text-[10px] font-black text-black tracking-widest pl-8 py-3">Student Name</TableHead>
                        <TableHead className="text-[10px] font-black text-black tracking-widest py-3 text-center">Due Date</TableHead>
                        <TableHead className="text-right pr-8 text-[10px] font-black text-black tracking-widest py-3">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayDueStudents.map((s) => (
                        <TableRow key={s.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-all group">
                          <TableCell data-label="STUDENT" className="pl-8 py-4">
                            <div className="space-y-1">
                              <p className="text-[15px] font-bold text-black lowercase leading-none font-public-sans">{s.studentName}</p>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 rounded-lg"><AvatarFallback className="text-[8px] font-black bg-zinc-100 text-black">{s.studentName?.charAt(0) || '?'}</AvatarFallback></Avatar>
                                <span className="text-[10px] font-bold text-black tracking-widest">{s.course}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell data-label="DUE DATE" className="text-center"><span className="text-[14px] font-bold text-black font-public-sans">{s.feeDueDate}</span></TableCell>
                          <TableCell data-label="VIEW" className="text-right pr-8"><Link href={`/student-information/admission/${s.id}`} className="inline-flex items-center justify-center p-2 rounded-xl text-black hover:text-primary transition-colors bg-transparent border-none outline-none"><Eye className="w-5 h-5" /></Link></TableCell>
                        </TableRow>
                      ))}
                      {todayDueStudents.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="h-32 text-center text-black text-[10px] font-bold tracking-widest">No Dues Today</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
                  <h4 className="text-[15px] font-medium text-black tracking-wide font-public-sans">{t("upcoming_birthdays")}</h4>
                  <Cake className="w-4 h-4 text-rose-400" />
                </div>
                <ScrollArea className="h-[180px]">
                  <div className="p-6 space-y-4">
                    {upcomingBirthdays.length > 0 ? upcomingBirthdays.map((s, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-50/50 group hover:bg-white hover:shadow-md transition-all font-public-sans">
                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 font-bold text-[14px] shadow-sm">{s.studentName?.charAt(0) || '?'}</div>
                        <div className="flex-1">
                          <p className="text-[15px] font-medium text-black lowercase">{s.studentName}</p>
                          <p className="text-[9px] font-bold text-black">{format(new Date(s.dob), "do MMMM")}</p>
                        </div>
                        <Badge className="bg-rose-50 text-rose-600 border-none text-[7px] font-medium px-2">Soon</Badge>
                      </div>
                    )) : (
                      <p className="text-center text-[10px] font-bold text-black tracking-widest pt-6 font-public-sans">No Birthdays This Week</p>
                    )}
                  </div>
                </ScrollArea>
              </Card>

            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

function SmallStatCard({ title, value, icon, isAmount = false, href }: { title: string, value: number, icon: React.ReactNode, isAmount?: boolean, href?: string }) {
  const content = (
    <div className="flex flex-col h-full gap-4">
      <p className="text-[15px] font-medium text-black" title={title}>{title}</p>
      <div className="flex items-center gap-3">
        <div className="shrink-0 transition-transform group-hover:scale-110">{icon}</div>
        <h4 className="text-[20px] stats-digit text-black leading-none font-medium">
          {isAmount && <span className="mr-0.5 text-[14px] font-bold">₹</span>}
          {value.toLocaleString()}
        </h4>
      </div>
    </div>
  )

  return (
    <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-5 group hover:shadow-md transition-all font-public-sans overflow-hidden cursor-pointer">
      {href ? <Link href={href}>{content}</Link> : content}
    </Card>
  )
}

function MetricCard({ title, value, icon, isAmount = false, href }: any) {
  const content = (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[15px] font-medium text-black tracking-tight font-public-sans">{title}</p>
        <div className="h-10 w-10 rounded-xl text-black flex items-center justify-center">
          <Eye className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-center gap-4 pt-2">
        <div className="shrink-0 group-hover:scale-110 transition-transform">{icon}</div>
        <h4 className="text-[20px] font-medium tracking-tighter stats-digit text-black">
          {isAmount && <span className="mr-1 text-black font-bold">₹</span>}
          { Number(value).toLocaleString() }
        </h4>
      </div>
    </>
  )

  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[24px] bg-white p-6 group hover:shadow-md transition-all duration-300 relative font-public-sans cursor-pointer overflow-hidden">
      {href ? <Link href={href}>{content}</Link> : content}
    </Card>
  )
}
