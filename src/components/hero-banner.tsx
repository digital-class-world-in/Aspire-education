"use client"

import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface HeroBannerProps {
  title: string
  subtitle: string
  backgroundImage?: string
  breadcrumb?: { label: string; href: string }[]
  buttonText?: string
  buttonLink?: string
}

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: "easeOut" }
}

export function HeroBanner({ title, subtitle, backgroundImage, breadcrumb, buttonText, buttonLink }: HeroBannerProps) {
  const defaultBg = "https://images.unsplash.com/photo-1523050335102-c67450e28b2e?auto=format&fit=crop&q=80&w=1200"
  
  return (
    <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 bg-primary/5 overflow-hidden font-public-sans">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <img 
          src={backgroundImage || defaultBg} 
          className="w-full h-full object-cover blur-xl scale-110" 
          alt="Banner Background" 
        />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div {...fadeIn} className="space-y-8">
          {breadcrumb && (
            <nav className="flex items-center gap-2 text-[10px] font-black tracking-widest text-black">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              {breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3" />
                  <Link href={item.href} className={index === breadcrumb.length - 1 ? "text-black" : "hover:text-primary transition-colors"}>
                    {item.label}
                  </Link>
                </div>
              ))}
            </nav>
          )}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-black tracking-tight leading-[1.1] max-w-4xl">
              {title}
            </h1>
            <p className="text-lg text-black font-medium max-w-2xl leading-relaxed">
              {subtitle}
            </p>
            {buttonText && buttonLink && (
              <div className="pt-6 md:pt-10">
                <Button asChild className="h-12 md:h-14 px-8 md:px-10 rounded-2xl bg-primary hover:opacity-90 text-white font-black text-[14px] tracking-widest border-none shadow-xl active:scale-95 transition-all">
                  <Link href={buttonLink}>{buttonText}</Link>
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
