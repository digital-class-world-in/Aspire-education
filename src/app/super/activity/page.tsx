"use client"

import { useState, useEffect } from "react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { Activity, Building2, User, Clock, Search, Filter } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function SystemActivityPage() {
  const { database } = useFirebase()
  const [activities, setActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!database) return

    const institutesRef = ref(database, 'Institutes')
    
    onValue(institutesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        let allLogs: any[] = []

        Object.keys(data).forEach(instituteId => {
          const institute = data[instituteId]
          const instituteName = institute.profile?.instituteName || "Unknown Institute"

          // Check for standard activityLogs
          if (institute.activityLogs) {
            Object.keys(institute.activityLogs).forEach(logId => {
              const log = institute.activityLogs[logId]
              allLogs.push({
                id: logId,
                instituteId,
                instituteName,
                ...log
              })
            })
          }
        })

        // Sort descending by timestamp
        allLogs.sort((a, b) => b.timestamp - a.timestamp)
        setActivities(allLogs)
      }
      setIsLoading(false)
    })

    return () => {
      off(institutesRef)
    }
  }, [database])

  const activityBadgeColor = (action: string) => {
    const act = action?.toUpperCase() || ""
    if (act.includes("PAYMENT")) return "bg-emerald-50 text-emerald-600 border-emerald-200"
    if (act.includes("STATUS")) return "bg-amber-50 text-amber-600 border-amber-200"
    if (act.includes("MODULE") || act.includes("PERMISSION")) return "bg-purple-50 text-purple-600 border-purple-200"
    if (act.includes("CREATED") || act.includes("ADDED")) return "bg-blue-50 text-blue-600 border-blue-200"
    if (act.includes("DELETE") || act.includes("REMOVE")) return "bg-rose-50 text-rose-600 border-rose-200"
    return "bg-indigo-50 text-indigo-600 border-indigo-200"
  }

  const filteredActivities = activities.filter(act => {
    if (!searchQuery) return true
    const term = searchQuery.toLowerCase()
    return (
      act.instituteName?.toLowerCase().includes(term) ||
      act.action?.toLowerCase().includes(term) ||
      act.description?.toLowerCase().includes(term) ||
      act.user?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="flex-1 min-h-screen pb-20 p-8" style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          Institute System Activity
        </h1>
        <p className="text-[13px] font-medium text-slate-500 max-w-2xl">
          Real-time tracking of all modifications, updates, and module accesses across all client institutes.
        </p>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by institute name, action, or user..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 bg-slate-50 border-none rounded-xl text-[14px] font-medium focus-visible:ring-1 focus-visible:ring-indigo-500/30"
            />
          </div>
          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-2 whitespace-nowrap">
            <Activity className="w-4 h-4" />
            {activities.length} Total Records
          </Badge>
        </div>
      </Card>

      {/* Activity Timeline */}
      <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden">
        <div className="p-6 md:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-12 h-12">
                <div className="w-12 h-12 border-[3px] border-slate-100 rounded-full" />
                <div className="absolute inset-0 w-12 h-12 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-[13px] font-medium text-slate-500 mt-4">Loading system activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
                <Activity className="w-8 h-8" />
              </div>
              <p className="text-[15px] font-semibold text-slate-600 mb-1">No activities found</p>
              <p className="text-[13px] text-slate-400 font-medium max-w-sm">
                There are no system logs matching your current filters.
              </p>
            </div>
          ) : (
            <div className="relative pl-4 md:pl-8">
              {/* Vertical line */}
              <div className="absolute left-[35px] md:left-[51px] top-6 bottom-6 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />

              <div className="space-y-6">
                {filteredActivities.map((log, index) => (
                  <div key={log.id || index} className="relative flex items-start gap-4 md:gap-6 group">
                    
                    {/* Timestamp for Desktop (Left of line) */}
                    <div className="hidden md:block w-24 pt-2.5 text-right shrink-0">
                      <p className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                        {log.timestamp ? format(log.timestamp, "MMM dd") : ""}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                        {log.timestamp ? format(log.timestamp, "HH:mm") : ""}
                      </p>
                    </div>

                    {/* Node Dot */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center relative z-10 shrink-0 transition-all duration-300 border-2 mt-1",
                      index === 0
                        ? "bg-indigo-500 text-white border-indigo-100 shadow-md shadow-indigo-200"
                        : "bg-white text-slate-400 border-slate-100 group-hover:border-indigo-200 group-hover:text-indigo-500"
                    )}>
                      <Activity className="w-4 h-4" />
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 min-w-0 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-5 transition-all duration-200 group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:border-indigo-100/50">
                      
                      {/* Top Meta */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 max-w-full">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/60 shadow-sm text-[12px] font-bold text-slate-700 truncate">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{log.instituteName}</span>
                          </span>
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200 shrink-0",
                            activityBadgeColor(log.action)
                          )}>
                            {log.action || "UPDATE"}
                          </Badge>
                        </div>
                        
                        {/* Mobile Time */}
                        <div className="md:hidden flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <Clock className="w-3 h-3" />
                          {log.timestamp ? formatDistanceToNow(log.timestamp, { addSuffix: true }) : 'Just now'}
                        </div>
                      </div>

                      {/* Main Content */}
                      <p className="text-[14px] font-medium text-slate-800 leading-relaxed mb-3">
                        {log.description || "Updated system preferences"}
                      </p>

                      {/* Bottom Meta (User) */}
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 bg-white/60 w-fit px-2.5 py-1.5 rounded-lg border border-slate-100">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Executed by: <span className="text-slate-700">{log.user || "System/Unknown Admin"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

    </div>
  )
}
