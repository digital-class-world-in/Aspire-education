"use client"

import { motion } from "framer-motion"
import { MessageCircle } from "lucide-react"
import { usePathname } from "next/navigation"
import { useInstituteData } from "@/hooks/use-institute-data"

export function WhatsAppIcon() {
  const pathname = usePathname()
  
  // Strict visibility only on explicit website pages
  const isPublicRoute = 
    pathname === '/' || 
    pathname === '/about-us' || 
    pathname === '/courses' || 
    pathname?.startsWith('/course/') || 
    pathname === '/facilities' || 
    pathname?.startsWith('/facilities/details') || 
    pathname === '/gallery' || 
    pathname === '/blog' || 
    pathname?.startsWith('/blog/') || 
    pathname === '/contact' || 
    pathname === '/certificate-verify' || 
    pathname?.startsWith('/sites/');
  
  const { profile, settings } = useInstituteData()
  
  if (!isPublicRoute) return null

  const rawPhone = profile?.contactPhone || profile?.phone || settings?.contact?.phone || "9876543210"
  const phoneNumber = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone
  const message = "Hi, I'm interested in your courses!"

  return (
    <motion.a
      href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[100] bg-[#25D366] text-white p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform active:scale-95"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: [0, -10, 0]
      }}
      transition={{
        scale: { type: "spring", damping: 15 },
        y: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      <MessageCircle size={32} />
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
    </motion.a>
  )
}
