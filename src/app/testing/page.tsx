"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, Loader2, GraduationCap, ChevronDown, Facebook, Instagram, Linkedin, Phone, MapPin, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFirebase } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"

// ──────────────────────────────────────────────
// Mock Certificate Data (replace with Firebase lookup later)
// ──────────────────────────────────────────────
const MOCK_CERTIFICATES: Record<string, any> = {
  "NC2025-001": {
    studentName: "Rahul Sharma",
    course: "Diploma in Computer Science",
    issueDate: "15 March 2025",
    institute: "Nirvana Education Commune",
    status: "Verified",
    logoUrl: "https://ik.imagekit.io/gnzjd77mb/1652419840772.jpg",
  },
  "NC2025-002": {
    studentName: "Priya Patel",
    course: "Advanced Web Development",
    issueDate: "10 February 2025",
    institute: "Nirvana Education Commune",
    status: "Verified",
    logoUrl: "https://ik.imagekit.io/gnzjd77mb/1652419840772.jpg",
  },
  "NC2025-003": {
    studentName: "Amit Kumar",
    course: "Digital Marketing Professional",
    issueDate: "05 January 2025",
    institute: "Nirvana Education Commune",
    status: "Verified",
    logoUrl: "https://ik.imagekit.io/gnzjd77mb/1652419840772.jpg",
  },
}

