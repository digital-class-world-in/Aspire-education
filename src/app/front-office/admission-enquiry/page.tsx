
    "use client"

    import { useState, useMemo, useEffect, useRef } from "react"
    import { Sidebar } from "@/components/layout/sidebar"
    import { TopNav } from "@/components/layout/top-nav"
    import { Card } from "@/components/ui/card"
    import { Button } from "@/components/ui/button"
    import { Input } from "@/components/ui/input"
    import { Label } from "@/components/ui/label"
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
    import { Badge } from "@/components/ui/badge"
    import { Textarea } from "@/components/ui/textarea"
    import { ScrollArea } from "@/components/ui/scroll-area"
    import { Checkbox } from "@/components/ui/checkbox"
    import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
    import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
    } from "@/components/ui/alert-dialog"
    import {
      X,
      Plus,
      FileSpreadsheet,
      FileText,
      Search,
      Edit2,
      Trash2,
      Settings2,
      ChevronLeft,
      ChevronRight,
      Loader2,
      Info,
      UserPlus,
      Check,
      Upload,
      Download,
      Filter,
      MessageCircle,
      X as CloseIcon,
      ChevronDown,
      Calendar
    } from "lucide-react"
    import { useFirebase } from "@/firebase"
    import { ref, onValue, push, set, remove, off, update, get } from "firebase/database"
    import { cn } from "@/lib/utils"
    import { useToast } from "@/hooks/use-toast"
    import { useResolvedId } from "@/hooks/use-resolved-id"
    import { usePathname } from "next/navigation"
    import * as XLSX from "xlsx"
    import jsPDF from "jspdf"
    import autoTable from "jspdf-autotable"
    import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns"

    const STATUS_OPTIONS = [
      { id: 'Active', value: 'Active' },
      { id: 'Inactive', value: 'Inactive' },
      { id: 'Done', value: 'Done' },
      { id: 'Rejected', value: 'Rejected' },
    ]

    export default function AdmissionEnquiryPage() {
      const pathname = usePathname()
      const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) ||
        pathname.startsWith('/staff') ||
        (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

      const { toast } = useToast()
      const [isModalOpen, setIsModalOpen] = useState(false)
      const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
      const [convertingEnquiry, setConvertingEnquiry] = useState<any>(null)

      const [searchTerm, setSearchTerm] = useState("")
      const [enquiries, setEnquiries] = useState<any[]>([])
      const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
      const [customFields, setCustomFields] = useState<any[]>([])
      const [editingItem, setEditingItem] = useState<any>(null)
      const [isLoading, setIsLoading] = useState(true)
      const [isSubmitting, setIsSubmitting] = useState(false)

      const [currentPage, setCurrentPage] = useState(1)
      const itemsPerPage = 10

      const [isManageOpen, setIsManageOpen] = useState(false)
      const [activeManageField, setActiveManageField] = useState<{ key: string, label: string } | null>(null)
      const [newOptionValue, setNewOptionValue] = useState("")
      const [editingOptionId, setEditingOptionId] = useState<string | null>(null)

      const [itemToDelete, setItemToDelete] = useState<any>(null)
      const [isDeleting, setIsDeleting] = useState(false)

      const [instituteName, setInstituteName] = useState("Your Institute")

      // Multi-Select Filter States
      const [filterSources, setFilterSources] = useState<string[]>([])
      const [filterEnquiryFors, setFilterEnquiryFors] = useState<string[]>([])
      const [filterStatuses, setFilterStatuses] = useState<string[]>([])
      const [fromDate, setFromDate] = useState("")
      const [toDate, setToDate] = useState("")

      const { database } = useFirebase()
      const { resolvedId, staffId, branchId, isStaff, isBranch } = useResolvedId()

      const fileInputRef = useRef<HTMLInputElement>(null)
      const today = useMemo(() => new Date().toISOString().split('T')[0], [])

      useEffect(() => {
        if (!database || !resolvedId) return
        const rootPath = `Institutes/${resolvedId}`
        onValue(ref(database, `${rootPath}/enquiries`), (snapshot) => {
          const data = snapshot.val()
          if (data) setEnquiries(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
          else setEnquiries([])
          setIsLoading(false)
        })
        onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
          const data = snapshot.val() || {}
          const processed: Record<string, any[]> = {}
          Object.keys(data).forEach(key => { processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value })) })
          setDropdownData(processed)
        })
        onValue(ref(database, `${rootPath}/profile/instituteName`), (s) => {
          if (s.exists()) setInstituteName(s.val())
        })
        
        // Fetch custom fields for this module
        onValue(ref(database, `${rootPath}/dynamicFields/front_office/admission_enquiry`), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val()
            setCustomFields(Object.keys(data).map(k => ({ id: k, ...data[k] })))
          } else {
            setCustomFields([])
          }
        })

        // Initialize default options if dropdowns are empty
        get(ref(database, `${rootPath}/dropdowns`)).then((snapshot) => {
          const data = snapshot.val() || {}
          
          if (!data.board) {
            const boards = ['GSEB', 'CBSE', 'Gujarat University', 'Other']
            boards.forEach(b => push(ref(database, `${rootPath}/dropdowns/board`), { value: b }))
          }
          
          if (!data.source) {
            const sources = ['Friend', 'School', 'Instagram', 'Google', 'Banner', 'Seminar']
            sources.forEach(s => push(ref(database, `${rootPath}/dropdowns/source`), { value: s }))
          }

          if (!data.course) {
            const courses = [
              'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
              'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
              'Class 11 (Commerce)', 'Class 11 (Science)', 
              'Class 12 (Commerce)', 'Class 12 (Science)',
              'FY B.Com', 'SY B.Com', 'TY B.Com'
            ]
            courses.forEach(c => push(ref(database, `${rootPath}/dropdowns/course`), { value: c }))
          }
        })
      }, [database, resolvedId])

      const hasActiveFilters = useMemo(() => {
        return filterSources.length > 0 || filterEnquiryFors.length > 0 || filterStatuses.length > 0 || fromDate !== "" || toDate !== "" || searchTerm !== ""
      }, [filterSources, filterEnquiryFors, filterStatuses, fromDate, toDate, searchTerm])

      const filteredEnquiries = useMemo(() => {
        let list = enquiries
        if (isStaff && staffId) list = list.filter(e => e.createdBy === staffId)
        else if (isBranch && branchId) list = list.filter(e => e.branchId === branchId)

        return list.filter(e => {
          const matchSearch = !searchTerm || e.enquirerFirstName?.toLowerCase().includes(searchTerm.toLowerCase()) || e.enquirerPhoneNumber?.includes(searchTerm)
          const matchSource = filterSources.length === 0 || filterSources.includes(e.source)
          const matchFor = filterEnquiryFors.length === 0 || filterEnquiryFors.includes(e.courseName)
          const matchStatus = filterStatuses.length === 0 || filterStatuses.includes(e.status)

          let matchDate = true
          if (fromDate || toDate) {
            try {
              const enquiryDate = parseISO(e.enquiryDate)
              const start = fromDate ? startOfDay(parseISO(fromDate)) : null
              const end = toDate ? endOfDay(parseISO(toDate)) : null

              if (start && end) matchDate = isWithinInterval(enquiryDate, { start, end })
              else if (start) matchDate = enquiryDate >= start
              else if (end) matchDate = enquiryDate <= end
            } catch (err) {
              matchDate = true
            }
          }

          return matchSearch && matchSource && matchFor && matchStatus && matchDate
        })
      }, [enquiries, searchTerm, filterSources, filterEnquiryFors, filterStatuses, fromDate, toDate, isStaff, staffId, isBranch, branchId])

      const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage)
      const paginatedEnquiries = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredEnquiries.slice(start, start + itemsPerPage)
      }, [filteredEnquiries, currentPage])

      const handleSaveEnquiry = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!resolvedId || !database || isSubmitting) return
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)
        const enquiryData = {
          enquirerFirstName: formData.get("name"),
          enquirerEmail: formData.get("email"),
          enquirerPhoneNumber: formData.get("phone"),
          courseName: formData.get("courseName"),
          enquiryDate: formData.get("enquiryDate") || today,
          followUpDate: formData.get("followUpDate"),
          source: formData.get("source"),
          status: formData.get("status") || "Active",
          demoTaken: formData.get("demoTaken"),
          enquiryCategory: formData.get("enquiryCategory"),
          city: formData.get("city"),
          state: formData.get("state"),
          address: formData.get("address"),
          remark: formData.get("remark"),
          board: formData.get("board"),
          schoolName: formData.get("schoolName"),
          fatherName: formData.get("fatherName"),
          fatherPhone: formData.get("fatherPhone"),
          motherName: formData.get("motherName"),
          motherPhone: formData.get("motherPhone"),
          transportRequired: formData.get("transportRequired"),
          previousCoaching: formData.get("previousCoaching"),
          previousCoachingInstitute: formData.get("previousCoachingInstitute"),
          branchId: isBranch ? branchId : (editingItem?.branchId || null),
          createdBy: isStaff ? staffId : isBranch ? branchId : 'admin',
          updatedAt: Date.now()
        }

        // Append custom fields dynamically
        customFields.forEach(field => {
          const val = formData.get(field.id)
          if (val !== null) enquiryData[field.id as keyof typeof enquiryData] = val as string
        })

        const dbPath = `Institutes/${resolvedId}/enquiries`
        try {
          if (editingItem) await update(ref(database, `${dbPath}/${editingItem.id}`), enquiryData)
          else await set(push(ref(database, dbPath)), { ...enquiryData, createdAt: Date.now() })
          setIsModalOpen(false); setEditingItem(null);
          toast({ title: "Enquiry Updated" })
        } catch (err) {
          toast({ variant: "destructive", title: "Update Failed" })
        } finally {
          setIsSubmitting(false);
        }
      }

      const handleDelete = async () => {
        if (!database || !resolvedId || !itemToDelete) return
        setIsDeleting(true)
        try {
          const rootPath = `Institutes/${resolvedId}`
          await set(push(ref(database, `${rootPath}/trash/enquiries`)), { ...itemToDelete, deletedAt: Date.now() })
          await remove(ref(database, `${rootPath}/enquiries/${itemToDelete.id}`))
          toast({ title: "Moved To Trash" })
        } catch (err) {
          toast({ variant: "destructive", title: "Delete Failed" })
        } finally {
          setIsDeleting(false); setItemToDelete(null);
        }
      }

      const handleConvertToAdmission = async () => {
        if (!database || !resolvedId || !convertingEnquiry) return
        setIsSubmitting(true)
        try {
          const rootPath = `Institutes/${resolvedId}`
          const regNo = `REG-${Date.now().toString().slice(-6)}`
          const admissionData = {
            studentName: convertingEnquiry.enquirerFirstName,
            email: convertingEnquiry.enquirerEmail || "",
            mobile: convertingEnquiry.enquirerPhoneNumber,
            course: convertingEnquiry.courseName,
            address: convertingEnquiry.address || "",
            source: convertingEnquiry.source || "Direct",
            admissionDate: today,
            admissionNo: regNo,
            status: "Active",
            loginStatus: true,
            password: "password123",
            netFees: 0,
            totalFees: 0,
            discount: 0,
            fatherName: convertingEnquiry.fatherName || "",
            fatherMobile: convertingEnquiry.fatherPhone || "",
            motherName: convertingEnquiry.motherName || "",
            schoolName: convertingEnquiry.schoolName || "",
            board: convertingEnquiry.board || "",
            transportRequired: convertingEnquiry.transportRequired || "No",
            previousCoaching: convertingEnquiry.previousCoaching || "No",
            branchId: convertingEnquiry.branchId || null,
            createdBy: 'admin',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          await push(ref(database, `${rootPath}/admissions`), admissionData)
          await update(ref(database, `${rootPath}/enquiries/${convertingEnquiry.id}`), { status: "Done", convertedAt: Date.now() })
          toast({ title: "Lead Converted" })
          setIsConvertDialogOpen(false); setConvertingEnquiry(null);
        } catch (err) { toast({ variant: "destructive", title: "Error" }) }
        finally { setIsSubmitting(false) }
      }

      const handleSaveOption = () => {
        if (!newOptionValue.trim() || !resolvedId || !database || !activeManageField) return
        const dbPath = `Institutes/${resolvedId}/dropdowns/${activeManageField.key}`
        if (editingOptionId) {
          update(ref(database, `${dbPath}/${editingOptionId}`), { value: newOptionValue.trim() })
            .then(() => { setNewOptionValue(""); setEditingOptionId(null); })
        } else {
          push(ref(database, dbPath), { value: newOptionValue.trim() }).then(() => setNewOptionValue(""))
        }
      }

      const resetFilters = () => {
        setFilterSources([])
        setFilterEnquiryFors([])
        setFilterStatuses([])
        setFromDate("")
        setToDate("")
        setSearchTerm("")
        setCurrentPage(1)
      }

      const openManageModal = (key: string, label: string) => { setActiveManageField({ key, label }); setNewOptionValue(""); setEditingOptionId(null); setIsManageOpen(true); }

      const toggleMultiSelect = (state: string[], setter: (v: string[]) => void, value: string) => {
        if (state.includes(value)) setter(state.filter(v => v !== value))
        else setter([...state, value])
      }

      const handleWhatsApp = (row: any) => {
        const phone = row.enquirerPhoneNumber?.replace(/\D/g, '') || ""
        if (!phone) {
          toast({ variant: "destructive", title: "Missing Contact", description: "This lead has no valid phone number recorded." })
          return
        }
        const message = `Hello *${row.enquirerFirstName}*,\n\nGreetings from *${instituteName}*!\n\nThis is regarding your enquiry for the *${row.courseName}* course. We would love to discuss your academic goals further.\n\nAre you available for a quick follow-up?\n\nRegards,\nTeam *${instituteName}*`
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank')
      }

      const downloadSampleCsv = () => {
        const headers = ["Name", "Email", "Phone", "Course", "Date", "Follow_Up", "Source", "Status", "Demo_Taken", "Category", "City", "State", "Address", "Remark"]
        const sampleData = [["John Doe", "john@test.com", "9876543210", "Computer Science", today, today, "Website", "Active", "No", "General", "City", "State", "123 Street Address", "Interested in weekend batches"]]
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Sample")
        XLSX.writeFile(wb, "admission_enquiry_sample.csv")
      }

      const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filteredEnquiries.map((e, i) => ({
          "Sr No": i + 1,
          "Name": e.enquirerFirstName,
          "Email": e.enquirerEmail || '-',
          "Phone": e.enquirerPhoneNumber,
          "Course": e.courseName,
          "Date": e.enquiryDate,
          "Source": e.source,
          "Status": e.status
        })))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Enquiries")
        XLSX.writeFile(wb, `Admission_Enquiries_${today}.xlsx`)
      }

      const exportPDF = () => {
        if (!filteredEnquiries.length) return
        const doc = new jsPDF('l', 'mm', 'a4')
        doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
        doc.setFontSize(12).setTextColor(100).text(`Admission Enquiry Registry - ${format(new Date(), "PP")}`, 14, 30)

        const tableData = filteredEnquiries.map((e, i) => [
          i + 1,
          e.enquirerFirstName,
          e.enquirerPhoneNumber,
          e.courseName,
          e.enquiryDate,
          e.source || '-',
          e.status
        ])

        autoTable(doc, {
          startY: 40,
          head: [['#', 'Name', 'Phone', 'Course', 'Date', 'Source', 'Status']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] },
          styles: { fontSize: 9 }
        })

        doc.save(`Admission_Enquiries_${today}.pdf`)
      }

      function formatDateDisplay(dateStr: string) {
        if (!dateStr) return '-'
        const parts = dateStr.split('-')
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
        return dateStr
      }

      return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
          {!isPortal && <Sidebar />}
          <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[300px]")}>
            {!isPortal && <TopNav />}
            <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                  <h2 className="text-[14px] font-normal text-black font-public-sans tracking-tight leading-none">Admission enquiry</h2>
                  <p className="text-[14px] text-black font-medium mt-1">Capture and track student interest</p>
                </div>
                <Dialog open={isModalOpen} onOpenChange={(o) => { setIsModalOpen(o); if (!o) setEditingItem(null); }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingItem(null)} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all tracking-widest">
                      Add New
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl sm:max-w-[850px]">
                    <div className="bg-white px-10 py-6 border-b border-zinc-100"><DialogTitle className="text-xl font-black text-black font-public-sans">Add New Enquiry</DialogTitle></div>
                    <ScrollArea className="max-h-[85vh]">
                      <form onSubmit={handleSaveEnquiry} className="p-8 space-y-8 font-public-sans text-[14px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                          <FormItem label="Student Name" name="name" defaultValue={editingItem?.enquirerFirstName} required />
                          <FormItem label="Student Contact Number" name="phone" type="tel" maxLength={10} defaultValue={editingItem?.enquirerPhoneNumber} placeholder="Optional" />
                          <FormItem label="Email Address" name="email" type="email" defaultValue={editingItem?.enquirerEmail} required />

                          <div className="md:col-span-2 mt-4"><h3 className="text-[14px] font-black text-black tracking-widest border-b border-zinc-100 pb-2">🔹 2. Academic Details</h3></div>
                          <FormSelect label="Admission Standard / Course Applying For" name="courseName" defaultValue={editingItem?.courseName} options={dropdownData['course'] || []} onManage={() => openManageModal('course', 'Course')} required />
                          <FormSelect label="Board / University" name="board" defaultValue={editingItem?.board} options={dropdownData['board'] || []} onManage={() => openManageModal('board', 'Board / University')} required />
                          <FormItem label="School / College Name" name="schoolName" defaultValue={editingItem?.schoolName} required />

                          <div className="md:col-span-2 mt-4"><h3 className="text-[14px] font-black text-black tracking-widest border-b border-zinc-100 pb-2">🔹 3. Parent Details</h3></div>
                          <div className="space-y-4 md:col-span-2">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <FormItem label="Father Name" name="fatherName" defaultValue={editingItem?.fatherName} required />
                                <FormItem label="Father Contact Number" name="fatherPhone" type="tel" maxLength={10} defaultValue={editingItem?.fatherPhone} required />
                                <FormItem label="Mother Name" name="motherName" defaultValue={editingItem?.motherName} required />
                                <FormItem label="Mother Contact Number" name="motherPhone" type="tel" maxLength={10} defaultValue={editingItem?.motherPhone} required />
                             </div>
                          </div>

                          <div className="md:col-span-2 mt-4"><h3 className="text-[14px] font-black text-black tracking-widest border-b border-zinc-100 pb-2">🔹 4. Address Details</h3></div>
                          <div className="md:col-span-2 space-y-1.5"><Label className="text-[14px] font-black text-black tracking-widest ml-1">Full Address *</Label><Textarea name="address" required defaultValue={editingItem?.address} placeholder="Full Address" className="rounded-xl min-h-[80px] border-zinc-200 font-bold text-[14px]" /></div>

                          <div className="md:col-span-2 mt-4"><h3 className="text-[14px] font-black text-black tracking-widest border-b border-zinc-100 pb-2">🔹 5. Transport Requirement</h3></div>
                          <div className="space-y-1.5"><Label className="text-[14px] font-black text-black tracking-widest ml-1">Do you require transport? *</Label><Select name="transportRequired" required defaultValue={editingItem?.transportRequired || "No"}><SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-[14px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Yes" className="text-[14px] font-bold">Yes</SelectItem><SelectItem value="No" className="text-[14px] font-bold">No</SelectItem></SelectContent></Select></div>

                          <div className="md:col-span-2 mt-4"><h3 className="text-[14px] font-black text-black tracking-widest border-b border-zinc-100 pb-2">🔹 6. Previous Coaching</h3></div>
                          <div className="space-y-1.5"><Label className="text-[14px] font-black text-black tracking-widest ml-1">Have you taken coaching before? *</Label><Select name="previousCoaching" required defaultValue={editingItem?.previousCoaching || "No"}><SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-[14px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Yes" className="text-[14px] font-bold">Yes</SelectItem><SelectItem value="No" className="text-[14px] font-bold">No</SelectItem></SelectContent></Select></div>
                          <FormItem label="Coaching Institute Name" name="previousCoachingInstitute" defaultValue={editingItem?.previousCoachingInstitute} placeholder="If Yes" />

                          <div className="md:col-span-2 mt-4"><h3 className="text-[14px] font-black text-black tracking-widest border-b border-zinc-100 pb-2">🔹 7. Referral / Enquiry Source ⭐</h3></div>
                          <FormSelect label="How did you hear about us? *" name="source" defaultValue={editingItem?.source || "Direct"} options={dropdownData['source'] || []} onManage={() => openManageModal('source', 'Source')} required />
                          <div className="space-y-1.5"><Label className="text-[14px] font-black text-black tracking-widest ml-1">Status</Label><Select name="status" defaultValue={editingItem?.status || "Active"}><SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-[14px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="Active" className="text-[14px] font-bold">Active</SelectItem><SelectItem value="Inactive" className="text-[14px] font-bold">Inactive</SelectItem><SelectItem value="Done" className="text-[14px] font-bold">Done</SelectItem><SelectItem value="Rejected" className="text-[14px] font-bold">Rejected</SelectItem></SelectContent></Select></div>
                          <FormItem label="Enquiry Date" name="enquiryDate" type="date" defaultValue={editingItem?.enquiryDate || today} required />
                          <FormItem label="Follow Up Date" name="followUpDate" type="date" defaultValue={editingItem?.followUpDate} />
                          <div className="md:col-span-2 space-y-1.5"><Label className="text-[14px] font-black text-black tracking-widest ml-1">Remark</Label><Textarea name="remark" defaultValue={editingItem?.remark} placeholder="Remark" className="rounded-xl min-h-[100px] border-zinc-200 font-bold text-[14px]" /></div>
                          
                          {customFields.map(field => {
                            if (field.type === 'select') {
                              return (
                                <div key={field.id} className="space-y-1.5">
                                  <Label className="text-[14px] font-black text-black tracking-widest ml-1">{field.label} {field.required && "*"}</Label>
                                  <Select name={field.id} defaultValue={editingItem?.[field.id]} required={field.required}>
                                    <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-[14px]"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                      {(field.options || []).map((opt: string) => (
                                        <SelectItem key={opt} value={opt} className="text-[14px] font-bold">{opt}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )
                            }
                            if (field.type === 'textarea') {
                              return (
                                <div key={field.id} className="md:col-span-2 space-y-1.5">
                                  <Label className="text-[14px] font-black text-black tracking-widest ml-1">{field.label} {field.required && "*"}</Label>
                                  <Textarea name={field.id} required={field.required} defaultValue={editingItem?.[field.id]} placeholder={field.label} className="rounded-xl min-h-[80px] border-zinc-200 font-bold text-[14px]" />
                                </div>
                              )
                            }
                            if (field.type === 'checkbox') {
                              return (
                                <div key={field.id} className="flex flex-col justify-end space-y-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                                  <div className="flex items-center gap-3">
                                    <Checkbox name={field.id} id={field.id} defaultChecked={editingItem?.[field.id] === 'on' || editingItem?.[field.id] === true} className="w-5 h-5" value="on" />
                                    <Label htmlFor={field.id} className="text-[14px] font-black text-black tracking-widest cursor-pointer">{field.label} {field.required && "*"}</Label>
                                  </div>
                                </div>
                              )
                            }
                            return (
                              <FormItem key={field.id} label={field.label} name={field.id} type={field.type} required={field.required} defaultValue={editingItem?.[field.id]} />
                            )
                          })}
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:opacity-90 text-white rounded-xl h-14 px-12 font-black text-[10px] tracking-widest shadow-xl border-none active:scale-95 transition-all">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit Now</Button>
                      </form>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-public-sans text-black tracking-tight">Select Criteria</h3>
                  {hasActiveFilters && (
                    <Button onClick={resetFilters} variant="ghost" className="h-8 px-4 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-black tracking-widest gap-2">
                      Reset Filters <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  <MultiCriteriaBox label="Enquiry Source" selected={filterSources} onToggle={(v) => toggleMultiSelect(filterSources, setFilterSources, v)} options={dropdownData['source'] || []} />
                  <MultiCriteriaBox label="Enquiry For" selected={filterEnquiryFors} onToggle={(v) => toggleMultiSelect(filterEnquiryFors, setFilterEnquiryFors, v)} options={dropdownData['course'] || []} />
                  <MultiCriteriaBox label="Enquiry Status" selected={filterStatuses} onToggle={(v) => toggleMultiSelect(filterStatuses, setFilterStatuses, v)} options={STATUS_OPTIONS} />
                  <div className="space-y-2"><Label className="text-[10px] font-black text-black tracking-widest">Enquiry From Date</Label><Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }} className="h-10 rounded-lg border-zinc-200 text-[14px] font-bold text-black shadow-inner bg-white" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black text-black tracking-widest">Enquiry To Date</Label><Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }} className="h-10 rounded-lg border-zinc-200 text-[14px] font-bold text-black shadow-inner bg-white" /></div>
                </div>
              </Card>

              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-6">
                    <div className="relative group w-full md:w-80">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="Search Lead..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-10 h-10 border-zinc-200 rounded-lg text-[14px] font-bold text-black focus-visible:ring-primary shadow-sm transition-none bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="outline" onClick={downloadSampleCsv} className="h-11 px-5 text-[#0D9488] border-[#0D9488]/20 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><Download className="h-4 w-4" /> Sample CSV</Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 px-5 text-indigo-600 border-indigo-100 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-indigo-50 shadow-sm"><Upload className="h-4 w-4" /> Import CSV</Button>
                    <Button variant="outline" onClick={exportExcel} className="h-11 px-5 text-emerald-600 border-emerald-100 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
                    <Button variant="outline" onClick={exportPDF} className="h-11 px-4 text-rose-600 border-rose-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] bg-white hover:bg-rose-50 shadow-sm"><FileText className="h-4 w-4" /> Export PDF</Button>
                  </div>
                </div>

                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                  <div className="overflow-x-auto scrollbar-thin">
                    <Table className="min-w-[2800px]">
                      <TableHeader className="bg-zinc-50/50">
                        <TableRow className="border-zinc-100 hover:bg-transparent">
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14 pl-10 w-20">Sr No.</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Action</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Student Name</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Student Phone</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Course</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Board</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">School</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Father Name</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Father Phone</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Source</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14 text-center">Status</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Enquiry Date</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Follow Up</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Email</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Transport</TableHead>
                          <TableHead className="text-[13px] font-black text-black font-public-sans tracking-widest h-14">Address</TableHead>
                          <TableHead className="text-right pr-10 text-[13px] font-black text-black font-public-sans tracking-widest h-14">Remark</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEnquiries.map((row, index) => (
                          <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                            <TableCell className="text-[14px] font-black text-black font-public-sans pl-10">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleWhatsApp(row)} className="p-1 hover:bg-zinc-100 rounded-md transition-colors" title="WhatsApp Follow-up">
                                  <img src="https://img.icons8.com/office/40/whatsapp--v1.png" className="w-5 h-5" alt="WhatsApp" />
                                </button>
                                <button disabled={row.status === 'Done'} onClick={() => { setConvertingEnquiry(row); setIsConvertDialogOpen(true); }} className={cn("p-1", row.status === 'Done' ? "opacity-20 grayscale" : "text-blue-500 hover:bg-blue-50 rounded-md")} title="Convert to Admission"><UserPlus className="h-5 w-5" /></button>
                                <button onClick={() => { setEditingItem(row); setIsModalOpen(true); }} className="p-1 text-black hover:text-blue-500 transition-none" title="Edit Enquiry"><Edit2 className="h-4 w-4" /></button>
                                <button onClick={() => { setItemToDelete(row); }} className="p-1 text-black hover:text-rose-500 transition-none" title="Delete Enquiry"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </TableCell>
                            <TableCell><span className="text-[14px] font-bold text-black font-public-sans tracking-tight whitespace-nowrap">{row.enquirerFirstName}</span></TableCell>
                            <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.enquirerPhoneNumber || '-'}</TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans">{row.courseName}</TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans">{row.board || '-'}</TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans">{row.schoolName || '-'}</TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans">{row.fatherName || '-'}</TableCell>
                            <TableCell className="text-[14px] font-bold text-black font-public-sans max-w-[120px] truncate">{row.fatherPhone || '-'}</TableCell>
                            <TableCell className="text-[14px] font-bold text-black font-public-sans">{row.source || '-'}</TableCell>
                            <TableCell className="text-center"><Badge className={cn("rounded-lg px-2.5 py-0.5 text-[9px] font-black border-none shadow-none font-public-sans", row.status === 'Done' ? "bg-emerald-50 text-emerald-600" : row.status === 'Rejected' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600")}>{row.status || 'Active'}</Badge></TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans">{formatDateDisplay(row.enquiryDate)}</TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans">{formatDateDisplay(row.followUpDate)}</TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans lowercase">{row.enquirerEmail || '-'}</TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans">{row.transportRequired || 'No'}</TableCell>
                            <TableCell className="text-[14px] font-normal text-black font-public-sans max-w-[200px] truncate">{row.address || '-'}</TableCell>
                            <TableCell className="text-right pr-10 text-[14px] text-black font-public-sans italic">{row.remark || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
                  <p className="text-[10px] font-black text-black tracking-widest">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEnquiries.length)} of {filteredEnquiries.length} entries</p>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-4">
                      <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-black text-[10px] tracking-widest transition-all"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
                      <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100 hover:bg-zinc-50")}>{i + 1}</button>))}</div>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-black text-[10px] tracking-widest transition-all">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                    </div>
                  )}
                </div>
              </div>

              <AlertDialog open={!!itemToDelete} onOpenChange={(o) => { if (!o) setItemToDelete(null) }}>
                <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-10 bg-white">
                  <AlertDialogHeader className="space-y-4">
                    <div className="w-16 h-16 rounded-[24px] bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner"><Trash2 className="w-8 h-8" /></div>
                    <div><AlertDialogTitle className="text-2xl font-black text-black tracking-tight">Move To Trash?</AlertDialogTitle><AlertDialogDescription className="text-black text-[14px] leading-relaxed font-bold">Are you sure you want to move the enquiry for <span className="text-black">"{itemToDelete?.enquirerFirstName}"</span> to the institutional trash? This can be restored later.</AlertDialogDescription></div>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-8 gap-3">
                    <AlertDialogCancel className="rounded-xl border-zinc-100 text-black font-black text-[10px] tracking-widest h-12 px-8">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="rounded-xl font-black h-12 px-8 border-none shadow-lg bg-rose-500 hover:bg-rose-600 text-white transition-all active:scale-95 text-[10px]">
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Move To Trash"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
                <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-10 bg-white">
                  <AlertDialogHeader className="space-y-4">
                    <div className="w-16 h-16 rounded-[24px] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner"><UserPlus className="w-8 h-8" /></div>
                    <div><AlertDialogTitle className="text-2xl font-black text-black tracking-tight">Convert To Admission?</AlertDialogTitle><AlertDialogDescription className="text-black text-[14px] leading-relaxed font-bold">Register <span className="text-black">"{convertingEnquiry?.enquirerFirstName}"</span> as an official student. This action moves the lead to the admission registry.</AlertDialogDescription></div>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-8 gap-3">
                    <AlertDialogCancel className="rounded-xl border-zinc-100 text-black font-black h-12 px-8 text-[10px]">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConvertToAdmission} className="rounded-xl font-black h-12 px-8 border-none shadow-lg bg-primary hover:bg-emerald-600 text-white transition-all active:scale-95 text-[10px]">Confirm Register</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl font-public-sans text-[14px]">
                  <div className="flex items-center justify-between mb-8"><DialogTitle className="text-xl font-black text-black">Manage {activeManageField?.label}</DialogTitle></div>
                  <div className="flex gap-2 mb-8"><Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="Enter new..." className="rounded-xl h-12 font-bold" /><Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none shadow-lg active:scale-95 transition-all">Save</Button></div>
                  <ScrollArea className="h-64 pr-4"><div className="space-y-2">{(dropdownData[activeManageField?.key || ''] || []).map(opt => (
                    <div key={opt.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all">
                      <span className="text-[14px] font-black text-black">{opt.value}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="text-blue-500 h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/dropdowns/${activeManageField!.key}/${opt.id}`))} className="text-rose-500 h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}</div></ScrollArea>
                </DialogContent>
              </Dialog>
            </main>
          </div>
        </div>
      )
    }

    function MultiCriteriaBox({ label, selected, onToggle, options }: { label: string, selected: string[], onToggle: (v: string) => void, options: any[] }) {
      return (
        <div className="space-y-2">
          <Label className="text-[10px] font-black text-black tracking-[0.2em]">{label}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white flex items-center justify-between text-[14px] font-black text-black shadow-inner group hover:border-primary transition-all">
                <span className="truncate">{selected.length > 0 ? `${selected.length} Selected` : "Select Options"}</span>
                <Filter className="w-3.5 h-3.5 text-zinc-300 group-hover:text-primary" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 rounded-2xl overflow-hidden border-zinc-100 shadow-2xl">
              <div className="bg-zinc-50 p-4 border-b border-zinc-100 flex justify-between items-center">
                <p className="text-[9px] font-black text-black tracking-widest">Select Multiple</p>
              </div>
              <ScrollArea className="h-64">
                <div className="p-2 space-y-1">
                  {options.map(opt => (
                    <div key={opt.id} onClick={() => onToggle(opt.value)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors group">
                      <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => onToggle(opt.value)} className="data-[state=checked]:bg-primary" />
                      <span className="text-[14px] font-black text-black group-hover:text-black">{opt.value}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )
    }

    function CriteriaRadioBox({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: any[] }) {
      return (
        <div className="space-y-2">
          <Label className="text-[11px] font-bold text-black tracking-widest ml-1">{label}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-white flex items-center justify-between text-[14px] font-bold text-black shadow-inner group hover:border-primary transition-all">
                <span className="truncate">{value === 'all' ? `Select` : value}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-300 group-hover:text-primary" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 rounded-2xl overflow-hidden border-zinc-100 shadow-2xl">
              <div className="bg-zinc-50 p-4 border-b border-zinc-100 flex justify-between items-center">
                <p className="text-[9px] font-black text-black tracking-widest">Select {label}</p>
              </div>
              <ScrollArea className="h-64">
                <RadioGroup value={value} onValueChange={onChange} className="p-2 space-y-1">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors group">
                    <RadioGroupItem value="all" id={`${label}-all`} className="text-primary border-zinc-300" />
                    <Label htmlFor={`${label}-all`} className="text-[14px] font-bold text-black cursor-pointer flex-1">All {label}s</Label>
                  </div>
                  {options.map(opt => (
                    <div key={opt.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors group">
                      <RadioGroupItem value={opt.value} id={`${label}-${opt.id}`} className="text-primary border-zinc-300" />
                      <Label htmlFor={`${label}-${opt.id}`} className="text-[14px] font-bold text-black cursor-pointer flex-1">{opt.value}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )
    }

    function FormItem({ label, name, type = "text", required = false, defaultValue, maxLength, placeholder }: any) {
      return (
        <div className="space-y-1.5">
          <Label className="text-[14px] font-black text-black tracking-widest ml-1">{label} {required && "*"}</Label>
          <Input name={name} type={type} required={required} defaultValue={defaultValue} maxLength={maxLength} placeholder={placeholder || label} className="rounded-xl border-zinc-200 h-12 font-bold text-black text-[14px] focus-visible:ring-primary" />
        </div>
      )
    }

    function FormSelect({ label, name, options, onManage, defaultValue, required = false }: any) {
      return (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <Label className="text-[14px] font-black text-black tracking-widest">{label} {required && "*"}</Label>
            <button type="button" onClick={onManage} className="text-[9px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
          </div>
          <Select name={name} defaultValue={defaultValue} required={required}>
            <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black focus:ring-primary transition-none text-[14px]"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-100 shadow-xl">{options.map((opt: any) => (<SelectItem key={opt.id} value={opt.value} className="rounded-lg font-bold text-[14px]">{opt.value}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      )
    }
