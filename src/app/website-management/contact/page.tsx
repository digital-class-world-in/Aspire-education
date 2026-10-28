
"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Save, 
  Loader2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Info,
  Eye
} from "lucide-react"
import Link from "next/link"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, off } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { format } from "date-fns"

export default function ContactManagementPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const pathname = usePathname()
  const { resolvedId, isLoading: idLoading } = useResolvedId()

  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')
  const id = resolvedId || user?.uid || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [contact, setContact] = useState<any>({
    phone: "",
    email: "",
    address: ""
  })

  useEffect(() => {
    if (!database || !id) return
    const rootPath = `Institutes/${id}/website_settings/contact`
    
    const unsubContact = onValue(ref(database, rootPath), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setContact(data)
      } else {
        // Fallback to profile if website specific contact not set
        const profileRef = ref(database, `Institutes/${id}/profile`)
        onValue(profileRef, (pSnap) => {
          const p = pSnap.val()
          if (p) {
            setContact({
              phone: p.phone || "",
              email: p.email || "",
              address: p.address || ""
            })
          }
        }, { onlyOnce: true })
      }
      setIsLoading(false)
    })
    
    return () => {
      unsubContact()
    }
  }, [database, user?.uid])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !id) return
    setIsSaving(true)
    try {
      await update(ref(database, `Institutes/${id}/website_settings/contact`), contact)
      toast({ title: "Contact synced", description: "Information updated on your public portal." })
    } catch (e) {
      toast({ variant: "destructive", title: "Sync failed" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || idLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing node connection...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 w-full overflow-x-hidden", !isPortal && "lg:pl-[300px]")}>
        {!isPortal && <TopNav />}
        <main className={cn("flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full font-public-sans text-[15px] font-bold text-black", !isPortal ? "pb-32" : "pt-4 pb-10")}>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Contact & seo setup</h2>
              <p className="text-[14px] text-black font-medium mt-1">Configure campus contact points and search metadata</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                asChild
                className="h-11 px-6 rounded-xl font-bold text-[14px] gap-2 border-zinc-200 bg-white hover:bg-zinc-50 shadow-sm text-black"
              >
                <Link href="/" target="_blank">
                  <Eye className="h-4 w-4" />
                  Preview Website
                </Link>
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="h-4 w-4" />} {isSaving ? "Syncing..." : "Save configuration"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-10">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 space-y-10">
                <div className="flex items-center gap-4 border-b border-zinc-50 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary shadow-inner">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-normal text-black font-public-sans">Public contact deck</h3>
                    <p className="text-[11px] font-bold text-black tracking-[0.2em]">Admission desk data</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Phone inquiries</Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                      <Input 
                        value={contact.phone}
                        onChange={(e) => setContact({...contact, phone: e.target.value})}
                        placeholder="9601737959"
                        className="pl-12 h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold text-black text-[15px] focus-visible:ring-1 focus-visible:ring-black" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Email support</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                      <Input 
                        value={contact.email}
                        onChange={(e) => setContact({...contact, email: e.target.value})}
                        placeholder="support@institute.com"
                        className="pl-12 h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold text-black text-[15px] focus-visible:ring-1 focus-visible:ring-black" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[15px] font-bold text-black tracking-widest ml-1">Campus address</Label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-4 h-4 w-4 text-zinc-300 group-focus-within:text-black transition-colors" />
                      <Textarea 
                        value={contact.address}
                        onChange={(e) => setContact({...contact, address: e.target.value})}
                        placeholder="Official physical address..."
                        className="pl-12 pt-4 rounded-3xl border-zinc-100 bg-zinc-50/50 font-bold text-black text-[15px] focus-visible:ring-1 focus-visible:ring-black min-h-[120px]" 
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-8">
              <Card className="border-none shadow-sm rounded-[32px] bg-zinc-900 p-10 text-white relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 space-y-10">
                  <div className="space-y-4">
                    <Badge className="bg-white/10 text-white border-none text-[11px] font-bold tracking-widest px-3">Live status</Badge>
                    <h3 className="text-2xl font-black tracking-tight">Sync status</h3>
                  </div>
                  <div className="space-y-6">
                    <StatusItem icon={<Globe />} label="Global node" value="Synchronized" color="text-emerald-400" />
                    <ShieldCheck className="w-10 h-10 text-blue-400 opacity-20 absolute bottom-10 right-10" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40"><CheckCircle2 className="w-5 h-5" /></div>
                      <div>
                        <p className="text-[11px] font-bold text-black tracking-widest">Last update</p>
                        <p className="text-[15px] font-bold tracking-tight text-black">{format(new Date(), "p")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-zinc-300" />
                  <h4 className="text-[11px] font-bold text-black tracking-widest">Visibility note</h4>
                </div>
                <p className="text-[15px] text-black leading-relaxed font-bold">These details will be displayed in the "Admission desk" section of your public website. Ensure they are correct for student engagement.</p>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function StatusItem({ icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold text-black tracking-widest">{label}</p>
        <p className={cn("text-[15px] font-bold  tracking-tight", color)}>{value}</p>
      </div>
    </div>
  )
}
