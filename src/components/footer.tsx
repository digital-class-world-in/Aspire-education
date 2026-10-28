"use client"

import Link from "next/link"
import {
  Facebook,
  Instagram,
  Youtube,
  MapPin,
  Phone,
  Mail
} from "lucide-react"
import { format } from "date-fns"

interface FooterProps {
  profile: any
  settings: any
  instituteName: string
  courses: any[]
  customLogo?: string
}

export function Footer({ profile, settings, instituteName, courses, customLogo }: FooterProps) {
  const safeSettings = settings || {}
  const resolvedLogoUrl = customLogo || process.env.NEXT_PUBLIC_LOGO_URL || profile?.logoUrl || ''

  const publicContact = {
    phone: profile?.contactPhone || profile?.phone || safeSettings.contact?.phone || "+91 98765 43210",
    email: profile?.contactEmail || profile?.email || safeSettings.contact?.email || "info@yourinstitute.com",
    address: profile?.address || safeSettings.contact?.address || "Near Science City Road, Sola, Ahmedabad - 380060"
  }

  return (
    <footer className="bg-zinc-950 text-white pt-20 pb-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary" />
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            {resolvedLogoUrl ? (
              <img src={resolvedLogoUrl} className="h-12" alt="Logo" />
            ) : (
              <div className="flex flex-col items-start">
                <img src="https://placehold.co/200x100" className="h-12 w-auto object-contain" alt="Logo" />
                <span className="text-[11px] font-semibold text-primary mt-0.5">
                  Your Logo here
                </span>
              </div>
            )}
            <p className="text-zinc-400 text-[14px] leading-relaxed max-w-xs">{profile?.tagline || "Your leading educational partner in excellence and growth."}</p>
            <div className="flex gap-4">
              <SocialBtn href={safeSettings.social?.facebook || "#"} icon={Facebook} />
              <SocialBtn href={safeSettings.social?.instagram || "#"} icon={Instagram} />
              <SocialBtn href={safeSettings.social?.youtube || "#"} icon={Youtube} />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3 text-zinc-400">
              <li><Link href="/" className="hover:text-white transition">Home</Link></li>
              <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="/courses" className="hover:text-white transition">Courses</Link></li>
              <li><Link href="/facilities" className="hover:text-white transition">Facilities</Link></li>
              <li><Link href="/gallery" className="hover:text-white transition">Gallery</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/certificate-verify" className="hover:text-white transition">Certificate Verify</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6">Important Links</h4>
            <ul className="space-y-3 text-zinc-400 mb-8">
              <li><Link href="/terms-conditions" className="hover:text-white transition">Terms & Conditions</Link></li>
              <li><Link href="/privacypolicy" className="hover:text-white transition">Privacy Policy</Link></li>
            </ul>
            <h4 className="font-bold text-lg mb-6">Popular Batches</h4>
            <ul className="space-y-3 text-zinc-400">
              {courses && courses.length > 0 ? (
                courses.slice(0, 5).map(c => (
                  <li key={c.id}><Link href={`/course/${encodeURIComponent((c.name || c.id).toLowerCase().replace(/\s+/g, '-'))}`} className="hover:text-white transition">{c.name}</Link></li>
                ))
              ) : (
                <li className="italic text-zinc-500">Batches will display here</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6">Get in Touch</h4>
            <ul className="space-y-4 text-zinc-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-1 text-primary shrink-0" />
                <span>{publicContact.address || <span className="italic text-zinc-500">Address will display here</span>}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>{publicContact.phone || <span className="italic text-zinc-500">Contact will display here</span>}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>{publicContact.email || <span className="italic text-zinc-500">Email will display here</span>}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-white/10 text-center text-zinc-500 text-[13px] font-medium tracking-wide flex flex-col md:flex-row items-center justify-center gap-2">
          <span>© {format(new Date(), "yyyy")} {instituteName} • All rights reserved.</span>
          <span className="hidden md:inline">•</span>
          <span>Designed and developed by <a href="https://digitalclassworld.in/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-semibold">Digital Class</a></span>
        </div>
      </div>
    </footer>
  )
}

function SocialBtn({ href, icon: Icon }: { href: string; icon: any }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-primary hover:text-white transition-all shadow-sm border border-white/5">
      <Icon className="w-5 h-5" />
    </a>
  )
}
