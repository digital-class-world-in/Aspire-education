"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  FileText
} from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, update, remove } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export default function ComplainsPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/branch') || 
                   pathname.startsWith('/staff') || 
                   pathname.startsWith('/student')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [instituteName, setInstituteName] = useState("Your Institute")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { database, storage } = useFirebase()
  const { resolvedId, isStaff, isBranch, staffId, branchId } = useResolvedId()

  const today = format(new Date(), "yyyy-MM-dd")

  // Fetch complaints and institute profile
  useEffect(() => {
    if (!database || !resolvedId) return

    const rootPath = `Institutes/${resolvedId}`

    // Listen to complaints
    onValue(ref(database, `${rootPath}/complains`), (snapshot) => {
      const data = snapshot.val()
      setItems(data 
        ? Object.keys(data).map(key => ({ ...data[key], id: key })).reverse() 
        : []
      )
    })

    // Listen to institute name
    onValue(ref(database, `${rootPath}/profile`), (snapshot) => {
      const profile = snapshot.val()
      if (profile?.instituteName) setInstituteName(profile.instituteName)
    })
  }, [database, resolvedId])

  const filteredItems = useMemo(() => {
    let list = [...items]

    // Role-based filtering
    if (isStaff && staffId) {
      list = list.filter(item => item.createdBy === staffId)
    } else if (isBranch && branchId) {
      list = list.filter(item => item.branchId === branchId)
    }

    return list.filter(item => {
      const matchSearch = !searchTerm || 
        item.complainBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone?.includes(searchTerm)

      const matchType = filterType === "all" || item.type === filterType
      const matchStatus = filterStatus === "all" || item.status === filterStatus

      let matchDate = true
      if (fromDate || toDate) {
        try {
          const itemDate = new Date(item.date)
          if (fromDate) matchDate = itemDate >= new Date(fromDate)
          if (toDate) matchDate = matchDate && itemDate <= new Date(toDate)
        } catch {}
      }

      return matchSearch && matchType && matchStatus && matchDate
    })
  }, [items, searchTerm, filterType, filterStatus, fromDate, toDate, isStaff, staffId, isBranch, branchId])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return

    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    let attachmentUrl = editingItem?.attachmentUrl || ""

    // Upload file if selected
    if (selectedFile) {
      try {
        const res = await uploadFileToImageKit(selectedFile, `/complaints/${resolvedId}`)
        attachmentUrl = res.url
      } catch (err: any) {
        toast({ variant: "destructive", title: "File upload failed", description: err.message })
      }
    }

    const data = {
      complainBy: formData.get("complainBy") as string,
      phone: formData.get("phone") as string,
      type: formData.get("type") as string,
      status: formData.get("status") as string || "Unsolved",
      date: formData.get("date") as string,
      description: formData.get("description") as string,
      actionTaken: formData.get("actionTaken") as string,
      assigned: formData.get("assigned") as string,
      attachmentUrl,
      branchId: isBranch ? branchId : (editingItem?.branchId || null),
      createdBy: isStaff ? staffId : isBranch ? branchId : "admin",
      updatedAt: Date.now()
    }

    try {
      const dbPath = `Institutes/${resolvedId}/complains`

      if (editingItem) {
        await update(ref(database, `${dbPath}/${editingItem.id}`), data)
        toast({ title: "Complaint Updated Successfully" })
      } else {
        await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
        toast({ title: "New Complaint Added Successfully" })
      }

      setIsModalOpen(false)
      setEditingItem(null)
      setSelectedFile(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to Save Complaint" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete || !database || !resolvedId) return

    setIsDeleting(true)

    try {
      const rootPath = `Institutes/${resolvedId}`
      // Optional: Move to trash before deleting
      await set(push(ref(database, `${rootPath}/trash/complains`)), {
        ...itemToDelete,
        deletedAt: Date.now()
      })

      await remove(ref(database, `${rootPath}/complains/${itemToDelete.id}`))

      toast({ title: "Complaint Moved to Trash" })
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to Delete" })
    } finally {
      setIsDeleting(false)
      setItemToDelete(null)
    }
  }

  const resetFilters = () => {
    setSearchTerm("")
    setFromDate("")
    setToDate("")
    setFilterType("all")
    setFilterStatus("all")
    setCurrentPage(1)
  }

  const downloadSampleCsv = () => {
    const headers = ["Complain_By", "Phone", "Type", "Status", "Date", "Description", "Action_Taken"]
    const sampleData = [["John Doe", "9876543210", "Facility", "Unsolved", today, "AC not working in classroom", "N/A"]]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sample")
    XLSX.writeFile(wb, "complaints_sample.csv")
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !resolvedId || !database) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result as string
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]) as any[]

        const dbPath = `Institutes/${resolvedId}/complains`

        for (const row of data) {
          await push(ref(database, dbPath), {
            complainBy: row.Complain_By || "Imported User",
            phone: row.Phone?.toString() || "",
            type: row.Type || "General",
            status: row.Status || "Unsolved",
            date: row.Date || today,
            description: row.Description || "",
            actionTaken: row.Action_Taken || "",
            createdAt: Date.now(),
            branchId: isBranch ? branchId : null,
            createdBy: isStaff ? staffId : isBranch ? branchId : "admin"
          })
        }

        toast({ 
          title: "Import Successful", 
          description: `${data.length} complaints imported.` 
        })
      } catch (err) {
        toast({ variant: "destructive", title: "Import Failed" })
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const exportExcel = () => {
    if (!filteredItems.length) return

    const ws = XLSX.utils.json_to_sheet(
      filteredItems.map((item, i) => ({
        "Sr No": i + 1,
        "Complain By": item.complainBy,
        "Phone": item.phone,
        "Type": item.type,
        "Status": item.status,
        "Date": item.date,
        "Description": item.description,
        "Action Taken": item.actionTaken || ""
      }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Complaints")
    XLSX.writeFile(wb, `Complaints_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const exportPDF = () => {
    if (!filteredItems.length) return

    const doc = new jsPDF("landscape", "mm", "a4")
    doc.setFontSize(18).text(instituteName, 14, 20)
    doc.setFontSize(12).text("Complaints Report", 14, 30)

    const tableColumn = ["#", "Complain By", "Phone", "Type", "Status", "Date", "Description"]
    const tableRows = filteredItems.map((item, i) => [
      i + 1,
      item.complainBy || "",
      item.phone || "",
      item.type || "",
      item.status || "",
      item.date || "",
      item.description || ""
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 9 }
    })

    doc.save(`Complaints_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[280px]")}>
        <TopNav />

        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <h2 className="text-[22px] font-black text-black tracking-tight">
              Complaints Management ({filteredItems.length})
            </h2>

            <Dialog open={isModalOpen} onOpenChange={(open) => {
              setIsModalOpen(open)
              if (!open) {
                setEditingItem(null)
                setSelectedFile(null)
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setEditingItem(null)}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-8"
                >
                  + New Complaint
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">
                    {editingItem ? "Edit Complaint" : "New Complaint Entry"}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Complain By</Label>
                      <Input name="complainBy" defaultValue={editingItem?.complainBy} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input name="phone" defaultValue={editingItem?.phone} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input name="type" defaultValue={editingItem?.type} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input name="date" type="date" defaultValue={editingItem?.date || today} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select name="status" defaultValue={editingItem?.status || "Unsolved"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unsolved">Unsolved</SelectItem>
                          <SelectItem value="InProgress">In Progress</SelectItem>
                          <SelectItem value="Solved">Solved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned To</Label>
                      <Input name="assigned" defaultValue={editingItem?.assigned} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea name="description" defaultValue={editingItem?.description} required className="min-h-[100px]" />
                  </div>

                  <div className="space-y-2">
                    <Label>Action Taken</Label>
                    <Textarea name="actionTaken" defaultValue={editingItem?.actionTaken} className="min-h-[80px]" />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full h-12">
                    {isSubmitting ? "Saving..." : editingItem ? "Update Complaint" : "Add Complaint"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters Card */}
          <Card className="border-none shadow-sm rounded-3xl bg-white p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Filter Complaints</h3>
              { (fromDate || toDate || searchTerm) && (
                <Button onClick={resetFilters} variant="ghost" className="text-rose-500">
                  Reset Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>From Date</Label>
                <Input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)} 
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)} 
                />
              </div>
            </div>
          </Card>

          {/* Search + Export Buttons */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={downloadSampleCsv}>
                <Download className="mr-2 h-4 w-4" /> Sample CSV
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportCSV} 
                className="hidden" 
                accept=".csv" 
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
              <Button variant="outline" onClick={exportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
              </Button>
              <Button variant="outline" onClick={exportPDF}>
                <FileText className="mr-2 h-4 w-4" /> Export PDF
              </Button>
            </div>
          </div>

          {/* Complaints Table */}
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-10">Sr No.</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Complain By</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right pr-10">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map((row, index) => (
                      <TableRow key={row.id} className="hover:bg-zinc-50">
                        <TableCell className="pl-10 font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setEditingItem(row); setIsModalOpen(true); }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setItemToDelete(row)}
                              className="text-rose-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{row.complainBy}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={row.status === "Solved" ? "default" : "secondary"}>
                            {row.status || "Unsolved"}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell className="text-right pr-10">{row.date}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-zinc-400">
                        No complaints found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
              <span className="px-6 py-2 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Complaint?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the complaint by <strong>{itemToDelete?.complainBy}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}