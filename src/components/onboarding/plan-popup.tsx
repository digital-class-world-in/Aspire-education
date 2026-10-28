
"use client"

import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Globe, 
  Zap, 
  ArrowRight,
  Loader2,
  X,
  CheckCircle2,
  Building2,
  Send,
  Smartphone,
  Download,
  QrCode,
  Copy,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  FileText,
  UserPlus
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, update, push } from "firebase/database"
import { addDays, format } from "date-fns"
import { cn } from "@/lib/utils"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription, 
  DialogClose 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const RZP_KEY_ID = "rzp_live_4qfGb2EYyvLtUv";

const PLANS = [
  {
    id: "starter",
    name: "Start as Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    saveText: "",
    features: [
      "Limited Dashboard Access",
      "Add Students Registry",
      "Basic ERP Modules",
      "3 Day Global Trial"
    ],
    buttonText: "Start 3-Day Free Trial",
    color: "bg-zinc-50",
    icon: <Zap className="w-5 h-5 text-amber-500" />
  },
  {
    id: "website",
    name: "Starter Website",
    monthlyPrice: 699,
    yearlyPrice: 6999,
    saveText: "Save 17% on annual billing",
    features: [
      "Basic Website",
      "Institute Profile Page",
      "Student Inquiry Leads",
      "Standard Support"
    ],
    buttonText: "Pay Now",
    color: "bg-blue-50/50",
    icon: <Globe className="w-5 h-5 text-blue-500" />
  },
  {
    id: "erp",
    name: "Cloud ERP",
    monthlyPrice: 1999,
    yearlyPrice: 18000,
    saveText: "Save 25% on annual billing",
    features: [
      "Full ERP Features",
      "Mobile App (Shared)",
      "Priority Support",
      "Marketplace Listing"
    ],
    buttonText: "Pay Now",
    color: "bg-emerald-50/50",
    icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />
  },
  {
    id: "white_label",
    name: "White Label Pro",
    monthlyPrice: 4999,
    yearlyPrice: 39000,
    saveText: "Save 35% on annual billing",
    popular: true,
    features: [
      "Dedicated Mobile App",
      "Full Website Branding",
      "Advanced AI Features",
      "Fast Priority Support"
    ],
    buttonText: "Pay Now",
    color: "bg-indigo-50/50",
    icon: <Sparkles className="w-5 h-5 text-indigo-500" />
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      "All Pro Features",
      "Dedicated Support",
      "Custom Development",
      "Full Branding & Scalability"
    ],
    buttonText: "Contact Sales",
    color: "bg-white",
    custom: true,
    icon: <Building2 className="w-5 h-5 text-primary" />
  }
]

const COMPARISON_FEATURES = [
  { label: "Best For", w: "Small Institutes", erp: "Growing Institutes", wl: "Branded Platform", ent: "Large Institutions" },
  { label: "Yearly Price", w: "₹6,999 / year", erp: "₹18,000 / year", wl: "₹39,000 / year", ent: "Custom" },
  { label: "Annual Price", w: "₹6,999 / year", erp: "₹18,000 / year", wl: "₹39,000 / year", ent: "Custom" },
  { label: "Annual Discount", w: "Save 17%", erp: "Save 25%", wl: "Save 35%", ent: "Custom" },
  { label: "Student Management", w: false, erp: true, wl: true, ent: true },
  { label: "Batch Management", w: false, erp: true, wl: true, ent: true },
  { label: "Fees & Collections", w: false, erp: true, wl: true, ent: true },
  { label: "Attendance System", w: false, erp: true, wl: true, ent: true },
  { label: "Exams & Marksheet", w: false, erp: true, wl: true, ent: true },
  { label: "Study Material / E-Content", w: false, erp: true, wl: true, ent: true },
  { label: "E-Library", w: false, erp: true, wl: true, ent: true },
  { label: "Live Classes", w: false, erp: "Limited", wl: true, ent: true },
  { label: "Mobile App Access", w: false, erp: "Shared App", wl: "Dedicated App", ent: "Dedicated" },
  { label: "Branch Management", w: false, erp: false, wl: true, ent: true },
  { label: "HR Management", w: false, erp: false, wl: true, ent: true },
  { label: "Inventory Management", w: false, erp: false, wl: true, ent: true },
  { label: "Accounts & Billing", w: false, erp: "Limited", wl: true, ent: true },
  { label: "Announcements & Notifications", w: false, erp: true, wl: true, ent: true },
  { label: "Certificates Generator", w: false, erp: true, wl: true, ent: true },
  { label: "Holiday Calendar", w: false, erp: true, wl: true, ent: true },
  { label: "Database Backup", w: false, erp: true, wl: true, ent: "Full" },
  { label: "Institute Branding", w: "Standard", erp: "Limited", wl: "Full Priority", ent: "Full" },
  { label: "Technical Support", w: "Standard", erp: "Priority", wl: "Fast Priority", ent: "Dedicated" },
  { label: "Digital Class Marketplace Listing", w: true, erp: true, wl: true, ent: true },
  { label: "Institute Profile Page", w: true, erp: true, wl: true, ent: true },
  { label: "Student Inquiry Leads (Via MP)", w: true, erp: true, wl: true, ent: true },
  { label: "Institute Website", w: "Basic Website", erp: "Advanced Website", wl: "Full Website", ent: "Custom" },
  { label: "Custom Domain", w: "Optional", erp: true, wl: true, ent: true },
]

