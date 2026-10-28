
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  GraduationCap,
  ChevronDown,
  Calendar,
  Mail,
  Lock,
  Save,
  Download,
  Upload,
  Filter,
  Eye,
  EyeOff,
  ImageIcon,
  RefreshCcw
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update, get } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"

export default function StudentAdmissionPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) ||
    pathname.startsWith('/staff') ||
    (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [admissions, setAdmissions] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isFilterVisible, setIsFilterVisible] = useState(false)

  // File states
  const [studentPhotoFile, setStudentPhotoFile] = useState<File | null>(null)
  const [idProofFile, setIdProofFile] = useState<File | null>(null)
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null)
  const [motherPhotoFile, setMotherPhotoFile] = useState<File | null>(null)
  const [fatherPhotoFile, setFatherPhotoFile] = useState<File | null>(null)
  const [studentPhotoPreview, setStudentPhotoPreview] = useState<string | null>(null)
  const [motherPhotoPreview, setMotherPhotoPreview] = useState<string | null>(null)
  const [fatherPhotoPreview, setFatherPhotoPreview] = useState<string | null>(null)

  // Board & Class for fee automation
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedBoard, setSelectedBoard] = useState<string>("")

  // Filter states
  const [filterSession, setFilterSession] = useState("all")
  const [filterClass, setFilterClass] = useState("all")
  const [filterSection, setFilterSection] = useState("all")
  const [filterBatch, setFilterBatch] = useState("all")
  const [filterGender, setFilterGender] = useState("all")
  const [filterFromDate, setFilterFromDate] = useState("")
  const [filterToDate, setFilterToDate] = useState("")


  // Fee Calculation States
  const [grandTotal, setGrandTotal] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)



  const [isManageOpen, setIsManageOpen] = useState(false)
  const [activeManageField, setActiveManageField] = useState<{ key: string, label: string } | null>(null)
  const [newOptionValue, setNewOptionValue] = useState("")
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [feeStructure, setFeeStructure] = useState<any[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, branchId, isBranch, isStaff, staffId } = useResolvedId()

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const formatDateDisplay = (dateStr: any) => {
    if (typeof dateStr !== 'string' || !dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };


  const [nextAdmissionNo, setNextAdmissionNo] = useState<string>("1")
  const [nextRollNo, setNextRollNo] = useState<string>("STU_01")

  useEffect(() => {
    if (!database || !resolvedId || editingStudent) return
    const admissionsRef = ref(database, `Institutes/${resolvedId}/admissions`)
    get(admissionsRef).then((snapshot) => {
      if (!snapshot.exists()) {
        setNextRollNo("STU_01")
        setNextAdmissionNo("1")
        return
      }
      const allStudents = snapshot.val()
      const numbers = Object.values(allStudents)
        .map((s: any) => {
          const numPart = s.admissionNo?.toString().replace(/\D/g, '')
          return numPart ? parseInt(numPart, 10) : 0
        })
        .filter(n => !isNaN(n) && n > 0)
      
      const rollNumbers = Object.values(allStudents)
        .map((s: any) => {
          // Extract number from STU_XX format
          const match = s.rollNo?.toString().match(/STU_(\d+)/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(n => !isNaN(n) && n > 0)

      setNextAdmissionNo(numbers.length === 0 ? "1" : (Math.max(...numbers) + 1).toString())
      
      const maxRoll = rollNumbers.length === 0 ? 0 : Math.max(...rollNumbers)
      setNextRollNo(`STU_${(maxRoll + 1).toString().padStart(2, '0')}`)
    })
  }, [database, resolvedId, admissions, editingStudent])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    setIsLoading(true)
    const unsubAdm = onValue(ref(database, `${rootPath}/admissions`), (snapshot) => {
      const data = snapshot.val()
      if (data) setAdmissions(Object.keys(data).map(key => ({ ...data[key], id: key })))
      else setAdmissions([])
      setIsLoading(false)
    })
    const unsubBatches = onValue(ref(database, `${rootPath}/batches`), (snapshot) => {
      const data = snapshot.val()
      if (data) setBatches(Object.keys(data).map(key => ({ ...data[key], id: key })))
      else setBatches([])
    })
    onValue(ref(database, `${rootPath}/profile/instituteName`), (s) => { if (s.exists()) setInstituteName(s.val()) })
    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => { processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value })) })
      setDropdownData(processed)
    })
    const unsubFeeRule = onValue(ref(database, `${rootPath}/fee-structure`), (snapshot) => {
      const data = snapshot.val()
      if (data) setFeeStructure(Object.keys(data).map(key => ({ ...data[key], id: key })))
      else setFeeStructure([])
    })
    return () => { unsubAdm(); unsubBatches(); unsubFeeRule(); }
  }, [database, resolvedId])

  useEffect(() => {
    if (editingStudent) {
      setGrandTotal(Number(editingStudent.totalFees) || 0)
      setDiscount(Number(editingStudent.discount) || 0)
      setSelectedClass(editingStudent.course || "")
      setSelectedBoard(editingStudent.board || "")
    } else {
      setGrandTotal(0); setDiscount(0);
      setSelectedClass(""); setSelectedBoard("")
    }
  }, [editingStudent])

  // Auto-calculate fee based on class + board from dynamic rules
  useEffect(() => {
    if (!selectedClass || feeStructure.length === 0) return
    
    // 1. Find exact match for Std and Board
    let match = feeStructure.find(r => r.std === selectedClass && r.board === selectedBoard)
    
    // 2. If no exact match and board is selected (e.g., GSEB), try a wildcard 'All' rule for that Std
    if (!match && selectedBoard && selectedBoard !== 'All') {
       match = feeStructure.find(r => r.std === selectedClass && r.board === 'All')
    }

    // 3. Last fallback: just find the first rule for this Std if nothing else matches (optional, but safer)
    if (!match) {
       match = feeStructure.find(r => r.std === selectedClass)
    }

    if (match) {
      setGrandTotal(Number(match.amount) || 0)
    }
  }, [selectedClass, selectedBoard, feeStructure])

  const netFees = useMemo(() => Math.max(0, grandTotal - discount), [grandTotal, discount])

  const hasActiveFilters = useMemo(() => {
    return filterSession !== "all" || filterClass !== "all" || filterSection !== "all" || filterBatch !== "all" || filterGender !== "all" || filterFromDate !== "" || filterToDate !== "" || searchTerm !== ""
  }, [filterSession, filterClass, filterSection, filterBatch, filterGender, filterFromDate, filterToDate, searchTerm])

  const resetFilters = () => {
    setFilterSession("all"); setFilterClass("all"); setFilterSection("all"); setFilterBatch("all"); setFilterGender("all"); setFilterFromDate(""); setFilterToDate(""); setSearchTerm(""); setCurrentPage(1);
  }


  const filteredAdmissions = useMemo(() => {
    let list = admissions
    if (isBranch && branchId) list = list.filter(a => a.branchId === branchId)
    return list.filter(a => {
      const matchesSearch = !searchTerm ||
        (a.studentName && a.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.admissionNo && a.admissionNo.toString().toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesSession = filterSession === "all" || a.session === filterSession
      const matchesClass = filterClass === "all" || a.course === filterClass
      const matchesSection = filterSection === "all" || a.section === filterSection
      const matchesBatch = filterBatch === "all" || a.batch === filterBatch
      const matchesGender = filterGender === "all" || a.gender === filterGender
      let matchesDate = true
      if (filterFromDate || filterToDate) {
        if (filterFromDate && a.admissionDate < filterFromDate) matchesDate = false
        if (filterToDate && a.admissionDate > filterToDate) matchesDate = false
      }
      return matchesSearch && matchesSession && matchesClass && matchesSection && matchesBatch && matchesGender && matchesDate
    }).reverse()
  }, [admissions, searchTerm, isBranch, branchId, filterSession, filterClass, filterSection, filterBatch, filterGender, filterFromDate, filterToDate])


  const totalPages = Math.ceil(filteredAdmissions.length / itemsPerPage)
  const paginatedAdmissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAdmissions.slice(start, start + itemsPerPage)
  }, [filteredAdmissions, currentPage])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>, maxSize: number, type: string, minSize: number = 0, previewType: "student" | "mother" | "father" | "none" = "none") => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > maxSize) {
      toast({ variant: "destructive", title: "File too large", description: `${type} max size is ${Math.round(maxSize / (1024 * 1024))}MB` })
      e.target.value = ''
      return
    }
    if (minSize > 0 && file.size < minSize) {
      toast({ variant: "destructive", title: "File too small", description: `${type} min size is ${Math.round(minSize / 1024)}KB` })
      e.target.value = ''
      return
    }
    setter(file)
    if (previewType !== "none") {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (previewType === "student") setStudentPhotoPreview(ev.target?.result as string)
        if (previewType === "mother") setMotherPhotoPreview(ev.target?.result as string)
        if (previewType === "father") setFatherPhotoPreview(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddAdmission = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    let finalAdmissionNo = data.admissionNo?.toString().trim() || (editingStudent ? editingStudent.admissionNo : nextAdmissionNo)
    let finalRollNo = data.rollNo?.toString().trim() || (editingStudent ? editingStudent.rollNo : nextRollNo)
    let finalStudentPhotoUrl = editingStudent?.studentPhotoUrl || ''
    let finalIdProofUrl = editingStudent?.idProofUrl || ''
    let finalAddressProofUrl = editingStudent?.addressProofUrl || ''
    let finalMotherPhotoUrl = editingStudent?.motherPhotoUrl || ''
    let finalFatherPhotoUrl = editingStudent?.fatherPhotoUrl || ''
    const uploadPromises: Promise<void>[] = []
    if (studentPhotoFile) {
      const uploadPhoto = async () => {
        const res = await uploadFileToImageKit(studentPhotoFile, `/admissions/${resolvedId}/photos`)
        finalStudentPhotoUrl = res.url
      }
      uploadPromises.push(uploadPhoto())
    }
    if (idProofFile) {
      const uploadId = async () => {
        const res = await uploadFileToImageKit(idProofFile, `/admissions/${resolvedId}/idproofs`)
        finalIdProofUrl = res.url
      }
      uploadPromises.push(uploadId())
    }
    if (addressProofFile) {
      const uploadAddress = async () => {
        const res = await uploadFileToImageKit(addressProofFile, `/admissions/${resolvedId}/addressproofs`)
        finalAddressProofUrl = res.url
      }
      uploadPromises.push(uploadAddress())
    }
    if (motherPhotoFile) {
      const uploadMother = async () => {
        const res = await uploadFileToImageKit(motherPhotoFile, `/admissions/${resolvedId}/parentphotos`)
        finalMotherPhotoUrl = res.url
      }
      uploadPromises.push(uploadMother())
    }
    if (fatherPhotoFile) {
      const uploadFather = async () => {
        const res = await uploadFileToImageKit(fatherPhotoFile, `/admissions/${resolvedId}/parentphotos`)
        finalFatherPhotoUrl = res.url
      }
      uploadPromises.push(uploadFather())
    }
    if (uploadPromises.length > 0) {
      try { await Promise.all(uploadPromises) } catch (err: any) { toast({ variant: "destructive", title: "Upload Failed", description: err.message }) }
    }
    const dbPath = `Institutes/${resolvedId}/admissions`
    const studentData = {
      ...data, admissionNo: finalAdmissionNo, rollNo: finalRollNo, totalFees: grandTotal, discount: discount, netFees: netFees, studentPhotoUrl: finalStudentPhotoUrl, idProofUrl: finalIdProofUrl, addressProofUrl: finalAddressProofUrl, motherPhotoUrl: finalMotherPhotoUrl, fatherPhotoUrl: finalFatherPhotoUrl,
      board: selectedBoard || data.board || '',
      branchId: isBranch ? branchId : (editingStudent?.branchId || null), createdBy: isStaff ? staffId : isBranch ? branchId : 'admin', updatedAt: Date.now(), status: editingStudent?.status || 'Active', loginStatus: true, courseDurationMonths: data.courseDurationMonths ? Number(data.courseDurationMonths) : null,
    }
    try {
      if (editingStudent) await update(ref(database, `${dbPath}/${editingStudent.id}`), studentData)
      else { 
        const newRef = push(ref(database, dbPath)); 
        await set(newRef, { ...studentData, createdAt: Date.now(), id: newRef.key }) 
      }
      
      // eSSL Machine Integration (for both New and Edit)
      try {
        const { esslService } = await import("@/services/essl-service")
        const machineCode = finalRollNo.replace(/^(STU_|EMP_)/i, '');
        const result = await esslService.addEmployee({
          EmployeeCode: machineCode,
          EmployeeName: (data.studentName as string).substring(0, 24),
          SerialNumber: "NFZ8245102868",
          UserName: "aspireedu",
          UserPassword: "Aspire@123",
          CommandId: "1"
        })
        console.log("Student sync result:", result)
        if (result.success && (result.status === "Success" || result.status?.includes("Success"))) {
          toast({ title: "Machine Synced", description: `${data.studentName} successfully registered on eSSL.` })
        } else {
          toast({ variant: "destructive", title: "Machine Sync Warning", description: `Machine returned: ${result.status || "Unknown status"}. Check console.` })
        }
      } catch (esslErr: any) {
        console.error("Failed to sync student to eSSL:", esslErr)
        toast({ variant: "destructive", title: "eSSL Sync Failed", description: esslErr.message || "Failed to connect to machine." })
      }

      setIsModalOpen(false); setEditingStudent(null); setStudentPhotoPreview(null); setMotherPhotoPreview(null); setFatherPhotoPreview(null);
      toast({ title: editingStudent ? "Student Updated" : "Admission Successful" })
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }) } finally { setIsSubmitting(false) }
  }


  const handleSyncAllStudents = async () => {
    if (!admissions || admissions.length === 0) {
      toast({ title: "No students to sync" });
      return;
    }
    
    if (!confirm(`Are you sure you want to sync ${admissions.length} students to the eSSL machine? This might take a while.`)) {
      return;
    }

    setIsSyncingAll(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const { esslService } = await import("@/services/essl-service");
      
      for (const student of admissions) {
        if (!student.rollNo || !student.studentName) {
          failCount++;
          continue;
        }

        const machineCode = student.rollNo.toString().replace(/^(STU_|EMP_)/i, '');
        
        try {
          const result = await esslService.addEmployee({
            EmployeeCode: machineCode,
            EmployeeName: student.studentName.substring(0, 24), // Machine limit protection
            SerialNumber: "NFZ8245102868",
            UserName: "aspireedu",
            UserPassword: "Aspire@123",
            CommandId: "1"
          });
          
          if (result.success && (result.status === "Success" || result.status?.includes("Success"))) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Failed to sync student ${student.studentName}:`, err);
          failCount++;
        }
      }
      
      toast({ 
        title: "Sync Complete", 
        description: `Successfully synced ${successCount} students. Failed: ${failCount}.` 
      });
      
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: err.message });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this student record and all associated fee history?")) {
      try {
        const studentToDelete = admissions.find(a => a.id === id);
        
        const rootPath = `Institutes/${resolvedId}`;
        const feesRef = ref(database!, `${rootPath}/fees`);
        const snapshot = await get(feesRef);
        
        const updates: any = {};
        updates[`${rootPath}/admissions/${id}`] = null;
        
        if (snapshot.exists()) {
          const allFees = snapshot.val();
          Object.keys(allFees).forEach(feeId => {
            if (allFees[feeId].studentId === id) {
              updates[`${rootPath}/fees/${feeId}`] = null;
            }
          });
        }
        
        await update(ref(database!), updates);
        
        if (studentToDelete && studentToDelete.rollNo) {
          try {
            const { esslService } = await import("@/services/essl-service");
            const machineCode = studentToDelete.rollNo.toString().replace(/^(STU_|EMP_)/i, '');
            await esslService.deleteEmployee({
              EmployeeCode: machineCode,
              SerialNumber: "NFZ8245102868",
              UserName: "aspireedu",
              UserPassword: "Aspire@123"
            });
            console.log(`Successfully removed student ${studentToDelete.studentName} from eSSL machine`);
          } catch (e) {
            console.error("Failed to remove student from eSSL:", e);
          }
        }
        
        toast({ title: "Record and Fee History Deleted" });
      } catch (err: any) {
        toast({ variant: "destructive", title: "Delete Failed", description: err.message });
      }
    }
  };

  const handleSaveOption = () => {
    if (!newOptionValue.trim() || !resolvedId || !database || !activeManageField) return
    const dbPath = `Institutes/${resolvedId}/dropdowns/${activeManageField.key}`
    if (editingOptionId) update(ref(database, `${dbPath}/${editingOptionId}`), { value: newOptionValue.trim() }).then(() => { setNewOptionValue(""); setEditingOptionId(null); })
    else push(ref(database, dbPath), { value: newOptionValue.trim() }).then(() => setNewOptionValue(""))
  }

  const downloadSampleCsv = () => {
    const headers = ["Admission_No", "Roll_No", "Student_Name", "Class", "Course", "Section", "Batch", "Session", "DOB", "Gender", "Religion", "Category", "Blood_Group", "Mobile", "Email", "Father_Name", "Mother_Name", "Father_Mobile", "Address", "Total_Fees", "Discount", "Password", "Course_Duration_Months", "Student_Photo_URL", "ID_Proof_URL", "Address_Proof_URL"]
    const dummy = ["52", "56", "John Doe", "10", "Science", "A", "Morning Batch", "2024-25", "2010-05-15", "Male", "General", "General", "O+", "9876543210", "john.doe@test.com", "Robert Doe", "Mary Doe", "9876543210", "123 Street City", "50000", "500", "password123", "12", "https://picsum.photos/id/64/300/300", "https://example.com/id-proof.pdf", "https://example.com/address-proof.pdf"]
    const csvContent = "data:text/csv;charset=utf-8," + [headers, dummy].map(e => e.join(",")).join("\n")
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "student_admission_sample.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !resolvedId || !database) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: 'binary' }); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); const dbPath = `Institutes/${resolvedId}/admissions`
      for (const row of data as any[]) {
        const studentData = {
          admissionNo: row.Admission_No || `ADM-${Date.now()}`, rollNo: row.Roll_No || "", studentName: row.Student_Name || "Imported Student", class: row.Class || "", course: row.Course || row.Class || "", section: row.Section || "", batch: row.Batch || "", session: row.Session || "", dob: row.DOB || "", gender: row.Gender || "Male", mobile: row.Mobile?.toString() || "", email: row.Email || "", fatherName: row.Father_Name || "", motherName: row.Mother_Name || "", fatherMobile: row.Father_Mobile || "", address: row.Address || "", totalFees: Number(row.Total_Fees) || 0, discount: Number(row.Discount) || 0, netFees: (Number(row.Total_Fees) || 0) - (Number(row.Discount) || 0), password: row.Password || "password123", courseDurationMonths: Number(row.Course_Duration_Months) || null, studentPhotoUrl: row.Student_Photo_URL || "", idProofUrl: row.ID_Proof_URL || "", addressProofUrl: row.Address_Proof_URL || "", status: "Active", loginStatus: true, createdAt: Date.now(), updatedAt: Date.now(), branchId: isBranch ? branchId : null, createdBy: 'admin'
        }
        await push(ref(database, dbPath), studentData)
        
        // eSSL Machine Integration for each imported student
        try {
          const { esslService } = await import("@/services/essl-service")
          await esslService.addEmployee({
            EmployeeCode: studentData.rollNo,
            EmployeeName: studentData.studentName,
            Department: studentData.course || "Student",
            Designation: "Student",
            Category: "Student",
            SerialNumber: "NFZ8245102868",
            UserName: "aspireedu",
            UserPassword: "Aspire@123",
            CommandId: "1002"
          })
        } catch (esslErr) {
          console.error(`Failed to sync imported student ${studentData.studentName} to eSSL:`, esslErr)
        }
      }
      toast({ title: "Import Successful", description: `${data.length} records processed.` })
    }
    reader.readAsBinaryString(file); e.target.value = ""
  }

  const exportExcel = () => {
    if (!filteredAdmissions.length) return
    const ws = XLSX.utils.json_to_sheet(filteredAdmissions.map((a, i) => ({ "Sr No": i + 1, "Student Name": a.studentName, "Admission No": a.admissionNo, "Roll No": a.rollNo || '-', "Class/Course": a.course, "Batch": a.batch || '-', "Session": a.session || '-', "Mobile": a.mobile, "Email": a.email, "Father Name": a.fatherName || '-', "Mother Name": a.motherName || '-', "Father Mobile": a.fatherMobile || '-', "Mother Mobile": a.motherMobile || '-', "Net Fees": a.netFees || 0 })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Students_Full_Data"); XLSX.writeFile(wb, `Student_Registry_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }


  const exportPDF = () => {
    if (!filteredAdmissions.length) return
    const doc = new jsPDF('l', 'mm', [450, 210]); doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20); doc.setFontSize(10).setTextColor(100).text(`Student Master Registry - Generated: ${format(new Date(), "PPp")}`, 14, 28)
    const tableData = filteredAdmissions.map((a, i) => [i + 1, a.studentName, a.admissionNo, a.rollNo || '-', a.course, a.batch || '-', a.mobile, a.fatherName || '-', a.motherName || '-', a.fatherMobile || '-', a.motherMobile || '-', a.netFees || 0])
    autoTable(doc, { startY: 35, head: [['#', 'Name', 'Adm No', 'Roll', 'Class', 'Batch', 'Mobile', 'Father', 'Mother', 'Father Mob', 'Mother Mob', 'Fee']], body: tableData, theme: 'striped', headStyles: { fillColor: [13, 148, 136], fontSize: 8 }, styles: { fontSize: 7, cellPadding: 2 } })
    doc.save(`Student_Registry_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }


  const openManageModal = (key: string, label: string) => { setActiveManageField({ key, label }); setNewOptionValue(""); setEditingOptionId(null); setIsManageOpen(true); }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[280px]")}>
        {!isPortal && <TopNav />}
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Admission Management ({filteredAdmissions.length})</h2>
              <p className="text-[14px] text-black font-medium mt-1">Enrollment registry and student lifecycle tracking</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSyncAllStudents} 
                disabled={isSyncingAll}
                variant="outline"
                className="rounded-xl h-11 px-6 font-medium text-[14px] border-zinc-200 hover:bg-zinc-50 shadow-sm text-indigo-600 bg-white transition-all active:scale-95"
              >
                {isSyncingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                Sync All to Machine
              </Button>
            <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setEditingStudent(null); setStudentPhotoFile(null); setStudentPhotoPreview(null); setMotherPhotoPreview(null); setFatherPhotoPreview(null); setIdProofFile(null); setAddressProofFile(null); setMotherPhotoFile(null); setFatherPhotoFile(null); setSelectedClass(""); setSelectedBoard(""); } }}>
              <DialogTrigger asChild>
                <button onClick={() => { setEditingStudent(null); setGrandTotal(0); setDiscount(0); setStudentPhotoFile(null); setStudentPhotoPreview(null); setMotherPhotoPreview(null); setFatherPhotoPreview(null); setIdProofFile(null); setAddressProofFile(null); setMotherPhotoFile(null); setFatherPhotoFile(null); setSelectedClass(""); setSelectedBoard(""); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-medium text-[14px] border-none shadow-lg active:scale-95 transition-all">
                  Add New
                </button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-4xl p-0 border border-zinc-200 rounded-[40px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
                <div className="bg-white px-10 py-8 border-b border-zinc-100 flex items-center justify-between sticky top-0 z-50">
                  <DialogTitle className="text-2xl font-black tracking-tight">{editingStudent ? 'Update Student Profile' : 'New Admission Registration'}</DialogTitle>
                </div>
                <ScrollArea className="flex-1 w-full text-black" type="always">
                  <form onSubmit={handleAddAdmission} className="p-10 space-y-12">
                    <div className="space-y-8">
                      <h3 className="text-[14px] font-bold text-[hsl(var(--primary))] tracking-[0.2em] border-b border-zinc-50 pb-2">Academic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Admission No. *</Label><Input name="admissionNo" defaultValue={editingStudent?.admissionNo || nextAdmissionNo} required className="rounded-xl border-zinc-200 h-12 font-normal text-black text-[14px] focus-visible:ring-primary" placeholder={editingStudent ? "" : "Auto-generated"} /></div>
                        <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Roll No *</Label><Input name="rollNo" defaultValue={editingStudent?.rollNo || nextRollNo} required className="rounded-xl border-zinc-200 h-12 font-normal text-black text-[14px] focus-visible:ring-primary" placeholder={editingStudent ? "" : "Auto-generated"} /></div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center px-1">
                            <Label className="text-[12px] font-medium text-black">Std *</Label>
                            <button type="button" onClick={() => openManageModal('course', 'Std')} className="text-[11px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
                          </div>
                          <Select name="course" value={selectedClass} onValueChange={(val) => { setSelectedClass(val); setSelectedBoard(""); setGrandTotal(0); }} required>
                            <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-normal text-black focus:ring-primary transition-none bg-white text-[15px]"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="rounded-xl border-zinc-100 shadow-xl">{(dropdownData['course'] || []).map((opt: any) => <SelectItem key={opt.id} value={opt.value} className="rounded-lg text-[15px] font-bold">{opt.value}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center px-1">
                            <Label className="text-[12px] font-medium text-black">Board</Label>
                            <button type="button" onClick={() => openManageModal('board', 'Board')} className="text-[11px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
                          </div>
                          <Select name="board" value={selectedBoard} onValueChange={(val) => setSelectedBoard(val)}>
                            <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-normal text-black focus:ring-primary transition-none bg-white text-[15px]"><SelectValue placeholder="Select Board" /></SelectTrigger>
                            <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                              {(dropdownData['board'] || []).map((opt: any) => <SelectItem key={opt.id} value={opt.value} className="rounded-lg text-[15px] font-bold">{opt.value}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <FormSelect label="Section" name="section" defaultValue={editingStudent?.section} options={dropdownData['section'] || []} onManage={() => openManageModal('section', 'Section')} />
                        <FormSelect label="Batch" name="batch" defaultValue={editingStudent?.batch} options={batches.map(b => ({ id: b.id, value: b.batchName, label: `${b.batchName} - ${b.courseName}` }))} required />
                        <FormSelect label="Admission Session" name="session" defaultValue={editingStudent?.session} options={dropdownData['session'] || []} onManage={() => openManageModal('session', 'Session')} required />
                        <FormGroup label="Admission Date" name="admissionDate" type="date" defaultValue={editingStudent?.admissionDate || today} required />
                        <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Course Duration (months)</Label><Input name="courseDurationMonths" type="number" defaultValue={editingStudent?.courseDurationMonths || ""} placeholder="e.g. 12" className="rounded-xl border-zinc-200 h-12 font-normal text-black text-[14px] focus-visible:ring-primary" onWheel={(e) => e.currentTarget.blur()} /></div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h3 className="text-[14px] font-bold text-[#6366F1] tracking-[0.2em] border-b border-zinc-50 pb-2">Personal Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormGroup label="Student Name" name="studentName" defaultValue={editingStudent?.studentName} required />
                        <FormGroup label="Date Of Birth" name="dob" type="date" defaultValue={editingStudent?.dob} required />
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-medium text-black ml-1">Gender</Label>
                          <Select name="gender" defaultValue={editingStudent?.gender || "Male"}>
                            <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-normal text-black focus:ring-primary transition-none bg-white text-[15px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                              <SelectItem value="Male" className="rounded-lg text-[15px] font-bold">Male</SelectItem>
                              <SelectItem value="Female" className="rounded-lg text-[15px] font-bold">Female</SelectItem>
                              <SelectItem value="Other" className="rounded-lg text-[15px] font-bold">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormSelect label="School Name" name="schoolName" defaultValue={editingStudent?.schoolName} options={dropdownData['schoolName'] || []} onManage={() => openManageModal('schoolName', 'School Name')} />
                        <FormGroup label="Mobile Number" name="mobile" type="tel" defaultValue={editingStudent?.mobile} required />
                        <div className="md:col-span-2"><FormGroup label="Permanent Address" name="address" defaultValue={editingStudent?.address} /></div>
                      </div>

                    </div>

                    <div className="space-y-8">
                      <h3 className="text-[14px] font-bold text-[#1e3a8a] tracking-[0.2em] border-b border-zinc-50 pb-2">Parent / Family Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        <FormGroup label="Mother's Name" name="motherName" defaultValue={editingStudent?.motherName} />
                        <FormGroup label="Mother's Occupation" name="motherOccupation" defaultValue={editingStudent?.motherOccupation} />
                        <FormGroup label="Mother Contact Number" name="motherMobile" type="tel" defaultValue={editingStudent?.motherMobile} />
                        <FormGroup label="Father's Name" name="fatherName" defaultValue={editingStudent?.fatherName} />
                        <FormGroup label="Father's Occupation" name="fatherOccupation" defaultValue={editingStudent?.fatherOccupation} />
                        <FormGroup label="Father Contact Number" name="fatherMobile" type="tel" defaultValue={editingStudent?.fatherMobile} />
                      </div>
                    </div>


                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                        <h3 className="text-[14px] font-bold text-indigo-600 tracking-[0.2em]">Student Fee Details</h3>
                        {selectedClass && (
                          <span className="text-[11px] font-bold text-indigo-400 bg-indigo-50 px-3 py-1 rounded-full">
                            Auto-calculated for {selectedClass}{selectedBoard ? ` · ${selectedBoard}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-medium text-black ml-1">Grand Total Fee</Label>
                          <Input type="number" value={grandTotal === 0 ? '' : grandTotal} onChange={(e) => setGrandTotal(Number(e.target.value))} required className="h-12 rounded-xl border-zinc-200 font-bold" placeholder="0" onWheel={(e) => e.currentTarget.blur()} />
                          <p className="text-[10px] text-zinc-400 ml-1">Auto-filled from fee structure. You can override manually.</p>
                        </div>
                        <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Applicable Discount</Label><Input type="number" value={discount === 0 ? '' : discount} onChange={(e) => setDiscount(Number(e.target.value))} className="h-12 rounded-xl border-zinc-200" placeholder="0" onWheel={(e) => e.currentTarget.blur()} /></div>
                        <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Net Total Fee</Label><Input type="number" value={netFees === 0 ? '' : netFees} readOnly className="h-12 rounded-xl border-none bg-zinc-50 font-black text-[hsl(var(--primary))] shadow-inner" placeholder="0" onWheel={(e) => e.currentTarget.blur()} /></div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h3 className="text-[14px] font-bold text-[#1e3a8a] tracking-[0.2em] border-b border-zinc-50 pb-2">Portal Credentials</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5"><Label className="text-[12px] font-black text-black tracking-widest ml-1">Portal Login Email *</Label><div className="relative group"><Mail className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[#1e3a8a] transition-colors" /><Input name="email" type="email" defaultValue={editingStudent?.email} required className="pl-12 h-12 rounded-xl font-bold text-black" /></div></div>
                        <div className="space-y-1.5"><Label className="text-[12px] font-medium text-black ml-1">Access Password *</Label><div className="relative group"><Lock className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[#1e3a8a] transition-colors" /><Input name="password" type={showPassword ? "text" : "password"} defaultValue={editingStudent?.password} required className="rounded-xl border-zinc-200 h-12 font-bold text-black text-[14px] focus-visible:ring-primary pl-12 pr-12 bg-white" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-black hover:text-black outline-none transition-none">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                      </div>
                    </div>

                    <div className="pt-4 pb-10">
                      <Button type="submit" disabled={isSubmitting} className="bg-primary hover:opacity-90 text-white rounded-xl h-14 px-12 font-black text-[14px] tracking-widest shadow-xl border-none active:scale-95 transition-all">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Submit Now
                      </Button>
                    </div>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-black font-inter" style={{ fontWeight: 500 }}>Select Criteria</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFilterVisible(!isFilterVisible)}
                  className={cn(
                    "h-8 px-3 rounded-lg text-[10px] font-black  tracking-widest gap-2 transition-all",
                    isFilterVisible ? "bg-primary text-white" : "bg-zinc-50 text-black hover:bg-zinc-100"
                  )}
                >
                  <Filter className="w-3 h-3" /> {isFilterVisible ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>
              {hasActiveFilters && (
                <Button onClick={resetFilters} variant="ghost" className="h-8 px-4 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-normal gap-2 transition-all">
                  Reset Filters <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {isFilterVisible && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 animate-in slide-in-from-top-2 duration-300">
                <CriteriaRadioBox label="Admission Session" value={filterSession} onChange={setFilterSession} options={dropdownData['session'] || []} />
                <CriteriaRadioBox label="Class" value={filterClass} onChange={setFilterClass} options={dropdownData['course'] || []} />
                <CriteriaRadioBox label="Section" value={filterSection} onChange={setFilterSection} options={dropdownData['section'] || []} />
                <CriteriaRadioBox label="Batch" value={filterBatch} onChange={setFilterBatch} options={batches.map(b => ({ id: b.id, value: b.batchName }))} />
                <CriteriaRadioBox label="Gender" value={filterGender} onChange={setFilterGender} options={[{ id: 'Male', value: 'Male' }, { id: 'Female', value: 'Female' }, { id: 'Other', value: 'Other' }]} />

                <div className="space-y-2"><Label className="text-[11px] font-medium text-black tracking-widest ml-1">From Date</Label><div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-300 pointer-events-none" /><Input type="date" value={filterFromDate} onChange={(e) => { setFilterFromDate(e.target.value); setCurrentPage(1); }} className="h-11 pl-10 rounded-xl border-zinc-200 bg-white text-[14px] font-medium shadow-inner" /></div></div>
                <div className="space-y-2"><Label className="text-[11px] font-medium text-black tracking-widest ml-1">To Date</Label><div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-300 pointer-events-none" /><Input type="date" value={filterToDate} onChange={(e) => { setFilterToDate(e.target.value); setCurrentPage(1); }} className="h-10 pl-10 rounded-xl border-zinc-200 bg-white text-[14px] font-medium shadow-inner" /></div></div>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <div className="relative group w-full md:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-black group-focus-within:text-primary transition-colors" />
                <Input placeholder="Search Registry..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10 h-11 bg-white border-zinc-200 rounded-lg text-[14px] font-medium transition-none focus-visible:ring-primary shadow-sm" />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" onClick={downloadSampleCsv} className="h-11 px-5 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 rounded-xl transition-none gap-2 font-normal text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><Download className="h-4 w-4" /> Sample Csv</Button>
                <input type="file" ref={fileInputRef} onChange={handleImportCsv} className="hidden" accept=".csv" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 px-5 text-indigo-600 border-indigo-100 rounded-xl transition-none gap-2 font-normal text-[14px] bg-white hover:bg-indigo-50 shadow-sm"><Upload className="h-4 w-4" /> Import Csv</Button>
                <Button variant="outline" onClick={exportExcel} className="h-11 px-5 text-emerald-600 border-emerald-100 rounded-xl transition-none gap-2 font-normal text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
                <Button variant="outline" onClick={exportPDF} className="h-11 px-4 text-rose-600 border-rose-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] bg-white hover:bg-rose-50 shadow-sm"><FileText className="h-4 w-4" /> Export Pdf</Button>
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="lg:min-w-[3800px]">
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100">
                      <TableHead className="pl-8 text-[14px] font-medium text-black h-14 w-20">SR NO</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">ACTION</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">STUDENT NAME</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">ADMISSION NO</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">ROLL NO</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">CLASS</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">SECTION</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">BATCH</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">SESSION</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">MOBILE</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">EMAIL</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">GENDER</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">DOB</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">FATHER NAME</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">FATHER MOBILE</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">MOTHER NAME</TableHead>
                      <TableHead className="text-[14px] font-medium text-black h-14">NET FEES</TableHead>
                      <TableHead className="text-right pr-8 text-[14px] font-medium text-black h-14">ADDRESS</TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAdmissions.map((row, index) => (
                      <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                        <TableCell data-label="SR NO" className="text-[14px] font-medium text-black pl-8">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell data-label="ACTION"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" asChild title="View Profile" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 transition-none"><Link href={`/student-information/admission/${row.id}`}><Eye className="h-4 w-4" /></Link></Button><Button variant="ghost" size="icon" onClick={() => { setEditingStudent(row); setIsModalOpen(true); }} className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                        <TableCell data-label="STUDENT NAME" className="text-[14px] font-bold text-black">{row.studentName}</TableCell>
                        <TableCell data-label="ADMISSION NO" className="text-[14px] font-medium text-black font-public-sans tracking-tighter">{row.admissionNo}</TableCell>
                        <TableCell data-label="ROLL NO" className="text-[14px] text-black">{row.rollNo || '-'}</TableCell>
                        <TableCell data-label="CLASS" className="text-[14px] font-medium text-black">{row.course}</TableCell>
                        <TableCell data-label="SECTION" className="text-[14px] text-black">{row.section || 'A'}</TableCell>
                        <TableCell data-label="BATCH" className="text-[14px] text-black">{row.batch || '-'}</TableCell>
                        <TableCell data-label="SESSION" className="text-[14px] text-black">{row.session || '-'}</TableCell>
                        <TableCell data-label="MOBILE" className="text-[14px] text-black">{row.mobile}</TableCell>
                        <TableCell data-label="EMAIL" className="text-[14px] text-black lowercase">{row.email}</TableCell>
                        <TableCell data-label="GENDER" className="text-[14px] text-black">{row.gender}</TableCell>
                        <TableCell data-label="DOB" className="text-[14px] text-black">{formatDateDisplay(row.dob)}</TableCell>
                        <TableCell data-label="FATHER NAME" className="text-[14px] text-black">{row.fatherName || '-'}</TableCell>
                        <TableCell data-label="FATHER MOBILE" className="text-[14px] text-black">{row.fatherMobile || '-'}</TableCell>
                        <TableCell data-label="MOTHER NAME" className="text-[14px] text-black">{row.motherName || '-'}</TableCell>
                        <TableCell data-label="NET FEES" className="text-[14px] font-black text-emerald-600">₹{Number(row.netFees || 0).toLocaleString()}</TableCell>
                        <TableCell data-label="ADDRESS" className="text-right pr-8 text-[14px] text-black italic max-w-[250px] truncate" title={row.address}>{row.address || '-'}</TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-normal text-[10px] tracking-widest transition-none"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
                <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-normal transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100 hover:bg-zinc-50")}>{i + 1}</button>))}</div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-normal text-[10px] tracking-widest transition-none">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-[32px] p-0 bg-white border border-zinc-200 shadow-2xl max-h-[95vh] flex flex-col">
          <div className="bg-white px-8 py-6 border-b border-zinc-100">
            <DialogTitle className="text-xl font-black tracking-tight">Manage {activeManageField?.label}</DialogTitle>
          </div>
          <div className="p-8 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 text-black">
            <div className="flex gap-2 mb-8">
              <Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="Enter new..." className="rounded-xl h-12 border-zinc-200 font-bold" />
              <Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none shadow-lg active:scale-95 transition-all font-bold">Add</Button>
            </div>
            <ScrollArea className="h-64 pr-4" type="always">
              <div className="space-y-2">
                {(dropdownData[activeManageField?.key || ''] || []).map(opt => (
                  <div key={opt.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all">
                    <span className="text-[14px] font-normal text-black">{opt.value}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="text-blue-500 h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/dropdowns/${activeManageField!.key}/${opt.id}`))} className="text-rose-500 h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
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
          <ScrollArea className="h-64" type="always">
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
function FormGroup({ label, name, type = "text", required = false, defaultValue }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-black ml-1">{label} {required && "*"}</Label>
      <Input name={name} type={type} required={required} defaultValue={defaultValue} className="rounded-xl border-zinc-200 h-12 font-normal text-black text-[14px] focus-visible:ring-primary" />
    </div>
  )
}
function FormSelect({ label, name, options, onManage, defaultValue, required = false }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <Label className="text-[12px] font-medium text-black">{label} {required && "*"}</Label>
        {onManage && <button type="button" onClick={onManage} className="text-[11px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>}
      </div>
      <Select name={name} defaultValue={defaultValue} required={required}>
        <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-normal text-black focus:ring-primary transition-none bg-white text-[15px]"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent className="rounded-xl border-zinc-100 shadow-xl">{options.map((opt: any) => (<SelectItem key={opt.id} value={opt.value} className="rounded-lg text-[15px] font-bold">{opt.value}</SelectItem>))}</SelectContent>
      </Select>
    </div>
  )
} 
