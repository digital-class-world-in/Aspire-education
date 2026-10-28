
"use client"

import { useState, useEffect } from "react"
import { Bell, Search, User, Globe, LayoutGrid, Clock, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { differenceInDays } from "date-fns"

export function SuperTopNav() {
  const [daysActive, setDaysActive] = useState(0)

  useEffect(() => {
    // Calculate days active from platform launch (e.g., Jan 1, 2024)
    const launchDate = new Date("2024-01-01")
    const diff = differenceInDays(new Date(), launchDate)
    setDaysActive(diff)
  }, [])

  return (
    <header className="h-20 bg-white border-b border-zinc-100 px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex-1 flex items-center gap-8">
        <div className="relative w-full max-w-xl group">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[#1e3a8a] transition-colors" />
          <Input 
            placeholder="Universal Search (Institutes, Payments, Leads)..." 
            className="w-full pl-12 h-11 bg-zinc-50 border-none rounded-xl text-xs font-bold text-zinc-700 transition-all focus-visible:ring-1 focus-visible:ring-[#1e3a8a] shadow-inner" 
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">System Active</span>
            <span className="text-sm font-black text-[#1e3a8a] uppercase">{daysActive} Days</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="p-2.5 text-zinc-400 hover:text-[#1e3a8a] bg-zinc-50 rounded-xl transition-all border-none">
            <Globe className="w-5 h-5" />
          </button>
          <button className="p-2.5 text-zinc-400 hover:text-[#1e3a8a] bg-zinc-50 rounded-xl transition-all border-none relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
          </button>
        </div>

        <div className="h-10 w-px bg-zinc-100" />

        <div className="flex items-center gap-4 bg-zinc-50 px-4 py-2 rounded-2xl border border-zinc-100 shadow-sm group">
          <div className="text-right">
            <p className="text-[10px] font-black text-zinc-800 uppercase tracking-tight leading-none">Super Admin</p>
            <p className="text-[8px] font-bold text-primary uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
              <ShieldCheck className="w-2.5 h-2.5" /> Global Hub
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
            SA
          </div>
        </div>
      </div>
    </header>
  )
}