interface OnboardingPopupProps {
  instituteName: string
  hideStarter?: boolean
  onClose?: () => void
}

export function OnboardingPopup({ instituteName, hideStarter = false, onClose }: OnboardingPopupProps) {
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    setMounted(true)
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.style.overflow = originalStyle;
      if (document.body && script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const availablePlans = useMemo(() => {
    if (hideStarter) return PLANS.filter(p => p.id !== 'starter')
    return PLANS
  }, [hideStarter])

  const calculatePrice = (plan: any) => {
    if (plan.monthlyPrice === null) return "Custom"
    return billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
  }

  const getOriginalAnnual = (plan: any) => {
    if (plan.monthlyPrice === null) return 0
    return plan.monthlyPrice * 12
  }

  const generateReceipt = (amount: number, planName: string) => {
    const doc = new jsPDF()
    const now = format(new Date(), "PPpp")
    const receiptNo = `INV-${Date.now()}`

    doc.setFillColor(13, 148, 136).rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255).setFontSize(22).setFont("helvetica", "bold")
    doc.text(instituteName.toUpperCase(), 20, 25)
    doc.setFontSize(10).text("Payment Confirmation Receipt", 20, 32)

    doc.setTextColor(0).setFontSize(14).text("Billed To:", 20, 60)
    doc.setFontSize(10).setFont("helvetica", "normal")
    doc.text(`Email: ${user?.email || 'N/A'}`, 20, 70)
    doc.text(`Transaction ID: ${receiptNo}`, 20, 77)
    doc.text(`Date: ${now}`, 20, 84)

    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Cycle', 'Amount']],
      body: [
        [`Subscription: ${planName}`, billingCycle.toUpperCase(), `INR ${amount.toLocaleString()}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.setFontSize(16).setFont("helvetica", "bold").text(`TOTAL PAID: INR ${amount.toLocaleString()}`, 20, finalY)
    
    doc.save(`Receipt_${instituteName.replace(/\s+/g, '_')}.pdf`)
  }

  const handleFreeTrial = async (plan: any) => {
    if (!database || !user) return
    setIsProcessing(true)
    try {
      const trialExpiry = addDays(new Date(), 3).toISOString()
      const rootPath = `Institutes/${user.uid}/profile`
      
      await update(ref(database, rootPath), {
        plan_selected: true,
        selected_plan: plan.id,
        currentPlan: plan.name + " (Trial)",
        planExpiryDate: trialExpiry,
        onboarding_completed: true, 
        updatedAt: Date.now()
      })

      toast({ title: "Trial Activated", description: "Your 3-day access has started." })
      
      setTimeout(() => {
        if (onClose) onClose()
        else window.location.assign("/")
      }, 500)
    } catch (e) {
      toast({ variant: "destructive", title: "Activation Failed" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRazorpayPayment = async (plan: any) => {
    if (plan.id === 'starter') {
      handleFreeTrial(plan)
      return
    }

    const amount = calculatePrice(plan)
    if (typeof amount === 'string') {
      setIsContactModalOpen(true)
      return
    }

    setIsProcessing(true)

    const options = {
      key: RZP_KEY_ID,
      amount: amount * 100,
      currency: "INR",
      name: "Digital Class",
      description: `${plan.name} - ${billingCycle} Subscription`,
      handler: async function (response: any) {
        try {
          const expiryDate = billingCycle === 'yearly' 
            ? addDays(new Date(), 365).toISOString() 
            : addDays(new Date(), 30).toISOString()
          
          const rootPath = `Institutes/${user?.uid}/profile`
          await update(ref(database!, rootPath), {
            plan_selected: true,
            selected_plan: plan.id,
            currentPlan: plan.name,
            planExpiryDate: expiryDate,
            paidFees: amount,
            netFees: amount,
            lastTxId: response.razorpay_payment_id,
            onboarding_completed: true,
            updatedAt: Date.now()
          })

          await push(ref(database!, 'MasterPayments'), {
            instId: user?.uid,
            instituteName,
            planType: plan.name,
            paidAmount: amount,
            status: "Paid",
            txId: response.razorpay_payment_id,
            date: format(new Date(), "yyyy-MM-dd"),
            createdAt: Date.now()
          })

          generateReceipt(amount, plan.name)
          toast({ title: "Payment Successful", description: "Welcome to the premium tier." })
          
          localStorage.setItem('just_upgraded', 'true')

          setTimeout(() => {
            if (onClose) onClose()
            else window.location.assign("/")
          }, 500)
        } catch (err) {
          toast({ variant: "destructive", title: "Sync Error" })
        } finally {
          setIsProcessing(false)
        }
      },
      prefill: {
        email: user?.email,
        contact: ""
      },
      theme: {
        color: "hsl(var(--primary))"
      },
      modal: {
        ondismiss: () => setIsProcessing(false)
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !user) return
    setIsProcessing(true)
    
    const formData = new FormData(e.currentTarget)
    const inquiry = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: `ENTERPRISE PLAN INQUIRY: ${formData.get("remark")}`,
      submittedAt: new Date().toISOString(),
      status: "Enterprise Lead"
    }

    try {
      await push(ref(database, `Institutes/${user.uid}/website_inquiries`), inquiry)
      toast({ title: "Request Sent", description: "Our enterprise team will reach out shortly." })
      setIsContactModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to send" })
    } finally {
      setIsProcessing(false)
    }
  }

  const renderCellValue = (val: any) => {
    if (typeof val === 'boolean') {
      return val ? (
        <Check className="w-5 h-5 text-green-500 mx-auto stroke-[3px]" />
      ) : (
        <X className="w-5 h-5 text-rose-500 mx-auto stroke-[2px]" />
      );
    }
    
    return (
      <span className={cn(
        "text-[14px] font-bold",
        val === "Limited" ? "text-amber-500" : "text-black"
      )}>
        {val}
      </span>
    );
  };

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 bg-[#F8FAFC]/95 backdrop-blur-3xl animate-in fade-in duration-500 font-public-sans text-black overflow-hidden">
      <Card className="w-full max-w-[95vw] xl:max-w-[85vw] 2xl:max-w-[65vw] border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] rounded-[48px] bg-white overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh] relative">
        
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full -mr-64 -mt-64 blur-3xl" />

        {onClose && (
          <button 
            onClick={onClose}
            className="absolute right-10 top-10 z-50 p-2.5 rounded-full hover:bg-zinc-50 text-zinc-300 hover:text-black transition-all border-none bg-transparent cursor-pointer shadow-sm"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          <div className="p-8 lg:px-10 lg:py-12 space-y-10 relative z-10">
            <div className="text-center space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-black tracking-tight leading-none">
                  Welcome to {instituteName}! 🎉
                </h2>
                <p className="text-[13px] text-primary font-black tracking-[0.25em]">
                  Select your pricing plans!
                </p>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-50 rounded-full border border-zinc-100 shadow-inner">
                  <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={cn(
                      "text-[10px] font-black  tracking-widest px-6 py-2 rounded-full transition-all border-none outline-none cursor-pointer", 
                      billingCycle === 'monthly' ? "bg-white text-primary shadow-md" : "text-black"
                    )}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setBillingCycle('yearly')}
                    className={cn(
                      "text-[10px] font-black  tracking-widest px-6 py-2 rounded-full transition-all flex items-center gap-2 border-none outline-none cursor-pointer", 
                      billingCycle === 'yearly' ? "bg-white text-primary shadow-md" : "text-black"
                    )}
                  >
                    Yearly <span className="text-[7px] text-emerald-500 font-black">SAVE UP TO 35%</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap lg:flex-nowrap justify-center gap-4 xl:gap-5 px-4 lg:px-0">
              {availablePlans.map((plan) => {
                const displayPrice = calculatePrice(plan)
                const originalAnnual = getOriginalAnnual(plan)
                
                return (
                  <Card 
                    key={plan.id}
                    className={cn(
                      "relative p-6 xl:p-8 rounded-[40px] border-2 transition-all duration-500 flex flex-col justify-between w-full sm:w-[280px] lg:w-[240px] xl:w-[245px] group shrink-0",
                      plan.popular ? "border-primary shadow-2xl scale-[1.03] bg-white z-20" : "border-transparent bg-zinc-50/30 hover:border-primary/20 hover:bg-white hover:shadow-xl",
                      plan.custom && "border-dashed border-zinc-200"
                    )}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white border-none px-5 py-1.5 text-[9px] font-black tracking-widest shadow-lg">POPULAR</Badge>
                    )}
                    
                    <div className="space-y-8 flex-1">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", plan.color)}>
                        {plan.icon}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-[15px] font-black tracking-tight text-black">{plan.name}</h4>
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            {billingCycle === 'yearly' && originalAnnual > 0 && (
                              <span className="text-[14px] font-bold text-zinc-300 line-through">₹{originalAnnual.toLocaleString()}</span>
                            )}
                            <span className="text-3xl font-black text-black tracking-tighter">
                              {displayPrice === "Custom" ? "Custom" : `₹${displayPrice.toLocaleString()}`}
                            </span>
                            {displayPrice !== "Custom" && <span className="text-[9px] font-bold text-black tracking-widest">/month</span>}
                          </div>
                        </div>
                      </div>

                      <ul className="space-y-4">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
                            <span className="text-[10px] font-bold leading-tight tracking-tight text-black">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-10">
                      <button 
                        onClick={() => {
                          if (plan.id === 'starter') {
                            handleFreeTrial(plan)
                          } else {
                            handleRazorpayPayment(plan)
                          }
                        }}
                        disabled={isProcessing}
                        className={cn(
                          "w-full h-11 rounded-xl font-black  text-[10px] tracking-widest border-none transition-all active:scale-95 shadow-md cursor-pointer outline-none",
                          plan.id === 'starter' ? "bg-amber-500 text-white hover:bg-amber-600" : 
                          "bg-primary text-white hover:opacity-90"
                        )}
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.buttonText}
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>

            <div className="flex flex-col items-center gap-6 py-10">
              <button 
                onClick={() => setShowComparison(!showComparison)}
                className="flex items-center gap-3 text-black hover:text-primary transition-all group border-none bg-transparent outline-none cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full border-2 border-zinc-100 flex items-center justify-center group-hover:border-primary/20 transition-all">
                  {showComparison ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
                <span className="text-[14px] font-black tracking-[0.2em]">{showComparison ? "Hide Comparison" : "Compare All Features"}</span>
              </button>

              {showComparison && (
                <div className="w-full max-w-6xl mx-auto animate-in slide-in-from-top-4 duration-500 pt-8 pb-20">
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-black text-black tracking-tight">Full Plan Matrix</h3>
                  </div>
                  
                  <div className="overflow-x-auto rounded-[32px] border border-zinc-100 shadow-2xl bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#2563EB] hover:bg-[#2563EB] border-none">
                          <TableHead className="h-16 text-white font-bold text-[14px] pl-10">Features</TableHead>
                          <TableHead className="h-16 text-white font-bold text-[14px] text-center">Starter Website</TableHead>
                          <TableHead className="h-16 text-white font-bold text-[14px] text-center">Cloud ERP</TableHead>
                          <TableHead className="h-16 text-white font-bold text-[14px] text-center">White Label Pro</TableHead>
                          <TableHead className="h-16 text-white font-bold text-[14px] text-center pr-10">Enterprise</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {COMPARISON_FEATURES.map((feat, i) => (
                          <TableRow key={i} className={cn("border-zinc-50", i % 2 !== 0 && "bg-zinc-50/30")}>
                            <TableCell className="h-14 pl-10 text-[14px] font-bold text-black tracking-tight">{feat.label}</TableCell>
                            <TableCell className="h-14 text-center">
                              {renderCellValue((feat as any).w)}
                            </TableCell>
                            <TableCell className="h-14 text-center">
                              {renderCellValue((feat as any).erp)}
                            </TableCell>
                            <TableCell className="h-14 text-center">
                              {renderCellValue((feat as any).wl)}
                            </TableCell>
                            <TableCell className="h-14 text-center pr-10">
                              {renderCellValue((feat as any).ent)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            {/* 📱 MOBILE APP OPTIONS SECTION */}
            <Card className="border border-zinc-100 shadow-sm rounded-[40px] bg-white p-8 lg:p-12 mt-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50/50 rounded-full -ml-16 -mt-16 blur-3xl" />
              <div className="flex flex-col items-center gap-10 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-primary shadow-inner">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-black tracking-tight">Mobile App Options</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                  {/* Left Box: App Type & Availability */}
                  <div className="p-8 lg:p-10 rounded-[40px] border-2 border-blue-100 bg-blue-50/5 space-y-8 flex flex-col justify-center">
                    <h4 className="text-center text-[14px] font-black text-primary tracking-[0.2em] border-b border-blue-100/50 pb-4">App Type & Availability</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-4 border-b border-blue-50/50">
                        <span className="text-[14px] font-bold text-black tracking-tight">Android App</span>
                        <span className="text-[14px] font-black text-emerald-600 tracking-widest">Included</span>
                      </div>
                      <div className="flex justify-between items-center py-4">
                        <span className="text-[14px] font-bold text-black tracking-tight">iOS App</span>
                        <span className="text-[14px] font-black text-amber-500 tracking-widest">₹15,000 one-time</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Box: For White-Label Customers */}
                  <div className="p-8 lg:p-10 rounded-[40px] border-2 border-indigo-100 bg-indigo-50/5 space-y-8">
                    <h4 className="text-[14px] font-black text-indigo-600 tracking-[0.2em] border-b border-indigo-100/50 pb-4">For White-Label Customers</h4>
                    <ul className="space-y-5">
                      <li className="flex items-start gap-3">
                        <div className="mt-1 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100"><Check className="w-3 h-3 text-emerald-600 stroke-[4px]" /></div>
                        <span className="text-[11px] font-bold text-black tracking-tight leading-snug">App published under <span className="text-black font-black">your Brand name</span></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-1 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100"><Check className="w-3 h-3 text-emerald-600 stroke-[4px]" /></div>
                        <span className="text-[11px] font-bold text-black tracking-tight leading-snug">Using <span className="text-black font-black">your Google Play Store</span> account</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-1 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100"><Check className="w-3 h-3 text-emerald-600 stroke-[4px]" /></div>
                        <span className="text-[11px] font-bold text-black tracking-tight leading-snug">Using <span className="text-black font-black">your Apple App Store</span> account</span>
                      </li>
                      <li className="flex items-start gap-3 pt-2">
                        <div className="mt-1 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 shadow-sm"><Check className="w-3 h-3 text-white stroke-[4px]" /></div>
                        <span className="text-emerald-600 font-black text-[11px] tracking-tight leading-snug">Full brand ownership & control</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-50 w-full text-center">
                  <p className="text-[14px] text-black font-medium italic leading-relaxed max-w-2xl mx-auto px-4">
                    "Get your own branded app in students' and parents' hands — build trust and improve engagement."
                  </p>
                </div>
              </div>
            </Card>

            <div className="pt-12 text-center border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-center gap-8 opacity-40">
              <p className="text-[9px] font-black text-black tracking-[0.4em] flex items-center gap-3">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Secure Encryption Node V2.0
              </p>
              <div className="w-1 h-1 bg-zinc-200 rounded-full hidden sm:block" />
              <p className="text-[9px] font-black text-black tracking-[0.4em]">Powered by Digital Class World</p>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="max-w-md p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl focus:outline-none">
          <div className="bg-zinc-900 p-10 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            
            <div className="space-y-4">
              <Badge className="bg-white/10 text-white border-none text-[9px] font-black tracking-widest px-3">Enterprise Desk</Badge>
              <DialogTitle className="text-3xl font-black tracking-tight">Contact Sales</DialogTitle>
              <p className="text-[14px] text-black font-medium">Connect with our infrastructure specialists.</p>
            </div>
          </div>
          <form onSubmit={handleContactSubmit} className="p-10 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Full Name</Label>
              <Input name="name" defaultValue={user?.displayName || ""} required className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Official Email</Label>
              <Input name="email" type="email" defaultValue={user?.email || ""} required className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Mobile Number</Label>
              <Input name="phone" type="tel" required className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Requirements / Remarks</Label>
              <Textarea name="remark" placeholder="Describe your custom requirements..." className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-[120px] font-medium" />
            </div>
            <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-primary text-white rounded-3xl font-black text-[10px] tracking-[0.2em] shadow-xl border-none">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>,
    document.body
  )
}

function StatSummaryCard({ title, value, icon }: any) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[24px] p-6 bg-white flex items-center gap-5 group hover:shadow-md transition-all">
      <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-white transition-all">{icon}</div>
      <div><p className="text-[10px] font-black text-black tracking-widest mb-0.5">{title}</p><h3 className="text-2xl font-black text-black tracking-tight leading-none">{value}</h3></div>
    </Card>
  )
}

function DashboardTabTrigger({ value, label, icon }: any) {
  return (
    <TabsTrigger 
      value={value} 
      className="h-11 px-6 rounded-xl data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg"
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
    </TabsTrigger>
  )
}
