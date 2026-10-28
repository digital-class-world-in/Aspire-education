
"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  CreditCard, 
  ShieldCheck, 
  Wallet, 
  Landmark, 
  Save, 
  ExternalLink, 
  QrCode,
  CheckCircle2,
  Info,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, off } from "firebase/database"
import { toast } from "@/hooks/use-toast"

export default function PaymentSettingPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [upiId, setUpiId] = useState("")
  const [isDefaultUpi, setIsDefaultUpi] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  
  // Input states (for typing)
  const [razorpayKey, setRazorpayKey] = useState("")
  const [razorpaySecret, setRazorpaySecret] = useState("")

  // Saved states (for card display)
  const [savedRazorpayKey, setSavedRazorpayKey] = useState("")
  const [savedRazorpaySecret, setSavedRazorpaySecret] = useState("")

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountType: "",
    branchName: ""
  })

  useEffect(() => {
    if (!database || !user) return
    const settingsRef = ref(database, `Institutes/${user.uid}/payment-settings`)
    
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setUpiId(data.upiId || "")
        setIsDefaultUpi(!!data.isDefaultUpi)
        
        // Load into both typing and saved states
        setRazorpayKey(data.razorpayKey || "")
        setRazorpaySecret(data.razorpaySecret || "")
        setSavedRazorpayKey(data.razorpayKey || "")
        setSavedRazorpaySecret(data.razorpaySecret || "")

        setBankDetails(data.bankDetails || {
          accountHolderName: "",
          bankName: "",
          accountNumber: "",
          ifscCode: "",
          accountType: "",
          branchName: ""
        })
      }
    })
    return () => off(settingsRef)
  }, [database, user])

  const handleSaveAll = async () => {
    if (!database || !user) return
    try {
      await update(ref(database, `Institutes/${user.uid}/payment-settings`), {
        upiId,
        isDefaultUpi,
        razorpayKey,
        razorpaySecret,
        bankDetails,
        updatedAt: Date.now()
      })
      
      // Update saved states to match current inputs
      setSavedRazorpayKey(razorpayKey)
      setSavedRazorpaySecret(razorpaySecret)
      
      toast({ title: "Settings Updated", description: "All payment configurations have been synchronized." })
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed" })
    }
  }

  const handleDisconnectRazorpay = async () => {
    if (!database || !user) return
    try {
      await update(ref(database, `Institutes/${user.uid}/payment-settings`), {
        razorpayKey: "",
        razorpaySecret: "",
        updatedAt: Date.now()
      })
      setRazorpayKey("")
      setRazorpaySecret("")
      setSavedRazorpayKey("")
      setSavedRazorpaySecret("")
      toast({ title: "Gateway Disconnected", description: "Razorpay credentials have been removed." })
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" })
    }
  }

  const qrUrl = upiId ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=Institute&cu=INR`)}` : null

  return (
    <div className="min-h-screen bg-[#a0a0a00d] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-black font-public-sans tracking-tight">Payment Settings</h2>
              <p className="text-[14px] text-black font-medium">Configure online payment gateways, UPI, and school bank accounts</p>
            </div>
            <Button onClick={handleSaveAll} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-bold text-[14px] gap-2 border-none transition-all shadow-lg active:scale-95">
              <Save className="h-4 w-4" /> Save Configuration
            </Button>
          </div>

          <Tabs defaultValue="gateways" className="w-full">
            <TabsList className="bg-white p-1.5 rounded-xl h-14 shadow-sm border border-zinc-100 mb-8 inline-flex items-center">
              <TabsTrigger value="gateways" className="rounded-lg px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Payment Gateways</TabsTrigger>
              <TabsTrigger value="upi" className="rounded-lg px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">UPI Payment</TabsTrigger>
              <TabsTrigger value="bank" className="rounded-lg px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-none">Bank Account</TabsTrigger>
            </TabsList>

            <TabsContent value="gateways" className="space-y-8 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                <GatewayCard 
                  name="Razorpay" 
                  keyId={savedRazorpayKey}
                  secret={savedRazorpaySecret}
                  description="Accept UPI, Cards, NetBanking and more in India."
                  helpUrl="https://razorpay.com/docs/?preferred-country=US#home-payments"
                  onDisconnect={handleDisconnectRazorpay}
                />
              </div>

              <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden max-w-4xl border-2 border-zinc-100">
                <div className="bg-zinc-50 px-8 py-5 border-b border-zinc-100 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-black font-public-sans">Razorpay Integration Details</h3>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Key ID</Label>
                    <Input 
                      value={razorpayKey} 
                      onChange={(e) => setRazorpayKey(e.target.value)}
                      placeholder="rzp_live_XXXXXXXXXXXX"
                      className="rounded-xl h-12 border-zinc-200 focus-visible:ring-primary" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Key Secret</Label>
                    <div className="relative">
                      <Input 
                        type={showSecret ? "text" : "password"} 
                        value={razorpaySecret}
                        onChange={(e) => setRazorpaySecret(e.target.value)}
                        placeholder="••••••••••••••••••••"
                        className="rounded-xl h-12 border-zinc-200 pr-12 focus-visible:ring-primary" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-4 top-3.5 text-black hover:text-black transition-none"
                      >
                        {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-black">i</div>
                      <p className="text-[14px] text-blue-700 font-medium leading-relaxed max-w-md">
                        Your credentials are encrypted. Enter your API keys and click "Save Configuration" to activate the integration.
                      </p>
                    </div>
                    <Button variant="ghost" asChild className="text-blue-600 font-bold text-[14px] gap-2 hover:bg-blue-100/50 transition-none tracking-widest">
                      <a href="https://razorpay.com/docs/?preferred-country=US#home-payments" target="_blank" rel="noopener noreferrer">
                        Help Docs <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="upi" className="space-y-8 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-7 border-none shadow-sm rounded-3xl bg-white overflow-hidden border-2 border-zinc-100">
                  <div className="bg-zinc-50 px-8 py-5 border-b border-zinc-100 flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-black font-public-sans">UPI Configuration</h3>
                  </div>
                  <div className="p-8 space-y-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Merchant UPI ID (VPA)</Label>
                      <Input 
                        value={upiId} 
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. schoolname@bank"
                        className="rounded-xl h-14 text-lg font-bold border-zinc-200 focus-visible:ring-primary transition-none" 
                      />
                      <p className="text-[10px] text-black font-medium ml-1">Payments will be credited directly to the bank account linked with this UPI ID.</p>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <div className="space-y-1">
                        <p className="text-[14px] font-bold text-black">Set as Default Payment Mode</p>
                        <p className="text-[14px] text-black font-medium">Enable this to show UPI QR code on student fee receipts by default.</p>
                      </div>
                      <Switch 
                        checked={isDefaultUpi} 
                        onCheckedChange={setIsDefaultUpi}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-5 border-none shadow-sm rounded-3xl bg-zinc-900 overflow-hidden flex flex-col">
                  <div className="p-8 space-y-6 flex-1 flex flex-col items-center justify-center text-center">
                    <div className="space-y-2">
                      <h4 className="text-white font-black text-xl tracking-tight font-public-sans">Payment QR Preview</h4>
                      <p className="text-black text-[14px] font-medium">Automatic scan-to-pay generation</p>
                    </div>

                    <div className="relative">
                      <div className="w-56 h-56 bg-white rounded-3xl p-4 shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/10">
                        {qrUrl ? (
                          <img src={qrUrl} alt="UPI QR" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-zinc-200">
                            <QrCode className="w-12 h-12 opacity-20" />
                            <span className="text-[10px] font-bold tracking-widest opacity-40">Enter UPI ID to generate</span>
                          </div>
                        )}
                      </div>
                      {qrUrl && (
                        <div className="absolute -bottom-3 -right-3 bg-primary text-white p-2 rounded-xl shadow-lg animate-in zoom-in duration-300">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-3 px-4">
                      <div className="h-px w-full bg-white/5" />
                      <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-black">
                        <span>Status</span>
                        <span className={cn(upiId ? "text-emerald-500" : "text-rose-500")}>
                          {upiId ? "Live & Ready" : "ID Required"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 p-6 border-t border-white/5 text-center">
                    <p className="text-[9px] text-black font-bold tracking-[0.3em]">Institutional Secure Payment Channel</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bank" className="mt-0">
              <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden max-w-2xl border-2 border-zinc-100">
                <div className="bg-zinc-50 px-8 py-5 border-b border-zinc-100 flex items-center gap-3">
                  <Landmark className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-black font-public-sans tracking-tight">Institutional Bank Details</h3>
                </div>
                <div className="p-8 space-y-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Account Holder Name</Label>
                    <Input 
                      value={bankDetails.accountHolderName}
                      onChange={(e) => setBankDetails({...bankDetails, accountHolderName: e.target.value})}
                      placeholder="e.g. Global International School" 
                      className="rounded-xl h-12 border-zinc-200 focus-visible:ring-primary transition-none font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Bank Name</Label>
                    <Input 
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                      placeholder="e.g. HDFC Bank" 
                      className="rounded-xl h-12 border-zinc-200 focus-visible:ring-primary transition-none font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Account Number</Label>
                    <Input 
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                      placeholder="Enter account number" 
                      className="rounded-xl h-12 border-zinc-200 font-public-sans tracking-wider focus-visible:ring-primary transition-none font-bold" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-black tracking-widest ml-1">IFSC Code</Label>
                      <Input 
                        value={bankDetails.ifscCode}
                        onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value})}
                        placeholder="e.g. HDFC0001234" 
                        className="rounded-xl h-12 border-zinc-200 font-public-sans focus-visible:ring-primary transition-none font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Branch Name</Label>
                      <Input 
                        value={bankDetails.branchName}
                        onChange={(e) => setBankDetails({...bankDetails, branchName: e.target.value})}
                        placeholder="e.g. Downtown Branch" 
                        className="rounded-xl h-12 border-zinc-200 focus-visible:ring-primary transition-none font-bold" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Account Type</Label>
                    <Select 
                      value={bankDetails.accountType} 
                      onValueChange={(val) => setBankDetails({...bankDetails, accountType: val})}
                    >
                      <SelectTrigger className="rounded-xl h-12 border-zinc-200 focus:ring-primary transition-none font-bold">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Savings">Savings Account</SelectItem>
                        <SelectItem value="Current">Current Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                    <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                      These details are used for manual fee collection receipts and bank transfer instructions for parents.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

function GatewayCard({ name, keyId, secret, description, helpUrl, onDisconnect }: { name: string, keyId?: string, secret?: string, description: string, helpUrl: string, onDisconnect: () => void }) {
  const isActive = !!(keyId && secret)
  return (
    <Card className={cn(
      "border-2 shadow-sm rounded-3xl p-8 space-y-6 bg-white transition-all duration-300",
      isActive ? "border-emerald-100" : "border-zinc-200"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-primary border border-zinc-100">
            <CreditCard className="w-5 h-5" />
          </div>
          <h4 className="text-xl font-bold text-black font-public-sans">{name}</h4>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold  tracking-widest",
          isActive ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-black"
        )}>
          {isActive ? 'Active' : 'Not Active'}
        </div>
      </div>
      
      {isActive ? (
        <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 animate-in fade-in duration-500">
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-black tracking-widest">Key ID</p>
            <p className="text-[14px] font-public-sans font-bold text-black truncate">{keyId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-black tracking-widest">Secret Key</p>
            <p className="text-[14px] font-public-sans font-bold text-black truncate">••••••••••••••••••••</p>
          </div>
        </div>
      ) : (
        <p className="text-[14px] text-black leading-relaxed font-medium">{description}</p>
      )}

      <div className="pt-4 border-t border-zinc-50 flex items-center justify-between">
        <Button variant="ghost" asChild className="text-[14px] font-bold text-black transition-none hover:bg-transparent hover:text-black gap-2 tracking-widest">
          <a href={helpUrl} target="_blank" rel="noopener noreferrer">
            Help <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
        <Button 
          onClick={isActive ? onDisconnect : undefined}
          className={cn(
            "rounded-xl h-10 px-6 font-bold text-[14px] transition-all border-none shadow-sm active:scale-95  tracking-widest",
            isActive ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-primary text-white"
          )}
        >
          {isActive ? 'Disconnect' : 'Connect Now'}
        </Button>
      </div>
    </Card>
  )
}
