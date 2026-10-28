"use client"

import { motion } from "framer-motion"
import Link from "next/link"

interface MarqueeSectionProps {
  settings: {
    text: string
    link?: string
    textColor: string
    backgroundColor: string
    backgroundImage?: string
    fontFamily: string
    speed?: number
    isVisible: boolean
  }
}

export function MarqueeSection({ settings }: MarqueeSectionProps) {
  if (!settings || settings.isVisible === false) return null

  const marqueeContent = (
    <div 
      className="py-2.5 relative overflow-hidden group cursor-pointer"
      style={{ 
        backgroundColor: settings.backgroundColor || "#1e3a8a",
        fontFamily: settings.fontFamily ? `'${settings.fontFamily}', sans-serif` : 'inherit',
      }}
    >
      {/* Background Image Overlay */}
      {settings.backgroundImage && (
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ 
            backgroundImage: `url(${settings.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      <div className="flex whitespace-nowrap overflow-hidden relative z-10">
        <motion.div
          animate={{ x: ["0%", "-100%"] }}
          transition={{
            duration: settings.speed ? 5000 / settings.speed : 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex items-center shrink-0 min-w-full"
        >
          {/* Repeat text multiple times to ensure enough length */}
          {[...Array(5)].map((_, i) => (
            <span 
              key={i} 
              style={{ color: settings.textColor || "#ffffff" }}
              className="text-[14px] font-bold tracking-widest px-10"
            >
              {settings.text}
            </span>
          ))}
        </motion.div>
        
        <motion.div
           animate={{ x: ["0%", "-100%"] }}
           transition={{
             duration: settings.speed ? 5000 / settings.speed : 25,
             repeat: Infinity,
             ease: "linear",
           }}
           className="flex items-center shrink-0 min-w-full"
        >
          {[...Array(5)].map((_, i) => (
            <span 
              key={i} 
              style={{ color: settings.textColor || "#ffffff" }}
              className="text-[14px] font-bold tracking-widest px-10"
            >
              {settings.text}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  )

  if (settings.link) {
    return (
      <Link href={settings.link} className="block w-full">
        {marqueeContent}
      </Link>
    )
  }

  return marqueeContent
}