export default function CertificateVerificationPage() {
  const { database } = useFirebase()
  const { resolvedId, isLoading: idLoading } = useResolvedId()
  const [profile, setProfile] = useState<any>(null)
  const [certificateNumber, setCertificateNumber] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    if (!database || !resolvedId) return
    const profileRef = ref(database, `Institutes/${resolvedId}/profile`)
    const unsubscribe = onValue(profileRef, (snap) => {
      const data = snap.val()
      if (data) setProfile(data)
    })
    return () => unsubscribe()
  }, [database, resolvedId])

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleVerify = () => {
    setLoading(true)
    setError(null)
    setResult(null)

    // Simulate delay (real app would query Firebase here)
    setTimeout(() => {
      const trimmed = certificateNumber.trim().toUpperCase()
      const cert = MOCK_CERTIFICATES[trimmed]

      if (cert) {
        setResult(cert)
      } else if (trimmed) {
        setError("Certificate number not found or invalid. Please check and try again.")
      }
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ─── HEADER / NAVBAR ──────────────────────────────────────── */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
          isScrolled ? "bg-white/90 backdrop-blur-xl shadow-xl py-3" : "bg-transparent py-6"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all">
            <Image
              src="https://ik.imagekit.io/gnzjd77mb/1652419840772.jpg"
              width={80}
              height={80}
              className="h-16 md:h-20 w-auto object-contain"
              alt="Nirvana Education Commune Logo"
              priority
            />
          </Link>

          <nav className="hidden lg:flex gap-8 font-black text-[14px] tracking-widest text-black">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
            <Link href="/#courses" className="hover:text-primary transition-colors">Courses</Link>
            <Link href="/infrastructure" className="hover:text-primary transition-colors">Facilities</Link>
            <Link href="/gallery" className="hover:text-primary transition-colors">Gallery</Link>
            <Link href="/#blog" className="hover:text-primary transition-colors">Blogs</Link>
            <Link href="/#contact" className="hover:text-primary transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-zinc-200 text-black rounded-full font-black text-[14px] px-8 h-11 shadow-sm hover:bg-zinc-50 border-none transition-all active:scale-95"
                >
                  Login <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 p-0 border-zinc-100 shadow-2xl rounded-2xl overflow-hidden mt-4 bg-white"
              >
                <DropdownMenuItem asChild className="p-0">
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-[14px] font-bold text-black tracking-tight hover:bg-zinc-100"
                  >
                    Admin Login
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0">
                  <Link
                    href="/staff/login"
                    className="block px-4 py-2 text-[14px] font-bold text-black tracking-tight hover:bg-zinc-100"
                  >
                    Staff Login
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0">
                  <Link
                    href="/student/login"
                    className="block px-4 py-2 text-[14px] font-bold text-black tracking-tight hover:bg-zinc-100"
                  >
                    Student Login
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-full font-black text-[14px] px-8 h-11 shadow-lg border-none active:scale-95"
            >
              Enquiry Now
            </Button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────── */}
      <main className="flex-1 pt-32 md:pt-40 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Certificate Verification
            </h1>
            <p className="text-lg md:text-xl text-black max-w-2xl mx-auto">
              Verify the authenticity of your certificate issued by {profile?.instituteName || "Our Institute"} by entering the certificate number below.
            </p>
          </div>

          {/* Verification Card */}
          <Card className="p-8 md:p-12 shadow-2xl border-t-4 border-emerald-700 rounded-3xl">
            <div className="space-y-10">
              {/* Input Section */}
              <div className="space-y-4">
                <Label htmlFor="cert-number" className="text-xl font-bold text-black block">
                  Certificate Number
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    id="cert-number"
                    placeholder="e.g. NC2025-001"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value.toUpperCase())}
                    className="h-14 text-lg font-medium placeholder:text-black border-2 border-gray-300 focus:border-emerald-700 rounded-xl"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={loading || !certificateNumber.trim()}
                    className="h-14 px-10 text-lg font-bold bg-primary hover:bg-primary/90 transition-all"
                    style={{ backgroundColor: 'hsl(var(--primary))' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Certificate"
                    )}
                  </Button>
                </div>
              </div>

              {/* Result / Success */}
              {result && (
                <div className="mt-12 animate-in fade-in zoom-in duration-500">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 md:p-10 shadow-inner">
                    <div className="flex items-center gap-4 mb-8">
                      <CheckCircle2 className="h-12 w-12 text-emerald-700" />
                      <h2 className="text-3xl font-bold text-emerald-800">
                        Certificate Verified Successfully
                      </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                      {/* Left: Logo + Institute */}
                      <div className="space-y-6 flex flex-col items-center md:items-start">
                        <Image
                          src={result.logoUrl}
                          alt="Nirvana Education Commune"
                          width={140}
                          height={140}
                          className="h-24 w-auto object-contain"
                        />
                        <h3 className="text-2xl font-bold text-black text-center md:text-left">
                          {result.institute}
                        </h3>
                      </div>

                      {/* Right: Certificate Details */}
                      <div className="space-y-6 text-black">
                        <div>
                          <Label className="text-[14px] font-semibold text-black">Student Name</Label>
                          <p className="text-2xl font-bold">{result.studentName}</p>
                        </div>
                        <div>
                          <Label className="text-[14px] font-semibold text-black">Course</Label>
                          <p className="text-2xl font-bold">{result.course}</p>
                        </div>
                        <div>
                          <Label className="text-[14px] font-semibold text-black">Issue Date</Label>
                          <p className="text-2xl font-bold">{result.issueDate}</p>
                        </div>
                        <div>
                          <Label className="text-[14px] font-semibold text-black">Status</Label>
                          <p className="text-2xl font-bold text-emerald-700">{result.status}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error / Not Found */}
              {error && (
                <div className="mt-12 animate-in fade-in zoom-in duration-500">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-8 md:p-10 shadow-inner text-center">
                    <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-red-800 mb-3">
                      Certificate Not Found
                    </h2>
                    <p className="text-lg text-red-700">
                      {error}
                    </p>
                    <p className="mt-4 text-black">
                      Please check the certificate number and try again.
                    </p>
                  </div>
                </div>
              )}

              {/* Initial / Empty State */}
              {!result && !error && (
                <div className="mt-12 text-center text-black italic text-lg">
                  Enter certificate number above to verify authenticity.
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="bg-zinc-950 text-white pt-20 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <Image
                src="https://ik.imagekit.io/gnzjd77mb/1652419840772.jpg"
                alt="Nirvana Education Commune"
                width={120}
                height={120}
                className="h-12 w-auto object-contain"
              />
              <p className="text-black text-[14px]">
                Premier institute for quality education since 2004
              </p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-emerald-400 transition">
                  <Facebook className="h-6 w-6" />
                </a>
                <a href="#" className="hover:text-emerald-400 transition">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="hover:text-emerald-400 transition">
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-3 text-black">
                <li><Link href="/" className="hover:text-white transition">Home</Link></li>
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="/infrastructure" className="hover:text-white transition">Facilities</Link></li>
                <li><Link href="/gallery" className="hover:text-white transition">Gallery</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Our Courses</h4>
              <ul className="space-y-3 text-black">
                <li><Link href="#" className="hover:text-white transition">Diploma in Computer Science</Link></li>
                <li><Link href="#" className="hover:text-white transition">Web Development</Link></li>
                <li><Link href="#" className="hover:text-white transition">Digital Marketing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Get in Touch</h4>
              <ul className="space-y-4 text-black">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-1 text-emerald-500" />
                  <span>Ahmedabad, Gujarat - 382470</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-emerald-500" />
                  <span>+91-98765 43210</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-emerald-500" />
                  <span>info@nirvanaeducation.in</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-zinc-800 text-center text-black text-[14px]">
            © {new Date().getFullYear()} Nirvana Education Commune • All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
