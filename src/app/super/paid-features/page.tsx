"use client"

import { useState, useEffect } from "react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, set, get } from "firebase/database"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Gem, Globe, Plus, Building2, Calendar, CheckCircle2,
  Clock, XCircle, ToggleLeft, ToggleRight, Loader2, ArrowRight,
  Sparkles, CreditCard, Shield, Zap, Star, ChevronDown, Search,
  X, Eye, EyeOff, AlertCircle, RefreshCw
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// ── Paid Feature Definitions ──────────────────────────────────────────────────

const PAID_FEATURES = [
  {
    key: "website_builder",
    name: "Website Builder",
    description: "AI-powered website builder that creates a professional institute website through intelligent Q&A",
    icon: Globe,
    price: 4999,
    billingOptions: ["One-time", "Monthly", "Yearly"],
    defaultBilling: "One-time",
    color: "from-violet-500 to-purple-600",
    bgLight: "from-violet-50 to-purple-50",
    border: "border-violet-200",
    iconBg: "bg-violet-100 text-violet-600",
    badge: "AI Powered",
    badgeColor: "bg-violet-100 text-violet-700",
    features: ["AI Chat Interface", "3 Premium Templates", "Live Preview", "Multi-page Website", "Firebase Publishing"],
    status: "active" as const
  }
]

