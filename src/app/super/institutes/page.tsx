
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Building2,
  MoreVertical,
  Plus,
  Trash2,
  Edit,
  Power,
  RefreshCw,
  CalendarDays,
  Activity,
  ArrowUpRight,
  UserPlus,
  Network,
  Layers,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  CreditCard,
  Package,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  GraduationCap,
  LogIn,
  Filter,
  Download,
  X,
  Save,
  TrendingUp,
  Users,
  Layers as LayersIcon,
  Rocket
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, remove, update, push, set, get } from "firebase/database"
import { cn } from "@/lib/utils"
import Link from "next/link"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"
import {
  DialogDescription,
  DialogFooter,
  DialogClose,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useSearchParams } from "next/navigation"

export default function ManageInstitutesPage() {
  const { database } = useFirebase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeFilter = searchParams.get('type') // 'white-label' or 'subscription'

  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  // States for Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Support Note & Status Warn
  const [isSupportNoteModalOpen, setIsSupportNoteModalOpen] = useState(false)
  const [supportNote, setSupportNote] = useState("")
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false)
  const [pendingStatusAction, setPendingStatusAction] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Real-time Detail States
  const [isModalEditing, setIsModalEditing] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [detailedStats, setDetailedStats] = useState<any>(null)
  const [editData, setEditData] = useState<any>({})

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // New Institute State
  const [newInstitute, setNewInstitute] = useState({
    instituteName: "",
    fullName: "",
    phone: "",
    email: "",
    plan: "trial",
    branchCount: 1
  })

  useEffect(() => {
    if (!database) return
    const instRef = ref(database, 'Institutes')
    const unsubscribe = onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({
        ...data[k].profile,
        id: k,
        raw: data[k],
        totalStudents: data[k].Stats?.totalStudents || 0,
        branches: data[k].Stats?.branches || 1,
      }))

      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      setInstitutes(list)
      setIsLoading(false)
    })
    return () => off(instRef)
  }, [database])

  const filtered = useMemo(() => {
    return institutes.filter(i => {
      // 1. Search Term
      const matchSearch = !searchTerm ||
        i.instituteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.email?.toLowerCase().includes(searchTerm.toLowerCase())

      // 2. Status Filter
      const matchStatus = filterStatus === 'all' || i.status === filterStatus

      // 3. Type Filter — exact plan-name bucketing
      let matchType = true
      const plan = (i.currentPlan || i.planType || "").toLowerCase().trim()

      // ── White Label ──────────────────────────────────────────────────────
      // Plans: enterprise, white label pro, wl
      const WHITE_LABEL_PLANS = ['enterprise', 'white label pro', 'wl', 'white-label pro', 'white-label-pro']

      // ── Subscription ─────────────────────────────────────────────────────
      // Plans: starter website, cloud erp (and any future subscription-like)
      const SUBSCRIPTION_PLANS = ['starter website', 'cloud erp', 'cloud-erp', 'pro', 'starter']

      // ── Trial ────────────────────────────────────────────────────────────
      // Plans: trial, start as a trial, start as trial, basic, blank/no plan
      const TRIAL_PLANS = ['trial', 'start as a trial', 'start as trial', 'start as starter (trial)', 'basic']

      if (typeFilter === 'white-label') {
        matchType = WHITE_LABEL_PLANS.some(p => plan === p)
      } else if (typeFilter === 'subscription') {
        matchType = SUBSCRIPTION_PLANS.some(p => plan === p)
      } else if (typeFilter === 'trial') {
        matchType = !plan || TRIAL_PLANS.some(p => plan === p)
      }

      return matchSearch && matchStatus && matchType
    })
  }, [institutes, searchTerm, filterStatus, typeFilter])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(i => ({
      "Institute Name": i.instituteName,
      "Owner": i.fullName,
      "Email": i.email,
      "Phone": i.phone,
      "Plan": i.currentPlan,
      "Status": i.status,
      "Registered On": i.createdAt
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Institutes")
    XLSX.writeFile(wb, "SaaS_Clients.xlsx")
  }

  const handleDelete = async (inst: any) => {
    if (!database) return
    if (!confirm(`Are you sure you want to delete "${inst.instituteName}"? All data will be lost.`)) return
    try {
      await remove(ref(database, `Institutes/${inst.id}`))
      if (inst.slug) await remove(ref(database, `Slugs/${inst.slug}`))
      toast({ title: "Client Removed", description: "The institute has been successfully deleted." })
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" })
    }
  }

  const handleStatusToggle = (inst: any) => {
    setPendingStatusAction({
      id: inst.id,
      name: inst.instituteName,
      currentStatus: inst.status || 'Active',
      targetStatus: inst.status === 'Suspended' ? 'Active' : 'Suspended'
    })
    setIsStatusConfirmOpen(true)
  }

  const confirmStatusToggle = async () => {
    if (!database || !pendingStatusAction) return
    setIsProcessing(true)
    try {
      await update(ref(database, `Institutes/${pendingStatusAction.id}/profile`), {
        status: pendingStatusAction.targetStatus,
        statusUpdatedAt: Date.now()
      })
      toast({ title: `Client ${pendingStatusAction.targetStatus}`, description: `Status updated successfully.` })
      setIsStatusConfirmOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setIsProcessing(false)
    }
  }

  const startSupportLogin = (inst: any) => {
    setSelectedClient(inst)
    setIsSupportNoteModalOpen(true)
  }

  const handleConfirmedLoginAsClient = async () => {
    if (!database || !selectedClient || !supportNote.trim()) {
      toast({ variant: "destructive", title: "Note Mandatory", description: "Please enter a reason for support access." })
      return
    }

    setIsProcessing(true)
    try {
      // 1. Log the Support Access
      const logRef = ref(database, `SupportLogs/${Date.now()}`)
      await update(logRef, {
        instituteId: selectedClient.id,
        instituteName: selectedClient.instituteName,
        agentName: "Super Admin", // Fallback, could be from session
        action: "Login as Client",
        notes: supportNote,
        timestamp: Date.now(),
        type: 'LOG_ENTRY'
      })

      // 2. Clear state and redirect
      localStorage.setItem('support_target_id', selectedClient.id)
      localStorage.setItem('support_target_name', selectedClient.instituteName)
      setIsSupportNoteModalOpen(false)
      setSupportNote("")
      window.open('/support-login', '_blank')
    } catch (e) {
      toast({ variant: "destructive", title: "Logging Failed" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLoginAsClient = (inst: any) => {
    // Save minimal info for support login bypass
    localStorage.setItem('support_target_id', inst.id)
    localStorage.setItem('support_target_name', inst.instituteName)
    window.open('/support-login', '_blank')
  }

  const handleOpenMasterCenter = (inst: any, forceEdit = false) => {
    if (forceEdit) {
      router.push(`/super/institutes/${inst.id}?edit=true`)
    } else {
      router.push(`/super/institutes/${inst.id}`)
    }
  }

  const handleSaveDetailedProfile = async () => {
    if (!database || !selectedClient) return
    setIsProcessing(true)
    try {
      await update(ref(database, `Institutes/${selectedClient.id}/profile`), {
        ...editData,
        updatedAt: Date.now()
      })
      toast({ title: "Profile Synchronized", description: "Client details updated successfully." })
      setIsModalEditing(false)
      // selectedClient will be updated by the onValue listener
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddInstitute = async () => {
    if (!database) return
    if (!newInstitute.instituteName || !newInstitute.email || !newInstitute.phone) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all required fields." })
      return
    }

    setIsProcessing(true)
    try {
      const newInstRef = push(ref(database, 'Institutes'))
      const id = newInstRef.key

      const slug = newInstitute.instituteName.toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '')
        + '-' + Math.random().toString(36).substring(2, 5) // Add random suffix to avoid collision

      const profileData = {
        instituteName: newInstitute.instituteName,
        fullName: newInstitute.fullName,
        phone: newInstitute.phone,
        email: newInstitute.email,
        currentPlan: newInstitute.plan,
        branches: Number(newInstitute.branchCount),
        status: 'Active',
        createdAt: new Date().toISOString(),
        slug: slug,
        moduleAccess: {
          dashboard: true,
          student_info: true,
          fees_collections: true,
          attendance: true,
          hr: true,
          examination: true
        }
      }

      await set(ref(database, `Institutes/${id}/profile`), profileData)
      if (slug) await set(ref(database, `Slugs/${slug}`), id)

      toast({ title: "Institute Created", description: `${newInstitute.instituteName} has been onboarded.` })
      setIsAddModalOpen(false)
      setNewInstitute({
        instituteName: "",
        fullName: "",
        phone: "",
        email: "",
        plan: "trial",
        branchCount: 1
      })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Creation Failed" })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-black font-medium">Loading client registry...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">
            {typeFilter === 'white-label' ? 'White Label Clients' :
              typeFilter === 'subscription' ? 'Subscription Clients' :
              typeFilter === 'trial' ? 'Trial Accounts' :
                'Client Management'}
          </h1>
          <p className="text-sm text-black font-medium">
            {typeFilter === 'white-label'
              ? 'Enterprise & White Label Pro clients — custom deployments'
              : typeFilter === 'subscription'
              ? 'Starter Website & Cloud ERP subscription holders'
              : typeFilter === 'trial'
              ? 'Institutes on free trial — monitor and convert them'
              : 'Manage and monitor all SaaS institute accounts'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {typeFilter === 'trial' && (
            <Button
              onClick={() => {
                setNewInstitute(prev => ({ ...prev, plan: 'trial' }))
                setIsAddModalOpen(true)
              }}
              variant="outline"
              className="h-10 px-4 rounded-xl font-semibold text-sm gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm transition-all whitespace-nowrap"
            >
              <Rocket className="h-4 w-4" /> Start as Trial
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} className="h-10 px-4 rounded-xl font-semibold text-sm gap-2 border-slate-200 bg-white text-black hover:bg-slate-50 shadow-sm transition-all whitespace-nowrap">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-md shadow-indigo-100 font-semibold text-sm transition-all active:scale-95 whitespace-nowrap">
            <Plus className="w-4.5 h-4.5" /> Add New Client
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-3 h-4 w-4 text-black group-focus-within:text-indigo-600 transition-colors" />
              <Input
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search clients by name, owner, or email..."
                className="pl-11 h-10.5 rounded-xl border-slate-200 bg-slate-50/30 font-medium text-sm focus-visible:ring-indigo-600/20"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
              {['all', 'Active', 'Suspended', 'Expired'].map(status => (
                <button
                  key={status}
                  onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                    filterStatus === status ? "bg-white text-indigo-700 shadow-sm" : "text-black hover:text-black"
                  )}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-black px-6 py-4">S.No</TableHead>
                <TableHead className="text-xs font-semibold text-black px-6 py-4">Institute / Client</TableHead>
                <TableHead className="text-xs font-semibold text-black px-6 py-4">Owner Contact</TableHead>
                <TableHead className="text-xs font-semibold text-black px-6 py-4">Plan & Expiry</TableHead>
                <TableHead className="text-xs font-semibold text-black px-6 py-4">Usage</TableHead>
                <TableHead className="text-xs font-semibold text-black px-6 py-4 text-center">Status</TableHead>
                <TableHead className="text-right px-6 py-4 text-xs font-semibold text-black">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((inst, idx) => (
                <TableRow
                  key={inst.id}
                  onClick={() => handleOpenMasterCenter(inst)}
                  className="border-slate-100 group hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <TableCell className="px-6 py-5 text-sm font-medium text-black">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50 group-hover:scale-105 transition-transform duration-300">
                        <Building2 className="w-5.5 h-5.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-black line-clamp-1">{inst.instituteName}</span>
                        <span className="text-[11px] font-medium text-black tracking-tight">ID: {inst.id?.substring(0, 8)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-black">{inst.fullName}</span>
                      <span className="text-xs text-black font-medium">{inst.phone || inst.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-indigo-600">{inst.currentPlan || 'Basic'}</span>
                      <span className="text-xs text-black font-medium mt-0.5">
                        {inst.planExpiryDate ? format(new Date(inst.planExpiryDate), "MMM dd, yyyy") : 'No Expiry'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex flex-col gap-1.5 min-w-[100px]">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-black">
                        <span>Students</span>
                        <span className="text-black">{inst.totalStudents}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(inst.totalStudents / 10, 100)}%` }} />
                      </div>
                      <div className="text-[10px] text-black font-medium">{inst.branches || 1} Branches Managed</div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-center">
                    <Badge variant="secondary" className={cn(
                      "rounded-lg px-2.5 py-0.5 text-[10px] font-semibold border-none shadow-none",
                      inst.status === 'Active' ? "bg-emerald-50 text-emerald-700" :
                        inst.status === 'Suspended' ? "bg-rose-50 text-rose-700" :
                          inst.status === 'Expired' ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-black"
                    )}>
                      {inst.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        onClick={(e) => { e.stopPropagation(); startSupportLogin(inst) }}
                        variant="ghost"
                        size="icon"
                        title="Login as Client"
                        className="h-9 w-9 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        <LogIn className="w-4.5 h-4.5" />
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleOpenMasterCenter(inst) }}
                        variant="ghost"
                        size="icon"
                        title="View Details"
                        className="h-9 w-9 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-black hover:bg-slate-50 hover:text-black">
                            <MoreVertical className="w-4.5 h-4.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl border-slate-200">
                          <DropdownMenuLabel className="text-[10px]  text-black font-bold px-3 py-2">Quick Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenMasterCenter(inst, true) }} className="gap-2.5 p-2 rounded-lg text-sm cursor-pointer">
                            <Edit className="w-4 h-4 text-black" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusToggle(inst) }} className="gap-2.5 p-2 rounded-lg text-sm cursor-pointer">
                            <Power className={cn("w-4 h-4", inst.status === 'Suspended' ? 'text-emerald-500' : 'text-amber-500')} />
                            {inst.status === 'Suspended' ? 'Activate Account' : 'Suspend Account'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2.5 p-2 rounded-lg text-sm cursor-pointer">
                            <RefreshCw className="w-4 h-4 text-indigo-500" /> Renew Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2.5 p-2 rounded-lg text-sm cursor-pointer">
                            <CalendarDays className="w-4 h-4 text-blue-500" /> Extend Validity
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2.5 p-2 rounded-lg text-sm cursor-pointer">
                            <Activity className="w-4 h-4 text-black" /> View Usage Stats
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(inst) }} className="gap-2.5 p-2 rounded-lg text-sm cursor-pointer text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-600">
                            <Trash2 className="w-4 h-4" /> Delete Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-medium text-black">Showing {paginated.length} of {filtered.length} clients</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 px-4 rounded-xl font-semibold text-xs text-black border-slate-200 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1.5" /> Previous
            </Button>
            <div className="flex items-center gap-1.5">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-9 h-9 rounded-xl text-xs font-bold transition-all",
                    currentPage === i + 1
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "bg-white border border-slate-200 text-black hover:bg-slate-50"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-9 px-4 rounded-xl font-semibold text-xs text-black border-slate-200 shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-y-auto border-slate-200 rounded-2xl font-body">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold text-black">Add New Institute</DialogTitle>
            <DialogDescription className="text-sm font-medium text-black">
              Create a new client account and setup their plan details.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 py-8 grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-black  tracking-wider">Institute Name</Label>
              <Input
                value={newInstitute.instituteName}
                onChange={e => setNewInstitute({ ...newInstitute, instituteName: e.target.value })}
                placeholder="e.g. Nirvana High School"
                className="h-10.5 rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-black  tracking-wider">Owner Full Name</Label>
              <Input
                value={newInstitute.fullName}
                onChange={e => setNewInstitute({ ...newInstitute, fullName: e.target.value })}
                placeholder="e.g. John Doe"
                className="h-10.5 rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-black  tracking-wider">Phone Number</Label>
              <Input
                value={newInstitute.phone}
                onChange={e => setNewInstitute({ ...newInstitute, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="h-10.5 rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-black  tracking-wider">Email Address</Label>
              <Input
                type="email"
                value={newInstitute.email}
                onChange={e => setNewInstitute({ ...newInstitute, email: e.target.value })}
                placeholder="owner@institute.com"
                className="h-10.5 rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-black  tracking-wider">Select Plan</Label>
              <Select
                value={newInstitute.plan}
                onValueChange={v => setNewInstitute({ ...newInstitute, plan: v })}
              >
                <SelectTrigger className="h-10.5 rounded-xl border-slate-200 bg-slate-50/50">
                  <SelectValue placeholder="Trial Plan" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="trial">Trial Plan (14 Days)</SelectItem>
                  <SelectItem value="basic">Basic SaaS Monthly</SelectItem>
                  <SelectItem value="pro">Pro SaaS Yearly</SelectItem>
                  <SelectItem value="wl">White-Label Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-black  tracking-wider">Branch Count</Label>
              <Input
                type="number"
                value={newInstitute.branchCount}
                onChange={e => setNewInstitute({ ...newInstitute, branchCount: parseInt(e.target.value) || 1 })}
                defaultValue={1}
                className="h-10.5 rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl font-semibold text-black h-11">Cancel</Button>
            <Button
              onClick={handleAddInstitute}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-bold h-11 transition-all"
            >
              {isProcessing ? 'Onboarding...' : 'Onboard Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Client Master Command Center - Redesigned CRM Style */}
      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="sm:max-w-5xl p-0 overflow-y-auto border border-slate-200 rounded-[32px] bg-white font-public-sans shadow-2xl flex flex-col max-h-[92vh]">

          {/* Top Date Header */}
          <div className="bg-white px-8 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
            <span className="text-[13px] font-semibold text-black">
              {format(new Date(), "eeee, MMMM do, yyyy")}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">A</div>
                <span className="text-[12px] font-semibold text-black">superadmin@digitalclass.com</span>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Profile Header Section */}
            <div className="bg-[#F8FAFC]/50 p-8 flex flex-col lg:flex-row gap-8 border-b border-slate-100">
              {/* Left: Avatar & Primary Info */}
              <div className="flex-1 flex gap-6">
                <div className="w-24 h-24 rounded-[28px] bg-white shadow-xl shadow-indigo-100/50 flex items-center justify-center text-3xl font-bold text-indigo-600 border border-slate-100 shrink-0">
                  {selectedClient?.instituteName?.charAt(0)}
                </div>
                <div className="space-y-2 py-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-black tracking-tight">{selectedClient?.instituteName}</h2>
                    <Badge variant="outline" className="bg-white text-indigo-600 border-indigo-100 px-3 py-0.5 rounded-lg font-bold text-[10px]  ">
                      Client Node
                    </Badge>
                  </div>
                  <p className="text-[15px] font-medium text-black flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-300" /> {selectedClient?.email}
                  </p>
                  <p className="text-[15px] font-medium text-black flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-300" /> {selectedClient?.phone || "+91 9876543210"}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2">
                    <span className="text-[13px] font-medium text-black">Master Owner: <span className="text-black font-bold">{selectedClient?.fullName}</span></span>
                    <span className="text-[13px] font-medium text-black">Node Born: <span className="text-black font-bold">{selectedClient?.createdAt ? format(new Date(selectedClient.createdAt), "PPP") : 'N/A'}</span></span>
                    <span className="text-[13px] font-medium text-black">Activity Score: <span className="text-emerald-600 font-bold">94%</span></span>
                  </div>
                </div>
              </div>

              {/* Right: Status & Actions */}
              <div className="flex flex-col md:flex-row lg:flex-col gap-4 min-w-[300px]">
                <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
                  <div>
                    <p className="text-[11px] font-bold text-black  tracking-wider">Node Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn("w-2 h-2 rounded-full animate-pulse", selectedClient?.status === 'Active' ? "bg-emerald-500" : "bg-rose-500")} />
                      <span className="text-[15px] font-bold text-black">{selectedClient?.status || 'Active'}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleStatusToggle(selectedClient)} className="text-slate-300 hover:text-indigo-600">
                    <ChevronDown className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex-1 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50 shadow-sm flex items-start gap-4 group cursor-pointer hover:bg-white transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-indigo-600/70  tracking-wider">Next Sync/Renewal</p>
                    <p className="text-[15px] font-bold text-black mt-0.5">May 21, 2026</p>
                    <p className="text-[12px] font-medium text-black">Subscription Auto-Node</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <div className="px-8 border-b border-slate-100 bg-white sticky top-0 z-10 transition-all">
                <TabsList className="h-14 bg-transparent p-0 gap-8 justify-start">
                  <TabsTrigger value="overview" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 px-1 text-[14px] font-bold text-black shadow-none transition-none">Home Overview</TabsTrigger>
                  <TabsTrigger value="usage" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 px-1 text-[14px] font-bold text-black shadow-none transition-none">Usage Stats</TabsTrigger>
                  <TabsTrigger value="billing" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 px-1 text-[14px] font-bold text-black shadow-none transition-none">Revenue Hub</TabsTrigger>
                  <TabsTrigger value="logs" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 px-1 text-[14px] font-bold text-black shadow-none transition-none">Audit Logs</TabsTrigger>
                </TabsList>
              </div>

              {/* Overview Content */}
              <TabsContent value="overview" className="m-0 p-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-black flex items-center gap-2">
                    Client Identity Information
                  </h3>
                  {isModalEditing ? (
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" onClick={() => setIsModalEditing(false)} className="h-10 px-6 rounded-xl text-black font-bold text-[14px]">
                        Cancel
                      </Button>
                      <Button onClick={handleSaveDetailedProfile} disabled={isProcessing} className="h-10 px-8 rounded-xl bg-indigo-600 hover:bg-slate-900 text-white font-bold text-[14px] shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2">
                        {isProcessing ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setIsModalEditing(true)} className="h-9 px-4 rounded-lg border-slate-200 text-[13px] font-bold gap-2 hover:bg-slate-50 transition-all">
                      <Edit className="w-3.5 h-3.5" /> Edit Profile Details
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <MasterInfoBox
                    label="Official Institute Name"
                    value={selectedClient?.instituteName}
                    isEditing={isModalEditing}
                    onChange={(v: any) => setEditData({ ...editData, instituteName: v })}
                  />
                  <MasterInfoBox
                    label="Primary Master Owner"
                    value={selectedClient?.fullName}
                    isEditing={isModalEditing}
                    onChange={(v: any) => setEditData({ ...editData, fullName: v })}
                  />
                  <MasterInfoBox
                    label="Master Contact Email"
                    value={selectedClient?.email}
                    isEditing={isModalEditing}
                    onChange={(v: any) => setEditData({ ...editData, email: v })}
                  />
                  <MasterInfoBox
                    label="Primary Support Phone"
                    value={selectedClient?.phone}
                    isEditing={isModalEditing}
                    placeholder="+91 00000-00000"
                    onChange={(v: any) => setEditData({ ...editData, phone: v })}
                  />
                  <MasterInfoBox
                    label="Subscription Tier"
                    value={selectedClient?.currentPlan || 'Starter Node'}
                    isEditing={false} // Plan usually changed via billing
                  />
                  <MasterInfoBox
                    label="Registered Site Slug"
                    value={selectedClient?.slug}
                    isEditing={isModalEditing}
                    placeholder="e.g. nirvana-high-school"
                    onChange={(v: any) => setEditData({ ...editData, slug: v })}
                    icon={<ExternalLink className="w-4 h-4 text-slate-300" />}
                  />
                  <div className="md:col-span-2">
                    <MasterInfoBox
                      label="Institutional Registered Address"
                      value={selectedClient?.address || "Universal Hub, New Delhi, India"}
                      isEditing={isModalEditing}
                      onChange={(v: any) => setEditData({ ...editData, address: v })}
                    />
                  </div>
                </div>

                {/* Quick Snapshot Metrics */}
                <div className="pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MasterMetricCard label="TOTAL STUDENTS" value={detailedStats?.students || 0} icon={<Users className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50" />
                  <MasterMetricCard label="TOTAL BRANCHES" value={detailedStats?.branches || 1} icon={<Network className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" />
                  <MasterMetricCard label="ACTIVE BATCHES" value={detailedStats?.batches || 0} icon={<Layers className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
                  <MasterMetricCard label="STAFF PORTAL" value={detailedStats?.staff || 0} icon={<UserPlus className="w-5 h-5 text-rose-600" />} color="bg-rose-50" />
                </div>
              </TabsContent>

              {/* Usage Analytics Content */}
              <TabsContent value="usage" className="m-0 p-8 space-y-6 animate-in fade-in duration-500">
                {isCalculating ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-black font-medium tracking-tight">Synchronizing Platform Node Analytics...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailStatCard label="Admission Records" value={detailedStats?.students || 0} icon={<GraduationCap className="w-5 h-5" />} sub="Unique Student Keys" />
                    <DetailStatCard label="Employee Directory" value={detailedStats?.staff || 0} icon={<UserPlus className="w-5 h-5" />} sub="Active Staff Profiles" />
                    <DetailStatCard label="Academic Structures" value={detailedStats?.batches || 0} icon={<LayersIcon className="w-5 h-5" />} sub="Batches Synchronized" />
                    <DetailStatCard label="Live Branch Nodes" value={detailedStats?.branches || 1} icon={<Building2 className="w-5 h-5" />} sub="Managed Locations" />

                    <div className="md:col-span-2 bg-slate-50 p-7 rounded-[28px] border border-slate-100 space-y-5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-black text-lg">Computational Resource Utilization</h4>
                        <Badge className="bg-white border-slate-200 text-indigo-600 px-3 font-bold text-[10px]">OPTIMIZED</Badge>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[12px] font-bold text-black">
                          <span>Database Interaction Health</span>
                          <span>96.4% Uptime</span>
                        </div>
                        <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner p-0.5">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: '96%' }} />
                        </div>
                        <p className="text-[11px] text-black font-medium">Node performance is analyzed across all active branch clusters.</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Placeholder Hubs */}
              <TabsContent value="billing" className="m-0 p-8 animate-in fade-in duration-500">
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-black">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-black">Revenue Node Syncing</h4>
                    <p className="text-black font-medium max-w-sm">Fetching detailed payment history and tax invoices from the financial hub.</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="logs" className="m-0 p-8 animate-in fade-in duration-500">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-white transition-all">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-black border-slate-100">Client Profile Verified & Synchronized</p>
                      <p className="text-[12px] font-medium text-black">Action logged by Super Admin • {detailedStats?.lastActive || 'Today'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-5 rounded-2xl border border-slate-100 opacity-60">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-black">Plan Node Update: {selectedClient?.currentPlan || 'Starter'}</p>
                      <p className="text-[12px] font-medium text-black">System generated environmental log</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer Action Bar */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-20">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleDelete(selectedClient)} className="text-black hover:text-rose-600 transition-all">
                <Trash2 className="w-4.5 h-4.5" />
              </Button>
              <div className="h-6 w-px bg-slate-200 mx-1" />
              <Button variant="ghost" size="icon" className="text-black hover:text-indigo-600">
                <TrendingUp className="w-4.5 h-4.5" />
              </Button>
            </div>
            <div className="flex gap-3">
              <DialogClose asChild>
                <Button variant="ghost" className="h-11 px-6 rounded-xl text-black font-bold text-[14px] hover:bg-slate-200 transition-all">
                  Close Command Center
                </Button>
              </DialogClose>
              <Button onClick={() => handleLoginAsClient(selectedClient)} className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-[14px] shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Secure Admin Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Support Entry Note Modal */}
      <Dialog open={isSupportNoteModalOpen} onOpenChange={setIsSupportNoteModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-y-auto border-slate-200 rounded-[24px] font-body text-black">
          <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Support Access Reason</DialogTitle>
                <p className="text-emerald-100 text-xs font-medium mt-1   font-black">Audit Protection Active</p>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full" />
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2.5">
              <Label className="text-[10px] font-black text-black   ml-1">Access Notes</Label>
              <Input
                value={supportNote}
                onChange={e => setSupportNote(e.target.value)}
                placeholder="e.g. Updating institution branding variables..."
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-medium placeholder:text-slate-300 text-black px-4"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button disabled={isProcessing} variant="outline" onClick={() => setIsSupportNoteModalOpen(false)} className="flex-1 h-12 rounded-xl border-slate-200 font-bold text-black">Cancel</Button>
              <Button disabled={isProcessing} onClick={handleConfirmedLoginAsClient} className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95">
                {isProcessing ? 'Logging Access...' : 'Initiate Session'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Confirmation Modal */}
      <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-y-auto border-slate-200 rounded-[28px] font-body text-black">
          <div className={cn(
            "p-8 text-white relative",
            pendingStatusAction?.targetStatus === 'Suspended' ? "bg-amber-500" : "bg-emerald-500"
          )}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Change Node Status?</DialogTitle>
                <p className="text-white/80 text-[10px] font-bold   mt-0.5">Account Resolution Matrix</p>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-6 text-black">
            <p className="text-sm font-semibold text-black leading-relaxed">
              Are you sure you want to <span className="text-black font-bold underline">{pendingStatusAction?.targetStatus?.toLowerCase()}</span> the institute <span className="text-black font-bold">"{pendingStatusAction?.name}"</span>?
              This will affect their portal access immediately.
            </p>
            <div className="flex items-center gap-3">
              <Button disabled={isProcessing} variant="outline" onClick={() => setIsStatusConfirmOpen(false)} className="flex-1 h-11 rounded-xl border-slate-200 font-bold text-black">Cancel</Button>
              <Button
                disabled={isProcessing}
                onClick={confirmStatusToggle}
                className={cn(
                  "flex-1 h-11 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95",
                  pendingStatusAction?.targetStatus === 'Suspended' ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100"
                )}
              >
                {isProcessing ? 'Updating...' : 'Confirm Change'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Sub-components for Master Command Center
function MasterInfoBox({ label, value, isEditing, onChange, placeholder, icon }: any) {
  return (
    <div className="space-y-1.5 group">
      <label className="text-[12px] font-bold text-black pl-1 group-hover:text-indigo-600 transition-all  tracking-wider">{label}</label>
      <div className={cn(
        "h-12 w-full px-4 rounded-xl border transition-all flex items-center justify-between",
        isEditing ? "bg-white border-indigo-200 shadow-sm shadow-indigo-50" : "bg-slate-50 border-slate-100"
      )}>
        {isEditing ? (
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none font-semibold text-black text-[14px]"
          />
        ) : (
          <span className="text-[14px] font-bold text-black line-clamp-1">{value || '---'}</span>
        )}
        {icon}
      </div>
    </div>
  )
}

function MasterMetricCard({ label, value, icon, color }: any) {
  return (
    <div className={cn("p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3 group hover:border-indigo-100 transition-all", color)}>
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-[20px] font-black text-black leading-none">{value}</p>
        <p className="text-[11px] font-bold text-black   mt-1.5">{label}</p>
      </div>
    </div>
  )
}

function DetailStatCard({ label, value, icon, sub }: any) {
  return (
    <div className="p-6 rounded-[24px] border border-slate-100 bg-white shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-bold text-black   mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-[22px] font-black text-black">{value}</h4>
          <span className="text-[11px] font-bold text-black">{sub}</span>
        </div>
      </div>
    </div>
  )
}

function LogEntry({ title, time }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
      <span className="text-xs font-semibold text-black">{title}</span>
      <span className="text-[10px] font-medium text-black flex items-center gap-1">
        <Clock className="w-3 h-3" /> {time}
      </span>
    </div>
  )
}
