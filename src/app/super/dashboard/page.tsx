
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  School, 
  Globe, 
  CreditCard, 
  UserX, 
  UserCheck, 
  BookOpen, 
  GitBranch, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  MoreVertical,
  Bell,
  Calendar,
  Filter,
  Link
} from "lucide-react"
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"

const signupData = [
  { name: 'Mon', count: 12 },
  { name: 'Tue', count: 18 },
  { name: 'Wed', count: 15 },
  { name: 'Thu', count: 25 },
  { name: 'Fri', count: 22 },
  { name: 'Sat', count: 30 },
  { name: 'Sun', count: 28 },
]

const revenueData = [
  { name: 'Jan', revenue: 45000 },
  { name: 'Feb', revenue: 52000 },
  { name: 'Mar', revenue: 48000 },
  { name: 'Apr', revenue: 61000 },
  { name: 'May', revenue: 55000 },
  { name: 'Jun', revenue: 67000 },
]

const planData = [
  { name: 'Basic', value: 400, color: '#6366f1' },
  { name: 'Pro', value: 300, color: '#22c55e' },
  { name: 'Enterprise', value: 300, color: '#f59e0b' },
]

export default function SuperDashboardPage() {
  const { database } = useFirebase()
  const [projects, setProjects] = useState<any[]>([])
  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database) return
    
    // Fetch Projects for Revenue aggregation
    const projectsRef = ref(database, 'MasterProjects')
    const unsubProjects = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val() || {}
      setProjects(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })

    // Fetch Institutes for Counts aggregation
    const institutesRef = ref(database, 'Institutes')
    const unsubInstitutes = onValue(institutesRef, (snapshot) => {
      const data = snapshot.val() || {}
      const instList = Object.keys(data).map(k => ({ 
        ...data[k].profile, 
        id: k,
        stats: data[k].Stats || {}
      }))
      setInstitutes(instList)
      setIsLoading(false)
    })

    return () => {
      off(projectsRef)
      off(institutesRef)
    }
  }, [database])

  const totals = useMemo(() => {
    let sales = 0
    projects.forEach(p => sales += (Number(p.totalAmount) || 0))
    
    const students = institutes.reduce((acc, current) => acc + (Number(current.stats?.totalStudents) || 0), 0)
    const branches = institutes.reduce((acc, current) => acc + (Number(current.stats?.branches) || 1), 0)
    const activeSubs = institutes.filter(i => i.status === 'Active').length
    const whiteLabels = institutes.filter(i => i.currentPlan === 'White Label Pro' || i.planType === 'White Label Pro').length
    const schools = institutes.length // Assuming each institute is a school node

    return { 
      sales, 
      students, 
      branches, 
      activeSubs, 
      whiteLabels, 
      schools,
      totalInstitutes: institutes.length
    }
  }, [projects, institutes])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-black font-medium animate-pulse">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Master Dashboard</h1>
          <p className="text-sm text-black font-medium">Platform-wide business metrics and overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 group focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all">
            <Search className="w-4 h-4 text-black" />
            <input type="text" placeholder="Search platform..." className="bg-transparent border-none outline-none text-sm text-black w-48 placeholder:text-black" />
          </div>
          <Link href="/super/institutes">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-sm font-medium">
              <Plus className="w-4 h-4" /> New Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Registered" value={totals.totalInstitutes.toLocaleString()} icon={<Building2Icon />} trend="+12.5%" trendUp={true} />
        <MetricCard label="Total Schools" value={totals.schools.toLocaleString()} icon={<School />} trend="+8.2%" trendUp={true} />
        <MetricCard label="White-Label Clients" value={totals.whiteLabels.toLocaleString()} icon={<Globe />} trend="+4.1%" trendUp={true} />
        <MetricCard label="Active SaaS Subs" value={totals.activeSubs.toLocaleString()} icon={<CreditCard />} trend="+15.3%" trendUp={true} />
        <MetricCard label="Suspended Accounts" value={institutes.filter(i => i.status === 'Suspended').length} icon={<UserX />} trend="-2.4%" trendUp={false} />
        <MetricCard label="Total Students" value={totals.students >= 1000 ? `${(totals.students/1000).toFixed(1)}k` : totals.students} icon={<UserCheck />} trend="+10.2%" trendUp={true} />
        <MetricCard label="Total Courses" value="12,450" icon={<BookOpen />} trend="+5.8%" trendUp={true} />
        <MetricCard label="Total Branches" value={totals.branches.toLocaleString()} icon={<GitBranch />} trend="+7.4%" trendUp={true} />
        <MetricCard label="Total Revenue" value={`₹${totals.sales.toLocaleString()}`} icon={<DollarSign />} trend="+22.1%" trendUp={true} />
        <MetricCard label="Projected MRR" value="₹12.4L" icon={<TrendingUp />} trend="+18.5%" trendUp={true} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Charts Section */}
        <div className="xl:col-span-2 space-y-8">
          {/* Signups and Revenue Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-black">Daily Signups</CardTitle>
                <CardDescription className="text-xs">User registration trends over last 7 days</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-black">Monthly Revenue</CardTitle>
                <CardDescription className="text-xs">Revenue distribution across platform</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Sales Reports Section */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-4 px-6">
              <div>
                <CardTitle className="text-base font-semibold text-black">Sales Reports</CardTitle>
                <CardDescription className="text-xs">Partner performance and commissions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs font-medium text-indigo-600 gap-1 hover:text-indigo-700 hover:bg-slate-50">
                View Full Report <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[11px] font-semibold text-black ">Partner Category</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-black ">Total Sales</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-black ">Commission</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-black ">Active Partners</th>
                      <th className="px-6 py-3 text-[11px] font-semibold text-black  text-right">Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[
                      { category: 'Distributors', sales: '₹4,20,000', comm: '15%', active: '24', growth: '+12%' },
                      { category: 'Franchisees', sales: '₹2,15,000', comm: '20%', active: '18', growth: '+8%' },
                      { category: 'White-Labels', sales: '₹8,45,000', comm: '10%', active: '12', growth: '+25%' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-black">{row.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-black">{row.sales}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none rounded-md px-2 py-0 text-[11px]">{row.comm}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 font-medium">{row.active}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-semibold text-emerald-600">{row.growth}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side Panel: Activity & More */}
        <div className="space-y-8">
          {/* Plan Wise Users (Pie Chart) */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-black">Plan Distribution</CardTitle>
              <CardDescription className="text-xs">User base by subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="h-[220px] flex items-center justify-center pt-0">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4">
                {planData.map((plan, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: plan.color }} />
                    <span className="text-[11px] font-medium text-slate-600 whitespace-nowrap">{plan.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Panel */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-black">Recent Activity</CardTitle>
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Bell className="w-4 h-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-[1.5px] before:bg-slate-100">
                <ActivityItem 
                  title="New Institute Signup" 
                  desc="Nirvana Education joined the platform" 
                  time="2 mins ago" 
                  icon={<div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center z-10 relative"><UserCheck className="w-3.5 h-3.5" /></div>} 
                />
                <ActivityItem 
                  title="Payment Received" 
                  desc="₹12,400 received from St. Mary High School" 
                  time="45 mins ago" 
                  icon={<div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center z-10 relative"><DollarSign className="w-3.5 h-3.5" /></div>} 
                />
                <ActivityItem 
                  title="System Alert" 
                  desc="Cloud storage space reaching 85% limit" 
                  time="2 hours ago" 
                  icon={<div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center z-10 relative"><Filter className="w-3.5 h-3.5" /></div>} 
                />
                <ActivityItem 
                  title="New Course Created" 
                  desc="Advanced Math for Grade 10" 
                  time="5 hours ago" 
                  icon={<div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center z-10 relative"><BookOpen className="w-3.5 h-3.5" /></div>} 
                />
              </div>
              <Button variant="ghost" className="w-full mt-6 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">View all activities</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, trend, trendUp }: any) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white group hover:shadow-md transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-black group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            {icon}
          </div>
          <div className={cn(
            "flex items-center gap-1 font-medium text-xs px-2 py-0.5 rounded-full",
            trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-[13px] font-medium text-black">{label}</p>
          <h3 className="text-2xl font-bold text-black mt-0.5">{value}</h3>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityItem({ title, desc, time, icon }: any) {
  return (
    <div className="flex gap-4">
      {icon}
      <div className="flex-1 -mt-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-black leading-none">{title}</span>
          <span className="text-[10px] font-medium text-black whitespace-nowrap">{time}</span>
        </div>
        <p className="text-xs text-black mt-1 line-clamp-1">{desc}</p>
      </div>
    </div>
  )
}

function Building2Icon() {
  return <Users className="w-5 h-5" />
}
