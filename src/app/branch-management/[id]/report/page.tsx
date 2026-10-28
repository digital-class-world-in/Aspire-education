"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Download, 
  Users, 
  MessageSquare, 
  Wallet, 
  TrendingUp,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  Briefcase,
  PieChart,
  Target
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie
} from "recharts"

const COLORS = ['#0D9488', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function BranchReportPage() {
  const { id } = useParams()
  const router = useRouter()
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [branch, setBranch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (!database || !user || !id) return

    const branchRef = ref(database, `Institutes/${user.uid}/branches/${id}`)
    const unsubscribe = onValue(branchRef, (snapshot) => {
      if (snapshot.exists()) {
        setBranch({ ...snapshot.val(), id: snapshot.key })
      } else {
        router.push("/branch-management")
      }
      setIsLoading(false)
    })

    return () => off(branchRef)
  }, [database, user, id, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#a0a0a00d] flex">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col flex-1">
          <TopNav />
          <main className="p-8 space-y-8"><Skeleton className="h-64 w-full rounded-2xl" /></main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#a0a0a00d] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500">
          
          {/* Branded Header */}
          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <Button 
                  variant="ghost" 
                  onClick={() => router.push("/branch-management")}
                  className="h-10 w-10 p-0 rounded-full border border-zinc-100 hover:bg-zinc-50"
                >
                  <ArrowLeft className="w-4 h-4 text-black" />
                </Button>
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-black tracking-tight">{branch?.branchName} BRANCH Report</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] font-bold text-black tracking-widest">
                    <span>Branch Code: <span className="text-black">{branch?.branchCode}</span></span>
                    <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                    <span>Manager: <span className="text-black">{branch?.managerName}</span></span>
                    <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                    <span>Contact: <span className="text-black">{branch?.phone}</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-none">
                <ReportActionBtn icon={<FileSpreadsheet className="w-4 h-4" />} label="Export Students" color="text-black" />
                <ReportActionBtn icon={<Wallet className="w-4 h-4" />} label="Export Payments" color="text-black" />
                <ReportActionBtn icon={<MessageSquare className="w-4 h-4" />} label="Export Inquiries" color="text-black" />
              </div>
            </div>
          </Card>

          {/* Date Filter Bar */}
          <Card className="border-none shadow-sm rounded-2xl bg-white p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3 text-[14px] font-bold text-black tracking-widest shrink-0">
              <Filter className="w-4 h-4" /> Filter by Date Range
            </div>
            <div className="flex items-center gap-4 flex-1 w-full">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-300" />
                <Input type="text" placeholder="From Date" className="pl-10 h-10 border-zinc-100 rounded-xl text-[14px] font-bold transition-none" />
              </div>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-300" />
                <Input type="text" placeholder="To Date" className="pl-10 h-10 border-zinc-100 rounded-xl text-[14px] font-bold transition-none" />
              </div>
              <Button variant="ghost" className="h-10 px-6 rounded-xl font-bold text-[14px] text-black hover:bg-zinc-50 border border-zinc-50">Clear Dates</Button>
            </div>
          </Card>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PerformanceCard title="Total Students" value="0" subValue="Active: 0" trend="15% MoM" icon={<Users />} color="text-black" />
            <PerformanceCard title="Total Inquiries" value="0" subValue="Converted: 0 (0%)" trend="Lost: 0" icon={<MessageSquare />} color="text-black" />
            <PerformanceCard title="Total Collection" value="₹0" subValue="Avg per Student: ₹0" trend="22% YoY Growth" icon={<Wallet />} color="text-black" />
            <PerformanceCard title="Performance Metrics" value="0%" subValue="Dropout Rate" trend="Graduated: 0" icon={<TrendingUp />} color="text-black" />
          </div>

          {/* Detailed Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-auto p-0 flex-wrap justify-start gap-4 mb-8">
              <ReportTabTrigger value="overview" label="Overview & Charts" />
              <ReportTabTrigger value="students" label="Students Management" />
              <ReportTabTrigger value="financials" label="Financials & Payments" />
              <ReportTabTrigger value="leads" label="Inquiries & Leads" />
            </TabsList>

            <TabsContent value="overview" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard 
                  title="Student Gender Distribution" 
                  description="Breakdown of students by gender for better demographic insights"
                >
                  <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={[
                            { name: 'Male', value: 45 },
                            { name: 'Female', value: 55 }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#0D9488" />
                          <Cell fill="#6366F1" />
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard 
                  title="Course Enrollment Distribution" 
                  description="Popular courses and enrollment trends to help in resource allocation"
                >
                  <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-zinc-50 rounded-2xl bg-zinc-50/30">
                    <p className="text-[14px] font-bold text-zinc-300 tracking-widest">No enrollment data available</p>
                  </div>
                </ChartCard>
              </div>
            </TabsContent>

            <TabsContent value="students" className="mt-0">
              <Card className="border-none shadow-sm rounded-2xl bg-white p-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-200">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-[14px] font-bold text-black tracking-widest">No student records found for this branch</p>
              </Card>
            </TabsContent>
          </Tabs>

        </main>
      </div>
    </div>
  )
}

function ReportActionBtn({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
  return (
    <Button variant="outline" className={cn("h-11 rounded-xl px-5 gap-2.5 font-bold text-[14px] border-zinc-100 hover:bg-zinc-50 transition-none whitespace-nowrap", color)}>
      {icon} {label}
    </Button>
  )
}

function PerformanceCard({ title, value, subValue, trend, icon, color }: { title: string, value: string, subValue: string, trend: string, icon: React.ReactNode, color: string }) {
  return (
    <Card className="border-none shadow-sm rounded-2xl p-6 bg-white space-y-6">
      <div className="flex items-center gap-3 text-black">
        <div className="w-4 h-4">{icon}</div>
        <span className="text-[10px] font-bold tracking-widest">{title}</span>
      </div>
      <div className="space-y-1">
        <h3 className={cn("text-3xl font-black tracking-tight", color)}>{value}</h3>
        <p className="text-[11px] font-bold text-black">{subValue}</p>
      </div>
      <div className="pt-4 border-t border-zinc-50 flex items-center gap-2 text-[#0D9488]">
        <TrendingUp className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black tracking-widest">{trend}</span>
      </div>
    </Card>
  )
}

function ReportTabTrigger({ value, label }: { value: string, label: string }) {
  return (
    <TabsTrigger 
      value={value} 
      className="h-12 px-8 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#0D9488] data-[state=active]:shadow-lg data-[state=active]:shadow-teal-900/5 text-black font-bold text-[14px] border border-transparent data-[state=active]:border-teal-50 transition-all"
    >
      {label}
    </TabsTrigger>
  )
}

function ChartCard({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm rounded-2xl bg-white p-8 space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-black">{title}</h3>
        <p className="text-[14px] text-black leading-relaxed">{description}</p>
      </div>
      {children}
    </Card>
  )
}
