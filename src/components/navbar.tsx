"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Menu,
  X,
  ChevronDown,
  GraduationCap,
  School,
  ShieldCheck,
  Users,
  GitBranch
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion } from "framer-motion"
import { useInstituteData } from "@/hooks/use-institute-data"
import { usePathname, useRouter } from "next/navigation"

interface NavbarProps {
  profile?: any
  instituteName?: string
  onApplyClick: () => void
  instituteId?: string
  customLogo?: string
}

export function Navbar({ profile, instituteName, onApplyClick, instituteId, customLogo }: NavbarProps) {
  const { courses, profile: dynamicProfile, branches } = useInstituteData(instituteId)
  const envLogoUrl = process.env.NEXT_PUBLIC_LOGO_URL || ''
  const resolvedLogoUrl = customLogo || envLogoUrl || profile?.logoUrl || dynamicProfile?.logoUrl || ''

  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isHomePage = pathname === '/'
  const isBranchPage = pathname === '/rakesh-education'

  const navItems = [
    { label: "Home", href: "/" },
    { label: "About Us", href: isBranchPage ? "#about" : "/about" },
    { label: "Courses", href: isBranchPage ? "#courses" : "/courses" },
    { label: "Facilities", href: "/facilities", hidden: isBranchPage },
    { label: "Gallery", href: isBranchPage ? "#gallery" : "/gallery" },
    { label: "Verify Certificate", href: "/certificate-verify", hidden: isBranchPage },
    { label: "Contact Us", href: isHomePage ? "#contact" : "/#contact" },
  ].filter(i => !i.hidden)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-[100] transition-all duration-500 font-public-sans",
      "bg-white py-3"
    )}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all">
          <div className="flex flex-col items-start">
            <img
              src={resolvedLogoUrl || "https://placehold.co/200x100"}
              className="h-20 w-auto object-contain"
              alt="Institute Logo"
            />
            {!resolvedLogoUrl && (
              <span className="text-[11px] font-semibold text-primary mt-0.5">
                Your Logo here
              </span>
            )}
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex gap-5 font-medium capitalize text-[15px] tracking-tight text-black items-center relative">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="hover:text-primary transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}

          {/* Branches Dropdown */}
          {branches.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary transition-colors outline-none cursor-pointer bg-transparent border-none p-0 group whitespace-nowrap">
                Our Branches <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={25} className="w-56 p-2 border-zinc-100 shadow-xl rounded-xl bg-white font-public-sans">
                {branches.map((branch) => (
                  <DropdownMenuItem key={branch.id} asChild className="p-0 rounded-lg">
                    <Link
                      href="/rakesh-education"
                      className="flex items-center gap-2 px-4 py-2.5 text-[15px] font-medium text-black hover:bg-primary/5 hover:text-primary transition-all"
                    >
                      {branch.branchName || branch.name || "Branch"}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Right Side Buttons */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-zinc-200 text-black rounded-full font-medium text-[15px] capitalize px-6 h-10 shadow-sm hover:bg-zinc-50 border-none transition-all active:scale-95 font-public-sans">
                  Login <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 border-zinc-100 shadow-2xl rounded-2xl overflow-hidden mt-4 bg-white font-public-sans">
                {!isBranchPage && (
                  <DropdownMenuItem asChild className="p-0 rounded-xl">
                    <Link href="/login" className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-black capitalize tracking-tight hover:bg-primary/5 hover:text-primary transition-all duration-300 group">
                      <ShieldCheck className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                      Admin Login
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild className="p-0 rounded-xl">
                  <Link href="/staff/login" className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-black capitalize tracking-tight hover:bg-primary/5 hover:text-primary transition-all duration-300 group">
                    <Users className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                    Staff Login
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="p-0 rounded-xl">
                  <Link href="/student/login" className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-black capitalize tracking-tight hover:bg-primary/5 hover:text-primary transition-all duration-300 group">
                    <GraduationCap className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                    Student Login
                  </Link>
                </DropdownMenuItem>


              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={onApplyClick}
              className="bg-primary hover:opacity-90 text-white rounded-full font-medium text-[15px] capitalize px-6 h-10 shadow-lg border-none active:scale-95 font-public-sans"
            >
              Enquiry Now
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-zinc-900"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="lg:hidden bg-white border-t border-zinc-50 overflow-hidden"
        >
          <div className="flex flex-col p-6 gap-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[17px] font-medium capitalize tracking-tight text-black hover:text-primary transition-all duration-300"
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Branches - All go to /rakesh-education */}
            {branches.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-bold uppercase text-zinc-400 tracking-wider">Our Branches</span>
                {branches.map((branch) => (
                  <Link
                    key={branch.id}
                    href="/rakesh-education"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-[17px] font-medium capitalize tracking-tight text-black hover:text-primary transition-all duration-300"
                  >
                    {branch.branchName || branch.name || "Branch"}
                  </Link>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-zinc-50 flex flex-col gap-3">
              <Link href="/login" className="flex items-center gap-3 text-[17px] font-medium capitalize tracking-tight text-black hover:text-primary transition-all group" onClick={() => setIsMobileMenuOpen(false)}>
                <ShieldCheck className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                Admin Login
              </Link>
              <Link href="/staff/login" className="flex items-center gap-3 text-[17px] font-medium capitalize tracking-tight text-black hover:text-primary transition-all group" onClick={() => setIsMobileMenuOpen(false)}>
                <Users className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                Staff Login
              </Link>

              <Link href="/student/login" className="flex items-center gap-3 text-[17px] font-medium capitalize tracking-tight text-black hover:text-primary transition-all group" onClick={() => setIsMobileMenuOpen(false)}>
                <GraduationCap className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                Student Login
              </Link>

              <Button
                onClick={() => { onApplyClick(); setIsMobileMenuOpen(false); }}
                className="bg-primary hover:opacity-90 text-white rounded-xl font-medium text-[17px] capitalize w-full h-12 shadow-lg mt-2"
              >
                Enquiry Now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  )
}