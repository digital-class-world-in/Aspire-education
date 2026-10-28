
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Mail, Lock, Loader2, ShieldCheck, Zap, ArrowRight } from "lucide-react"

export default function SuperLoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Super Admin Default Credentials
    if (email === "digitalclassworld@gmail.com" && password === "digital8990") {
      setTimeout(() => {
        const session = {
          email,
          role: 'SUPER_ADMIN',
          timestamp: Date.now()
        }
        localStorage.setItem('super_session', JSON.stringify(session))
        toast({ title: "Authorized", description: "Successfully logged into management hub." })
        router.push("/super/dashboard")
      }, 1000)
    } else {
      setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Invalid super admin credentials.",
        })
        setIsLoading(false)
      }, 800)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-[#F8FAFC] p-0 md:p-4 font-body">
      <div className="fixed inset-0 pointer-events-none hidden md:block">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[450px] relative z-10 animate-in fade-in zoom-in duration-500 min-h-screen md:min-h-fit flex flex-col justify-center pt-10 md:pt-0">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Super Control Panel</h1>
          <p className="text-slate-500 text-sm mt-1">Authorized personnel only</p>
        </div>

        <Card className="border-none md:border-solid md:border-slate-200 shadow-none md:shadow-xl shadow-slate-200/50 rounded-none md:rounded-2xl bg-white overflow-hidden border">
          <CardHeader className="space-y-1 pb-4 pt-8 px-8">
            <CardTitle className="text-lg font-semibold text-slate-800">Login to your account</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Enter your master credentials to continue</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 ml-0.5">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-white text-slate-900 font-medium focus-visible:ring-indigo-600 shadow-sm transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-700 ml-0.5">Access Key</Label>
                  <button type="button" className="text-xs text-indigo-600 hover:underline font-medium">Forgot key?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-white text-slate-900 font-medium focus-visible:ring-indigo-600 shadow-sm transition-all"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-semibold text-sm shadow-lg shadow-indigo-100 border-none transition-all mt-2 active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : (
                  <>
                    Sign in to Dashboard <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <div className="pb-8 text-center">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-bold underline underline-offset-4 tracking-tight">
              Back to Main Login
            </Link>
          </div>
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-5 text-center justify-center px-8">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 tracking-wide ">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Secure Cloud Infrastructure Control
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-slate-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} Digital Class World. All rights reserved.
        </p>
      </div>
    </div>
  )
}
