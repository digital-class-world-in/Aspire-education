"use client"

import { useState } from "react"
import { 
  LayoutDashboard, 
  Building2, 
  Wallet, 
  ShieldCheck, 
  LogOut,
  Settings,
  ChevronRight,
  Zap,
  Globe,
  BellRing,
  Activity,
  Award,
  Layers,
  Database,
  MonitorDot,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"

const superMenu = [
  { id: 'dashboard', name: 'Dashboard', href: '/super/dashboard', icon: LayoutDashboard, color: "text-blue-500" },
  { 
    id: 'institutes', 
    name: 'Clients', 
    href: '/super/institutes', 
    icon: Building2, 
    color: "text-emerald-500",
    subItems: [
      { id: 'white_label', name: 'White Label Clients', href: '/super/institutes?type=white-label', icon: Globe },
      { id: 'subscription', name: 'Subscription Clients', href: '/super/institutes?type=MonitorDot', icon: MonitorDot },
      { id: 'all_clients', name: 'All Clients', href: '/super/institutes', icon: Users },
    ]
  },
  { id: 'dynamic_fields', name: 'Dynamic Fields', href: '/super/dynamic-fields', icon: Database, color: "text-purple-500" },
  { id: 'projects', name: 'All Projects', href: '/super/projects', icon: Layers, color: "text-indigo-500" },
  { id: 'custom_certificates', name: 'Custom Certificates', href: '/super/custom-certificates', icon: Award, color: "text-amber-500" },
  { id: 'settings', name: 'SaaS Config', href: '#', icon: Settings, color: "text-zinc-500" },
]

export function SuperSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const handleLogout = () => {
    localStorage.removeItem('super_session')
    router.push("/super/login")
  }

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-[300px] lg:fixed lg:inset-y-0 bg-white z-50 font-public-sans border-r border-zinc-200">
      <div className="h-20 flex items-center px-8 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-zinc-800 font-headline uppercase leading-none">DASHBOARD</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Network Hub</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-8 space-y-8 scrollbar-none">
        <div>
          <p className="px-4 mb-4 text-[10px] font-black text-zinc-400 tracking-[0.3em] uppercase">Architecture</p>
          <nav className="space-y-0.5">
            {superMenu.map((item) => {
              const Icon = item.icon
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isActive = pathname === item.href || item.subItems?.some(s => pathname === s.href.split('?')[0])
              const isOpen = openMenu === item.id

              return (
                <div key={item.id} className="space-y-1">
                  <Link 
                    href={item.href}
                    onClick={() => {
                      if (hasSubItems) {
                        setOpenMenu(isOpen ? null : item.id)
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-bold transition-all group border border-transparent whitespace-nowrap",
                      isActive 
                        ? "bg-white border-zinc-200 text-black shadow-sm" 
                        : "text-zinc-500 hover:text-primary hover:bg-zinc-50"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-black" : (item.color || "text-zinc-400 group-hover:text-primary"))} />
                    <span className="flex-1">{item.name}</span>
                    {hasSubItems && <ChevronRight className={cn("w-3 h-3 transition-transform text-zinc-300", isOpen && "rotate-90")} />}
                  </Link>

                  {hasSubItems && isOpen && (
                    <div className="pl-10 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-300">
                      {item.subItems?.map((sub) => (
                        <Link
                          key={sub.id}
                          href={sub.href}
                          className={cn(
                            "flex items-center gap-2.5 py-2 px-3 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap",
                            pathname + (typeof window !== 'undefined' ? window.location.search : '') === sub.href
                              ? "text-primary bg-primary/5 shadow-sm"
                              : "text-zinc-400 hover:text-primary hover:bg-zinc-50"
                          )}
                        >
                          <sub.icon className="w-4 h-4 shrink-0" />
                          <span>{sub.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        <div className="pt-8 border-t border-zinc-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-bold text-rose-500 hover:bg-rose-50 transition-all border border-transparent whitespace-nowrap"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Terminate Hub Session</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <Card className="bg-white border border-zinc-200 rounded-2xl p-6 text-zinc-800 relative overflow-hidden group shadow-sm transition-all hover:border-primary/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#EAB308]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Node Status</span>
            </div>
            <h4 className="text-xl font-black uppercase tracking-tighter text-emerald-600">OPTIMAL</h4>
          </div>
        </Card>
      </div>
    </div>
  )
}
