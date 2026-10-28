
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  History,
  CreditCard,
  Calendar,
  X,
  Loader2,
  ShieldCheck
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, update, push } from "firebase/database"
import { differenceInDays, parseISO, format, addYears } from "date-fns"
import { cn } from "@/lib/utils"
import { OnboardingPopup } from "@/components/onboarding/plan-popup"

export default function BillingPage() {
  const { database } = useFirebase()
  const { user } = useUser()

  const [profile, setProfile] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

  useEffect(() => {
    if (!database || !user) return

    const rootPath = `Institutes/${user.uid}`
    const profileRef = ref(database, `${rootPath}/profile`)
    const invoicesRef = ref(database, `${rootPath}/invoices`)

    const unsubProfile = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.val())
      }
      setIsLoading(false)
    })

    const unsubInvoices = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setInvoices(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      } else {
        setInvoices([])
      }
    })

    return () => {
      off(profileRef)
      off(invoicesRef)
    }
  }, [database, user])

  const daysRemaining = useMemo(() => {
    if (!profile?.planExpiryDate) return 0
    const diff = differenceInDays(parseISO(profile.planExpiryDate), new Date())
    return Math.max(0, diff)
  }, [profile])

  const isTrial = profile?.currentPlan?.toLowerCase().includes('trial')

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans text-black">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto w-full pb-32">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-10xl font-black text-black tracking-tight">Billing & Accounts</h2>
              {/* <p className="text-[14px] text-black font-medium">Manage your subscription and invoice history</p> */}
            </div>

            {/* <Button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-black text-[14px] tracking-widest gap-2 border-none transition-all shadow-lg active:scale-95"
            >
              <Sparkles className="h-4 w-4" /> Upgrade Plan
            </Button> */}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8 space-y-8">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
                <div className="h-2 w-full bg-primary" />
                <div className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                      {isTrial ? <Calendar className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-black tracking-tight leading-none mb-2">
                        {profile?.currentPlan || 'Academic Node'}
                      </h3>
                      <p className="text-[14px] text-black font-bold tracking-widest">
                        {isTrial
                          ? `Trial days remaining: ${daysRemaining} days`
                          : `Next renewal on ${profile?.planExpiryDate ? format(parseISO(profile.planExpiryDate), "MMM dd, yyyy") : 'Not Scheduled'}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-xl font-black text-primary">₹</span>
                      <span className="text-5xl font-black text-black tracking-tighter">
                        {isTrial ? '0' : Number(profile?.netFees || 0).toLocaleString()}
                      </span>
                      {!isTrial && <span className="text-[14px] font-bold text-black tracking-widest ml-1">/Period</span>}
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none text-[9px] font-black tracking-widest px-4 py-1.5 rounded-full">Active Account</Badge>
                  </div>
                </div>
              </Card>

              {/* <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="px-10 py-8 border-b border-zinc-50 flex items-center justify-between">
                  <h3 className="font-black text-black text-[14px] tracking-[0.2em]">Disbursement Records</h3>
                  <History className="w-5 h-5 text-zinc-200" />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-zinc-100 hover:bg-transparent">
                        <TableHead className="text-[10px] font-black text-black tracking-widest h-14 pl-10">Invoice ID</TableHead>
                        <TableHead className="text-[10px] font-black text-black tracking-widest h-14">Date</TableHead>
                        <TableHead className="text-[10px] font-black text-black tracking-widest h-14">Plan Tier</TableHead>
                        <TableHead className="text-[10px] font-black text-black tracking-widest h-14 text-right">Amount</TableHead>
                        <TableHead className="text-right pr-10 text-[10px] font-black text-black tracking-widest h-14">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.length > 0 ? (
                        invoices.map((inv) => (
                          <TableRow key={inv.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none">
                            <TableCell className="text-[14px] font-black text-black font-public-sans pl-10">{inv.invoiceId}</TableCell>
                            <TableCell className="text-[14px] text-black font-medium font-public-sans">{inv.date}</TableCell>
                            <TableCell className="text-[14px] text-black font-bold">{inv.plan}</TableCell>
                            <TableCell className="text-right text-[14px] font-black text-black">
                              ₹{Number(inv.amount).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right pr-10">
                              <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none text-[9px] font-black px-3 py-1">
                                {inv.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center space-y-4">
                              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200">
                                <History className="w-8 h-8" />
                              </div>
                              <p className="text-[14px] font-black text-zinc-300 tracking-widest">No invoice history found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card> */}
            </div>

            {/* <div className="xl:col-span-4 space-y-8">
              <Card className="border-none shadow-xl rounded-[40px] bg-zinc-900 p-10 text-white relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight leading-none">Need Support?</h3>
                  </div>
                  <p className="text-[14px] text-black leading-relaxed font-medium">
                    Having issues with your institutional subscription or transaction processing? Our specialized billing node is online 24/7.
                  </p>
                  <Button className="w-full bg-white text-black hover:bg-zinc-100 font-black rounded-2xl h-14 transition-all active:scale-95 border-none shadow-lg text-[10px] tracking-[0.2em]">
                    Contact Billing Desk
                  </Button>
                </div>
              </Card>

              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-[10px] font-black tracking-[0.2em] text-black">Node Compliance</h4>
                </div>
                <p className="text-[14px] text-black font-medium leading-relaxed">All transactions are encrypted using enterprise-grade SSL protocols and synchronized across the institutional cloud network.</p>
              </Card>
            </div> */}
          </div>

          {/* 💎 UPGRADE POPUP MODAL INTEGRATION */}
          {isUpgradeModalOpen && (
            <OnboardingPopup
              instituteName={profile?.instituteName || "Your Institute"}
              hideStarter={true}
              onClose={() => setIsUpgradeModalOpen(false)}
            />
          )}
        </main>
      </div>
    </div>
  )
}