export default function PaidFeaturesPage() {
  const { database } = useFirebase()
  const { user } = useUser()

  const [institutes, setInstitutes] = useState<any[]>([])
  const [assignData, setAssignData] = useState<Record<string, any>>({})
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [instituteSearch, setInstituteSearch] = useState("")

  // Assign form state
  const [assignForm, setAssignForm] = useState({
    instituteId: "",
    expiryDate: "",
    paymentStatus: "paid" as "paid" | "pending",
    showInSidebar: true,
    showAsDashboardCard: true,
    billingType: "One-time",
    credits: 50
  })

  // Top-up form state
  const [topupModal, setTopupModal] = useState({
    isOpen: false,
    instituteId: "",
    instituteName: "",
    currentCredits: 0,
    amount: 10
  })

  // Fetch all institutes
  useEffect(() => {
    if (!database) return
    const instRef = ref(database, "Institutes")
    onValue(instRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        const list = Object.keys(data).map(k => ({
          id: k,
          name: data[k]?.profile?.instituteName || "Unknown Institute",
          email: data[k]?.profile?.email || "",
          status: data[k]?.profile?.status || "Active",
          paidFeatures: data[k]?.paidFeatures || {}
        }))
        setInstitutes(list)
      }
    })
  }, [database])

  // Fetch all paid feature assignments across institutes
  useEffect(() => {
    if (!database) return
    const instRef = ref(database, "Institutes")
    onValue(instRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        const compiled: Record<string, any> = {}
        Object.keys(data).forEach(id => {
          if (data[id]?.paidFeatures) {
            compiled[id] = data[id].paidFeatures
          }
        })
        setAssignData(compiled)
      }
    })
  }, [database])

  const openAssignModal = (feature: typeof PAID_FEATURES[0]) => {
    setSelectedFeature(feature)
    setAssignForm({
      instituteId: "",
      expiryDate: "",
      paymentStatus: "paid",
      showInSidebar: true,
      showAsDashboardCard: true,
      billingType: feature.defaultBilling,
      credits: 50
    })
    setIsAssignModalOpen(true)
  }

  const handleAssign = async () => {
    if (!database || !assignForm.instituteId || !selectedFeature) return
    setIsSubmitting(true)
    try {
      const path = `Institutes/${assignForm.instituteId}/paidFeatures/${selectedFeature.key}`
      await set(ref(database, path), {
        active: true,
        assignedAt: Date.now(),
        expiresAt: assignForm.expiryDate ? new Date(assignForm.expiryDate).getTime() : null,
        paymentStatus: assignForm.paymentStatus,
        showInSidebar: assignForm.showInSidebar,
        showAsDashboardCard: assignForm.showAsDashboardCard,
        billingType: assignForm.billingType,
        assignedBy: user?.email || "super_admin",
        featureName: selectedFeature.name,
        featureKey: selectedFeature.key,
        price: selectedFeature.price,
        credits: Number(assignForm.credits) || 0
      })

      // Sync with Website Builder credits
      if (selectedFeature.key === 'website_builder') {
        await set(ref(database, `Institutes/${assignForm.instituteId}/websiteBuilder/credits`), Number(assignForm.credits) || 0)
      }

      // Log activity
      await set(ref(database, `Institutes/${assignForm.instituteId}/activityLogs/${Date.now()}`), {
        action: "PAID_FEATURE_ASSIGNED",
        user: user?.email || "Super Admin",
        description: `Paid feature "${selectedFeature.name}" assigned to institute`,
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        timestamp: Date.now()
      })

      toast({ title: "Feature Assigned ✅", description: `${selectedFeature.name} has been activated for the selected institute.` })
      setIsAssignModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Assignment Failed", description: "Could not assign the feature. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async (instituteId: string, featureKey: string) => {
    if (!database) return
    try {
      await update(ref(database, `Institutes/${instituteId}/paidFeatures/${featureKey}`), {
        active: false,
        showInSidebar: false,
        revokedAt: Date.now()
      })
      toast({ title: "Feature Revoked", description: "The feature has been deactivated for this institute." })
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    }
  }

  const handleTopup = async () => {
    if (!database || !topupModal.instituteId) return
    setIsSubmitting(true)
    try {
      const newCredits = (topupModal.currentCredits || 0) + Number(topupModal.amount)
      
      // Update in features
      await update(ref(database, `Institutes/${topupModal.instituteId}/paidFeatures/website_builder`), {
        credits: newCredits
      })

      // Sync with Website Builder credits
      await set(ref(database, `Institutes/${topupModal.instituteId}/websiteBuilder/credits`), newCredits)

      toast({ 
        title: "Credits Added 💎", 
        description: `Successfully added ${topupModal.amount} credits to ${topupModal.instituteName}. Total: ${newCredits}` 
      })
      setTopupModal(prev => ({ ...prev, isOpen: false }))
    } catch (e) {
      toast({ variant: "destructive", title: "Top-up Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Count active assignments per feature
  const getActiveCount = (featureKey: string) => {
    return Object.values(assignData).filter((feats: any) => feats?.[featureKey]?.active === true).length
  }

  // Get institutes assigned to a feature
  const getAssignedInstitutes = (featureKey: string) => {
    return institutes.filter(inst => assignData[inst.id]?.[featureKey]?.active === true)
  }

  const filteredInstitutes = institutes.filter(i =>
    i.name.toLowerCase().includes(instituteSearch.toLowerCase()) ||
    i.email.toLowerCase().includes(instituteSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Gem className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">Paid Features</h1>
            <p className="text-sm text-slate-500">Manage premium features and assign them to institutes</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { label: "Total Features", value: PAID_FEATURES.length, icon: Gem, color: "text-violet-600 bg-violet-50" },
            { label: "Active Assignments", value: getActiveCount("website_builder"), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
            { label: "Pending Payments", value: Object.values(assignData).filter((f: any) => f?.website_builder?.paymentStatus === "pending").length, icon: Clock, color: "text-amber-600 bg-amber-50" }
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature Cards ── */}
      <div className="space-y-6">
        {PAID_FEATURES.map(feature => {
          const assignedInstitutes = getAssignedInstitutes(feature.key)
          const Icon = feature.icon

          return (
            <div key={feature.key} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Feature Header */}
              <div className={cn("p-6 bg-gradient-to-r", feature.bgLight)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm", feature.iconBg)}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-slate-800">{feature.name}</h2>
                        <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", feature.badgeColor)}>
                          {feature.badge}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 max-w-lg">{feature.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-slate-800">₹{feature.price.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 font-medium">{feature.defaultBilling}</div>
                  </div>
                </div>

                {/* Feature tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {feature.features.map(f => (
                    <span key={f} className="flex items-center gap-1 text-xs font-medium bg-white/70 border border-white rounded-full px-3 py-1 text-slate-600">
                      <Sparkles className="w-3 h-3 text-violet-500" />
                      {f}
                    </span>
                  ))}
                </div>

                {/* Action */}
                <div className="flex items-center gap-3 mt-5">
                  <Button
                    onClick={() => openAssignModal(feature)}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl shadow-md shadow-violet-200 border-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Assign to Institute
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span><span className="font-bold text-slate-700">{assignedInstitutes.length}</span> institutes active</span>
                  </div>
                </div>
              </div>

              {/* Assigned Institutes Table */}
              {assignedInstitutes.length > 0 && (
                <div className="divide-y divide-slate-50">
                  <div className="px-6 py-3 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Institutes</p>
                    <Badge variant="secondary" className="text-xs">{assignedInstitutes.length} active</Badge>
                  </div>
                  {assignedInstitutes.map(inst => {
                    const feat = assignData[inst.id]?.[feature.key]
                    return (
                      <div key={inst.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {inst.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{inst.name}</p>
                            <p className="text-xs text-slate-400">{inst.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {feat?.paymentStatus === "paid" ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                          {feat?.expiresAt && (
                            <span className="text-xs text-slate-400 font-medium">
                              Expires {format(new Date(feat.expiresAt), "MMM d, yyyy")}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevoke(inst.id, feature.key)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs h-8"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Revoke
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTopupModal({
                              isOpen: true,
                              instituteId: inst.id,
                              instituteName: inst.name,
                              currentCredits: feat?.credits || 0,
                              amount: 10
                            })}
                            className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs h-8"
                          >
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            Top up
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {assignedInstitutes.length === 0 && (
                <div className="px-6 py-8 text-center text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No institutes assigned yet</p>
                  <p className="text-xs mt-1">Click "Assign to Institute" to get started</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Assign Modal ── */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-0 shadow-2xl p-0 overflow-y-auto">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                {selectedFeature && <selectedFeature.icon className="w-5 h-5 text-white" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Assign {selectedFeature?.name}</DialogTitle>
                <DialogDescription className="text-violet-200 text-xs mt-0.5">Configure access settings for this institute</DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Institute Select */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Select Institute</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search institute..."
                  value={instituteSearch}
                  onChange={e => setInstituteSearch(e.target.value)}
                  className="pl-9 h-10 border-slate-200 rounded-xl"
                />
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {filteredInstitutes.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">No institutes found</div>
                ) : (
                  filteredInstitutes.map(inst => (
                    <button
                      key={inst.id}
                      onClick={() => setAssignForm(f => ({ ...f, instituteId: inst.id }))}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors",
                        assignForm.instituteId === inst.id && "bg-violet-50 border-l-2 border-violet-500"
                      )}
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {inst.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{inst.name}</p>
                        <p className="text-xs text-slate-400 truncate">{inst.email}</p>
                      </div>
                      {assignForm.instituteId === inst.id && (
                        <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Billing Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Billing Type</Label>
                <Select value={assignForm.billingType} onValueChange={v => setAssignForm(f => ({ ...f, billingType: v }))}>
                  <SelectTrigger className="h-10 border-slate-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFeature?.billingOptions.map((opt: string) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Credits Included</Label>
                <Input
                  type="number"
                  value={assignForm.credits}
                  onChange={e => setAssignForm(f => ({ ...f, credits: e.target.value }))}
                  className="h-10 border-slate-200 rounded-xl"
                  placeholder="e.g. 50"
                />
              </div>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Payment Status</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["paid", "pending"] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setAssignForm(f => ({ ...f, paymentStatus: status }))}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all",
                      assignForm.paymentStatus === status
                        ? status === "paid"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {status === "paid" ? <><CheckCircle2 className="inline w-3.5 h-3.5 mr-1.5" />Paid</> : <><Clock className="inline w-3.5 h-3.5 mr-1.5" />Pending</>}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility Toggles */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visibility Settings</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Show in Sidebar</p>
                  <p className="text-xs text-slate-400">Institute will see this in their navigation</p>
                </div>
                <Switch
                  checked={assignForm.showInSidebar}
                  onCheckedChange={v => setAssignForm(f => ({ ...f, showInSidebar: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Show as Dashboard Card</p>
                  <p className="text-xs text-slate-400">Show a card on the institute dashboard</p>
                </div>
                <Switch
                  checked={assignForm.showAsDashboardCard}
                  onCheckedChange={v => setAssignForm(f => ({ ...f, showAsDashboardCard: v }))}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!assignForm.instituteId || isSubmitting}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl border-0 shadow-md shadow-violet-200"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gem className="w-4 h-4 mr-2" />}
                Assign Feature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Top-up Modal ── */}
      <Dialog open={topupModal.isOpen} onOpenChange={v => setTopupModal(f => ({ ...f, isOpen: v }))}>
        <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-y-auto">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-6 text-white text-center">
            <Zap className="w-12 h-12 mx-auto mb-3 text-emerald-200" />
            <DialogTitle className="text-xl font-bold">Add Credits</DialogTitle>
            <DialogDescription className="text-emerald-100 opacity-80 mt-1">
              Give additional building power to {topupModal.instituteName}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Balance</p>
                  <p className="text-2xl font-black text-slate-800">{topupModal.currentCredits} <span className="text-sm font-normal text-slate-400">Credits</span></p>
               </div>
               <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Gem className="w-6 h-6 text-amber-600" />
               </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700">Top-up Amount</Label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map(val => (
                  <button 
                    key={val} 
                    onClick={() => setTopupModal(f => ({ ...f, amount: val }))}
                    className={cn(
                      "py-2 rounded-xl border text-sm font-bold transition-all",
                      topupModal.amount === val ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                    )}
                  >
                    +{val}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                value={topupModal.amount}
                onChange={e => setTopupModal(f => ({ ...f, amount: Number(e.target.value) }))}
                className="h-12 border-slate-200 rounded-xl text-lg font-bold"
                placeholder="Enter custom amount"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setTopupModal(f => ({ ...f, isOpen: false }))}
                className="flex-1 h-12 rounded-xl border border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTopup}
                disabled={isSubmitting || topupModal.amount <= 0}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Add Credits
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
