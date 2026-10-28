"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useFirebase } from "@/firebase"
import { ref as dbRef, onValue, update, set } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Image as ImageIcon, Palette, Monitor, Mail, Code2, Upload, Eye,
  Loader2, Check, ChevronRight, RotateCcw, Send, Save, Globe, Layout,
  AlignLeft, SlidersHorizontal, Paintbrush, Star, BookImage, Smartphone,
  Laptop, ShieldCheck, Trash2, RefreshCw, Download, X
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrandingData {
  logo?: string
  dashboardLogo?: string
  favicon?: string
  colors?: { primary?: string; secondary?: string; accent?: string }
  loginPage?: {
    layout?: "left-image" | "right-image" | "full-bg"
    image?: string
    heading?: string
    subtext?: string
    overlayColor?: string
    overlayOpacity?: number
  }
  email?: {
    headerLogo?: string
    footerText?: string
    brandColor?: string
  }
  customCss?: string
  publishedAt?: number
}

const DEFAULT_BRANDING: BrandingData = {
  colors: { primary: "#6366f1", secondary: "#f8fafc", accent: "#10b981" },
  loginPage: { layout: "left-image", heading: "Welcome Back", subtext: "Log in to your dashboard", overlayColor: "#000000", overlayOpacity: 0.4 },
  email: { footerText: "© 2026 Your Institute. All rights reserved.", brandColor: "#6366f1" },
  customCss: ""
}

const SUB_TABS = [
  { id: "logo", label: "Logo & Favicon", icon: ImageIcon },
  { id: "colors", label: "Brand Colors", icon: Palette },
  { id: "login", label: "Login Page", icon: Monitor },
  { id: "email", label: "Email Branding", icon: Mail },
  { id: "advanced", label: "Advanced", icon: Code2 },
]

const LAYOUT_OPTIONS = [
  { id: "left-image", label: "Image Left", desc: "Login form on the right", icon: Layout },
  { id: "right-image", label: "Image Right", desc: "Login form on the left", icon: Layout },
  { id: "full-bg", label: "Full Background", desc: "Form centered over image", icon: Layout },
]

const COLOR_PRESETS = [
  { name: "Indigo", primary: "#6366f1", secondary: "#f8fafc", accent: "#10b981" },
  { name: "Blue", primary: "#3b82f6", secondary: "#f0f9ff", accent: "#f59e0b" },
  { name: "Emerald", primary: "#10b981", secondary: "#f0fdf4", accent: "#6366f1" },
  { name: "Rose", primary: "#f43f5e", secondary: "#fff1f2", accent: "#8b5cf6" },
  { name: "Violet", primary: "#8b5cf6", secondary: "#faf5ff", accent: "#ec4899" },
  { name: "Amber", primary: "#f59e0b", secondary: "#fffbeb", accent: "#ef4444" },
  { name: "Teal", primary: "#14b8a6", secondary: "#f0fdfa", accent: "#f97316" },
  { name: "Slate", primary: "#475569", secondary: "#f8fafc", accent: "#3b82f6" },
]

// ─── Upload Hook ──────────────────────────────────────────────────────────────
function useImageUpload(instituteId: string, category: string) {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const upload = useCallback(async (file: File): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) { throw new Error("File must be under 5MB") }
    setIsUploading(true)
    setProgress(30)
    try {
      const res = await uploadFileToImageKit(file, `/branding/${instituteId}/${category}`)
      setProgress(100)
      return res.url
    } catch (err: any) {
      throw new Error(err.message || "Failed to upload asset to ImageKit")
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }, [instituteId, category])

  return { upload, progress, isUploading }
}

// ─── Dropzone Component ───────────────────────────────────────────────────────
function ImageDropzone({
  label, hint, value, onUpload, isUploading, progress, accept = "image/png,image/jpeg,image/svg+xml,image/webp"
}: {
  label: string; hint: string; value?: string; onUpload: (file: File) => void
  isUploading?: boolean; progress?: number; accept?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onUpload(file)
  }

  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all duration-200 flex flex-col items-center gap-3",
          isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80",
          value && "bg-slate-50"
        )}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />

        {isUploading ? (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-center gap-2 text-indigo-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px] font-semibold">Uploading {progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : value ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="h-20 w-full max-w-[200px] relative rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
              <img src={value} alt={label} className="object-contain max-h-full max-w-full p-2" />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Click or drag to replace</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-slate-700">Drag & drop or click to upload</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{hint}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Login Page Replica Preview ──────────────────────────────────────────────
function LoginPagePreview({ branding }: { branding: BrandingData }) {
  const primary = branding.colors?.primary || "#6366f1"
  const layout = branding.loginPage?.layout || "left-image"
  const bgImage = branding.loginPage?.image || null
  const overlayColor = branding.loginPage?.overlayColor || "#000000"
  const overlayOpacity = branding.loginPage?.overlayOpacity ?? 0.4
  const heading = branding.loginPage?.heading || "Welcome Back"
  const subtext = branding.loginPage?.subtext || "Log in to your dashboard"
  const logoSrc = branding.logo

  // Renders at 1024×640, then CSS-scaled to 380px wide
  const PREVIEW_W = 380
  const FULL_W = 1024
  const FULL_H = 640
  const scale = PREVIEW_W / FULL_W
  const previewH = FULL_H * scale

  // ── Reusable Form Panel ──────────────────────────────────────────────────
  const formPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', background: '#fff', padding: '48px 64px' }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center', width: '100%' }}>
        {logoSrc ? (
          <img src={logoSrc} alt="Logo" style={{ height: 52, objectFit: 'contain', maxWidth: 220 }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: 12, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 22 }}>A</div>
        )}
      </div>
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.5px' }}>{heading}</div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{subtext}</div>
      </div>
      {/* Fields */}
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', height: 44, display: 'flex', alignItems: 'center', paddingLeft: 14, marginBottom: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: '#cbd5e1', marginRight: 10 }} />
          <div style={{ fontSize: 13, color: '#94a3b8' }}>admin@institute.com</div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', height: 44, display: 'flex', alignItems: 'center', paddingLeft: 14, marginBottom: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: '#cbd5e1', marginRight: 10 }} />
          <div style={{ fontSize: 13, color: '#94a3b8' }}>••••••••</div>
        </div>
        <div style={{ height: 44, borderRadius: 10, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>Login</div>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ textAlign: 'center', fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.2em', marginBottom: 10 }}>PORTAL ACCESS</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, height: 36, borderRadius: 8, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>Student</div>
            <div style={{ flex: 1, height: 36, borderRadius: 8, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>Staff</div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Reusable Image Panel — uses <img> NOT CSS background-image ──────────
  const imagePanel = (
    <div style={{ position: 'relative', width: '55%', height: '100%', overflow: 'hidden', background: bgImage ? '#000' : `linear-gradient(135deg, ${primary}, ${primary}bb)` }}>
      {/* Actual image tag — renders Firebase Storage URLs correctly */}
      {bgImage && (
        <img
          src={bgImage}
          alt="Background"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {/* Color overlay */}
      {bgImage && (
        <div style={{ position: 'absolute', inset: 0, background: overlayColor, opacity: overlayOpacity, zIndex: 1 }} />
      )}
      {/* Bottom gradient for text readability */}
      {bgImage && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)', zIndex: 2 }} />
      )}
      {/* Text */}
      <div style={{ position: 'absolute', bottom: 40, left: 40, right: 40, zIndex: 10, color: '#fff' }}>
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.6)', borderRadius: 4, marginBottom: 16 }} />
        <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.3)', marginBottom: 8 }}>{heading}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{subtext}</div>
      </div>
    </div>
  )

  return (
    <div style={{ width: PREVIEW_W, height: previewH, overflow: 'hidden', borderRadius: 12, border: '1px solid #e2e8f0', position: 'relative', background: '#fff' }}>
      {/* Scale wrapper — renders full-size, CSS-scaled down */}
      <div style={{
        width: FULL_W, height: FULL_H,
        transform: `scale(${scale})`, transformOrigin: 'top left',
        position: 'absolute', top: 0, left: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex', overflow: 'hidden'
      }}>

        {/* ── Full Background ── */}
        {layout === "full-bg" && (
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: bgImage ? '#000' : `linear-gradient(135deg, ${primary}40, ${primary}70)` }}>
            {bgImage && <img src={bgImage} alt="bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            {bgImage && <div style={{ position: 'absolute', inset: 0, background: overlayColor, opacity: overlayOpacity, zIndex: 1 }} />}
            <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.96)', borderRadius: 24, padding: '24px 32px', width: 380 }}>
              <div style={{ height: 4, borderRadius: 4, background: primary, marginBottom: 24 }} />
              {formPanel}
            </div>
          </div>
        )}

        {/* ── Split Layouts ── */}
        {layout !== "full-bg" && (
          <>
            {layout === "left-image"  && imagePanel}
            <div style={{ width: '45%', height: '100%' }}>{formPanel}</div>
            {layout === "right-image" && imagePanel}
          </>
        )}

      </div>
    </div>
  )
}


// ─── Live Preview Panel ────────────────────────────────────────────────────────
function LivePreview({ branding, subTab }: { branding: BrandingData; subTab: string }) {
  const [previewMode, setPreviewMode] = useState<"admin" | "login" | "email">("admin")
  const primary = branding.colors?.primary || "#6366f1"
  const secondary = branding.colors?.secondary || "#f8fafc"
  const accent = branding.colors?.accent || "#10b981"

  // Auto-switch preview based on sub-tab
  useEffect(() => {
    if (subTab === "login") setPreviewMode("login")
    else if (subTab === "email") setPreviewMode("email")
    else setPreviewMode("admin")
  }, [subTab])

  return (
    <div className="h-full flex flex-col">
      {/* Preview mode switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-3">
        {[
          { id: "admin", icon: Laptop, label: "Admin" },
          { id: "login", icon: Monitor, label: "Login Page" },
          { id: "email", icon: Mail, label: "Email" },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setPreviewMode(m.id as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all",
              previewMode === m.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <m.icon className="w-3.5 h-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Preview Canvas */}
      <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-start justify-center p-0">

        {/* ── Admin Preview ── */}
        {previewMode === "admin" && (
          <div className="h-full w-full flex">
            {/* Mini Sidebar */}
            <div className="w-[80px] flex flex-col items-center py-3 gap-2 border-r border-slate-200" style={{ backgroundColor: secondary }}>
              {branding.dashboardLogo || branding.logo ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white p-1">
                  <img src={branding.dashboardLogo || branding.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: primary }}>A</div>
              )}
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-10 h-8 rounded-lg" style={{ backgroundColor: i === 1 ? primary + "25" : "#e2e8f0" }} />
              ))}
            </div>
            {/* Mini Content */}
            <div className="flex-1 p-3 space-y-2 bg-slate-50/70">
              <div className="h-8 rounded-lg bg-white border border-slate-200 flex items-center px-2 gap-2">
                <div className="flex-1 h-2 rounded bg-slate-100" />
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: primary + "40" }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[primary, accent, "#f59e0b"].map((c, i) => (
                  <div key={i} className="h-14 rounded-xl p-2" style={{ backgroundColor: c + "15", borderWidth: 1, borderColor: c + "30" }}>
                    <div className="h-2 w-8 rounded mb-1" style={{ backgroundColor: c + "60" }} />
                    <div className="h-3 w-6 rounded" style={{ backgroundColor: c }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <div className="h-7 px-3 rounded-lg flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: primary }}>Button</div>
                <div className="h-7 px-3 rounded-lg flex items-center justify-center text-[9px] font-bold border-2" style={{ color: primary, borderColor: primary }}>Outline</div>
                <div className="h-7 px-3 rounded-lg flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: accent }}>Badge</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Login Page Preview — Pixel-perfect replica ── */}
        {previewMode === "login" && (
          <div className="w-full overflow-hidden">
            <LoginPagePreview branding={branding} />
          </div>
        )}

        {/* ── Email Preview ── */}
        {previewMode === "email" && (
          <div className="h-full w-full flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm w-full max-w-[220px]">
              <div className="h-12 flex items-center justify-center" style={{ backgroundColor: branding.email?.brandColor || primary }}>
                {(branding.email?.headerLogo || branding.logo) ? (
                  <img src={branding.email?.headerLogo || branding.logo} alt="Logo" className="h-7 object-contain" />
                ) : (
                  <span className="text-white text-[11px] font-bold tracking-wide">Your Institute</span>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="h-2.5 bg-slate-100 rounded w-full" />
                <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-full" />
                <div className="h-2.5 bg-slate-100 rounded w-2/3" />
                <div className="h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold mt-3" style={{ backgroundColor: branding.email?.brandColor || primary }}>
                  Action Button
                </div>
              </div>
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-[9px] text-slate-400 text-center leading-tight">{branding.email?.footerText || "© 2026 Your Institute. All rights reserved."}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Published status */}
      {branding.publishedAt && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
          <Check className="w-3 h-3" />
          Live since {new Date(branding.publishedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}


// ─── Full Login Page Preview (Designer right-panel) ───────────────────────────
// Renders a pixel-perfect login page that scales to fill the container width.
// Uses ResizeObserver so scale stays correct whenever the container resizes.
function FullLoginPreview({ branding }: { branding: BrandingData }) {
  const primary   = branding.colors?.primary     || "#6366f1"
  const layout    = branding.loginPage?.layout   || "left-image"
  const bgImage   = branding.loginPage?.image    || null
  const overlayColor   = branding.loginPage?.overlayColor   || "#000000"
  const overlayOpacity = branding.loginPage?.overlayOpacity ?? 0.4
  const heading   = branding.loginPage?.heading  || "Welcome Back"
  const subtext   = branding.loginPage?.subtext  || "Log in to your dashboard"
  const logoSrc   = branding.logo

  const FULL_W = 1280
  const FULL_H = 800

  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef     = useRef<HTMLDivElement>(null)

  // Recompute scale whenever container width changes
  useEffect(() => {
    const applyScale = () => {
      if (!containerRef.current || !innerRef.current) return
      const w = containerRef.current.clientWidth
      const s = w / FULL_W
      innerRef.current.style.transform = `scale(${s})`
      containerRef.current.style.height = `${FULL_H * s}px`
    }
    applyScale()
    const ro = new ResizeObserver(applyScale)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, []) // runs once; ResizeObserver handles all subsequent resizes

  // ── Form panel (right side) — identical to actual login/page.tsx ──────────
  const formPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#fff', padding: '40px 60px' }}>
      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        {logoSrc
          ? <img src={logoSrc} alt="Logo" style={{ height: 56, objectFit: 'contain', maxWidth: 240 }} />
          : <div style={{ width: 56, height: 56, borderRadius: 14, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 24, margin: '0 auto' }}>A</div>
        }
      </div>
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 8 }}>{heading}</div>
        <div style={{ fontSize: 15, color: '#64748b', fontWeight: 500 }}>{subtext}</div>
      </div>
      {/* Email */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Email Address</div>
        <div style={{ background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0', height: 48, display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 10 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: '#cbd5e1' }} />
          <div style={{ fontSize: 14, color: '#94a3b8' }}>admin@institute.com</div>
        </div>
      </div>
      {/* Password */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: primary }}>Forgot?</div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0', height: 48, display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 10 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: '#cbd5e1' }} />
          <div style={{ fontSize: 14, color: '#94a3b8' }}>••••••••</div>
        </div>
      </div>
      {/* Login button */}
      <div style={{ width: '100%', maxWidth: 400, height: 48, borderRadius: 12, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.05em', boxShadow: `0 4px 14px ${primary}50`, marginBottom: 24 }}>
        Login
      </div>
      {/* Portal links */}
      <div style={{ width: '100%', maxWidth: 400, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.25em', marginBottom: 12 }}>PORTAL ACCESS</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, height: 40, borderRadius: 10, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>Student</div>
          <div style={{ flex: 1, height: 40, borderRadius: 10, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>Staff</div>
        </div>
      </div>
    </div>
  )

  // ── Image panel — <img> tag, NOT CSS background-image (avoids CORS) ────────
  const imagePanel = (
    <div style={{ position: 'relative', width: '55%', height: '100%', overflow: 'hidden', background: bgImage ? '#000' : `linear-gradient(135deg, ${primary}, ${primary}cc)`, flexShrink: 0 }}>
      {bgImage && <img src={bgImage} alt="bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />}
      {bgImage && <div style={{ position: 'absolute', inset: 0, background: overlayColor, opacity: overlayOpacity, zIndex: 1 }} />}
      {/* Always show bottom gradient so text is readable */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)', zIndex: 2 }} />
      {/* Text at bottom */}
      <div style={{ position: 'absolute', bottom: 52, left: 52, right: 52, zIndex: 10, color: '#fff' }}>
        <div style={{ width: 48, height: 5, background: 'rgba(255,255,255,0.6)', borderRadius: 5, marginBottom: 20 }} />
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.4)', marginBottom: 10 }}>{heading}</div>
        <div style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{subtext}</div>
      </div>
    </div>
  )

  return (
    // containerRef captures the rendered width; height is set dynamically
    <div ref={containerRef} style={{ width: '100%', position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>
      <div
        ref={innerRef}
        style={{
          width: FULL_W,
          height: FULL_H,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* ── Full Background layout ── */}
        {layout === "full-bg" && (
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgImage ? '#000' : `linear-gradient(135deg, ${primary}40, ${primary}70)` }}>
            {bgImage && <img src={bgImage} alt="bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />}
            {bgImage && <div style={{ position: 'absolute', inset: 0, background: overlayColor, opacity: overlayOpacity, zIndex: 1 }} />}
            <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderRadius: 28, width: 500, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
              <div style={{ height: 5, background: primary }} />
              {formPanel}
            </div>
          </div>
        )}

        {/* ── Left Image layout ── */}
        {layout === "left-image" && (
          <>{imagePanel}<div style={{ width: '45%', height: '100%', flexShrink: 0 }}>{formPanel}</div></>
        )}

        {/* ── Right Image layout ── */}
        {layout === "right-image" && (
          <><div style={{ width: '45%', height: '100%', flexShrink: 0 }}>{formPanel}</div>{imagePanel}</>
        )}
      </div>
    </div>
  )
}


// ─── Main BrandingTab Component ────────────────────────────────────────────────
export function BrandingTab({ instituteId }: { instituteId: string }) {
  const { database } = useFirebase()
  const { toast } = useToast()
  const [subTab, setSubTab] = useState("logo")
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING)
  const [draft, setDraft] = useState<BrandingData>(DEFAULT_BRANDING)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const logoUpload = useImageUpload(instituteId, "logo")
  const dashLogoUpload = useImageUpload(instituteId, "dashboard-logo")
  const faviconUpload = useImageUpload(instituteId, "favicon")
  const loginImageUpload = useImageUpload(instituteId, "login-image")
  const emailLogoUpload = useImageUpload(instituteId, "email-logo")

  // Load existing branding
  useEffect(() => {
    if (!database || !instituteId) return
    const brandRef = dbRef(database, `Institutes/${instituteId}/branding`)
    const unsub = onValue(brandRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        const merged = { ...DEFAULT_BRANDING, ...data, colors: { ...DEFAULT_BRANDING.colors, ...data.colors }, loginPage: { ...DEFAULT_BRANDING.loginPage, ...data.loginPage }, email: { ...DEFAULT_BRANDING.email, ...data.email } }
        setBranding(merged)
        // Load draft if exists
        if (data.draft) {
          const draftMerged = { ...merged, ...data.draft, colors: { ...merged.colors, ...data.draft.colors }, loginPage: { ...merged.loginPage, ...data.draft.loginPage }, email: { ...merged.email, ...data.draft.email } }
          setDraft(draftMerged)
          setHasChanges(true)
        } else {
          setDraft(merged)
        }
      } else {
        setBranding(DEFAULT_BRANDING)
        setDraft(DEFAULT_BRANDING)
      }
    })
    return () => unsub()
  }, [database, instituteId])

  const updateDraft = (updates: Partial<BrandingData>) => {
    setDraft(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const updateDraftColors = (colors: Partial<{ primary: string; secondary: string; accent: string }>) => {
    setDraft(prev => ({ ...prev, colors: { ...prev.colors, ...DEFAULT_BRANDING.colors, ...colors } }))
    setHasChanges(true)
  }

  const updateDraftLogin = (updates: Partial<BrandingData["loginPage"]>) => {
    setDraft(prev => ({ ...prev, loginPage: { ...DEFAULT_BRANDING.loginPage, ...prev.loginPage, ...updates } }))
    setHasChanges(true)
  }

  const updateDraftEmail = (updates: Partial<BrandingData["email"]>) => {
    setDraft(prev => ({ ...prev, email: { ...DEFAULT_BRANDING.email, ...prev.email, ...updates } }))
    setHasChanges(true)
  }

  const handleUpload = async (file: File, field: string, uploader: ReturnType<typeof useImageUpload>) => {
    try {
      const url = await uploader.upload(file)
      updateDraft({ [field]: url })
      toast({ title: "Uploaded!", description: "Image uploaded successfully." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: e.message })
    }
  }

  const handleSaveDraft = async () => {
    if (!database) return
    setIsSavingDraft(true)
    try {
      // Strip publishedAt from draft, store under /branding/draft
      const { publishedAt, ...draftData } = draft
      await update(dbRef(database, `Institutes/${instituteId}/branding`), { draft: draftData })
      toast({ title: "Draft Saved", description: "Changes saved as draft. Publish when ready." })
    } catch {
      toast({ variant: "destructive", title: "Save Failed" })
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handlePublish = async () => {
    if (!database) return
    setIsPublishing(true)
    try {
      const published: BrandingData = { ...draft, publishedAt: Date.now() }
      const { publishedAt, ...withoutPublished } = published
      // Save history snapshot of current published
      const historyKey = `history_${Date.now()}`
      const updates: any = {
        [`Institutes/${instituteId}/branding/logo`]: published.logo || null,
        [`Institutes/${instituteId}/branding/dashboardLogo`]: published.dashboardLogo || null,
        [`Institutes/${instituteId}/branding/favicon`]: published.favicon || null,
        [`Institutes/${instituteId}/branding/colors`]: published.colors || DEFAULT_BRANDING.colors,
        [`Institutes/${instituteId}/branding/loginPage`]: published.loginPage || DEFAULT_BRANDING.loginPage,
        [`Institutes/${instituteId}/branding/email`]: published.email || DEFAULT_BRANDING.email,
        [`Institutes/${instituteId}/branding/customCss`]: published.customCss || null,
        [`Institutes/${instituteId}/branding/publishedAt`]: Date.now(),
        [`Institutes/${instituteId}/branding/draft`]: null,
      }
      await update(dbRef(database), updates)
      setBranding(published)
      setHasChanges(false)
      toast({ title: "🎉 Published!", description: "Branding is now live across the platform." })
    } catch {
      toast({ variant: "destructive", title: "Publish Failed" })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleRollback = async () => {
    if (!database) return
    try {
      // Reset draft to current published branding
      setDraft(branding)
      await update(dbRef(database, `Institutes/${instituteId}/branding`), { draft: null })
      setHasChanges(false)
      toast({ title: "Rolled Back", description: "Draft discarded. Showing published branding." })
    } catch {
      toast({ variant: "destructive", title: "Rollback Failed" })
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Paintbrush className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-800">Branding Control</h3>
            <p className="text-[11px] text-slate-400 font-medium">Customize white-label identity for this institute</p>
          </div>
          {hasChanges && (
            <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] font-bold">
              Unsaved Draft
            </Badge>
          )}
          {branding.publishedAt && !hasChanges && (
            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] font-bold">
              <Check className="w-2.5 h-2.5 mr-1" /> Live
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleRollback} className="h-9 rounded-xl text-[12px] font-semibold border-slate-200">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Rollback
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSavingDraft || !hasChanges} className="h-9 rounded-xl text-[12px] font-semibold border-slate-200">
            {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save Draft
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={isPublishing} className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-[12px] font-bold shadow-sm shadow-indigo-200/50">
            {isPublishing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            Publish Live
          </Button>
        </div>
      </div>

      {/* ════ LOGIN DESIGNER MODE — Full-width two-panel layout ════ */}
      {subTab === "login" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">

          {/* ── Left: Login Settings Panel ── */}
          <div className="space-y-4">
            {/* Sub-tab Nav (compact) */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-1.5">
              <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {SUB_TABS.map(tab => {
                  const Icon = tab.icon
                  const isActive = subTab === tab.id
                  return (
                    <button key={tab.id} onClick={() => setSubTab(tab.id)}
                      className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all shrink-0",
                        isActive ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")}
                    ><Icon className="w-3.5 h-3.5 shrink-0" />{tab.label}</button>
                  )
                })}
              </div>
            </div>

            <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6 space-y-6 animate-in fade-in duration-200">
              <div>
                <h4 className="text-[14px] font-bold text-slate-800 mb-0.5">Login Page Designer</h4>
                <p className="text-[12px] text-slate-400 font-medium">Changes preview live on the right. Publish to apply.</p>
              </div>

              {/* Layout Picker */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Layout Style</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LAYOUT_OPTIONS.map(opt => {
                    const isSelected = draft.loginPage?.layout === opt.id
                    return (
                      <button key={opt.id} onClick={() => updateDraftLogin({ layout: opt.id as any })}
                        className={cn("p-2.5 rounded-xl border-2 transition-all text-left", isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300")}>
                        <div className={cn("h-8 rounded-lg mb-1.5 overflow-hidden flex", opt.id === "right-image" && "flex-row-reverse")}>
                          {opt.id === "full-bg" ? (
                            <div className="flex-1 relative flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${draft.colors?.primary || '#6366f1'}80, ${draft.colors?.accent || '#10b981'}80)` }}>
                              <div className="w-6 h-5 bg-white/90 rounded" />
                            </div>
                          ) : (
                            <>
                              <div className="w-1/2" style={{ background: `linear-gradient(135deg, ${draft.colors?.primary || '#6366f1'}, ${draft.colors?.accent || '#10b981'})` }} />
                              <div className="w-1/2 bg-white flex items-center justify-center"><div className="w-4 h-3 bg-slate-100 rounded-sm" /></div>
                            </>
                          )}
                        </div>
                        <p className={cn("text-[11px] font-bold", isSelected ? "text-indigo-700" : "text-slate-700")}>{opt.label}</p>
                        <p className="text-[9px] text-slate-400">{opt.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Background Image */}
              <ImageDropzone
                label="Background / Cover Image"
                hint="1920×1080 JPG or PNG. Used as left-panel or full background."
                value={draft.loginPage?.image}
                onUpload={(f) => loginImageUpload.upload(f).then(url => updateDraftLogin({ image: url })).catch(e => toast({ variant: "destructive", title: e.message }))}
                isUploading={loginImageUpload.isUploading}
                progress={loginImageUpload.progress}
              />

              {/* Heading & Subtext */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Login Page Heading</Label>
                  <Input
                    value={draft.loginPage?.heading || ""}
                    onChange={e => updateDraftLogin({ heading: e.target.value })}
                    placeholder="Welcome Back"
                    className="h-11 rounded-xl border-slate-200 text-[14px] font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sub-text / Tagline</Label>
                  <Input
                    value={draft.loginPage?.subtext || ""}
                    onChange={e => updateDraftLogin({ subtext: e.target.value })}
                    placeholder="Log in to your dashboard"
                    className="h-11 rounded-xl border-slate-200 text-[14px]"
                  />
                </div>
              </div>

              {/* Overlay Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overlay Color</Label>
                  <div className="relative h-11 rounded-xl border border-slate-200 overflow-hidden flex items-center">
                    <input type="color" value={draft.loginPage?.overlayColor || "#000000"} onChange={e => updateDraftLogin({ overlayColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <div className="w-10 h-full" style={{ backgroundColor: draft.loginPage?.overlayColor || "#000000" }} />
                    <span className="flex-1 text-center font-mono text-[12px] font-semibold text-slate-700">{draft.loginPage?.overlayColor || "#000000"}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Opacity — {Math.round((draft.loginPage?.overlayOpacity ?? 0.4) * 100)}%</Label>
                  <div className="h-11 flex items-center">
                    <input type="range" min={0} max={1} step={0.05}
                      value={draft.loginPage?.overlayOpacity ?? 0.4}
                      onChange={e => updateDraftLogin({ overlayOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSavingDraft || !hasChanges} className="flex-1 h-9 rounded-xl text-[12px] font-semibold border-slate-200">
                  {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save Draft
                </Button>
                <Button size="sm" onClick={handlePublish} disabled={isPublishing} className="flex-1 h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-[12px] font-bold shadow-sm">
                  {isPublishing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  Publish
                </Button>
              </div>
            </Card>
          </div>

          {/* ── Right: Full-size Login Page Preview ── */}
          <div className="sticky top-4">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              {/* Preview header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="ml-2 flex-1 bg-slate-100 rounded-md px-3 py-1">
                    <span className="text-[11px] text-slate-500 font-mono">yoursite.com/login</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasChanges && <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">Draft</span>}
                  {branding.publishedAt && !hasChanges && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Check className="w-2.5 h-2.5" />Live</span>}
                </div>
              </div>
              {/* Full login preview */}
              <FullLoginPreview branding={draft} />
            </div>
          </div>

        </div>
      )}

      {/* ════ NORMAL MODE — all other sub-tabs ════ */}
      {subTab !== "login" && (
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">

        {/* Left: Sub-tabs + Controls (3/5) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Sub-tab Nav */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-1.5">
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {SUB_TABS.map(tab => {
                const Icon = tab.icon
                const isActive = subTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSubTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all shrink-0",
                      isActive ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />{tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sub-tab Content */}
          <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6 md:p-7 animate-in fade-in duration-200">

            {/* ── LOGO & FAVICON ── */}
            {subTab === "logo" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 mb-0.5">Logo & Favicon</h4>
                  <p className="text-[12px] text-slate-400 font-medium">PNG, JPG, SVG up to 2MB. Logo shows in website header and admin sidebar.</p>
                </div>

                <ImageDropzone
                  label="Primary Logo"
                  hint="Used in website header, sidebar, login page. Recommended: SVG or PNG (transparent bg)."
                  value={draft.logo}
                  onUpload={(f) => handleUpload(f, "logo", logoUpload)}
                  isUploading={logoUpload.isUploading}
                  progress={logoUpload.progress}
                />

                <ImageDropzone
                  label="Dashboard Sidebar Logo (Optional)"
                  hint="If different from main logo — shows only in the admin panel sidebar. Falls back to primary logo."
                  value={draft.dashboardLogo}
                  onUpload={(f) => handleUpload(f, "dashboardLogo", dashLogoUpload)}
                  isUploading={dashLogoUpload.isUploading}
                  progress={dashLogoUpload.progress}
                />

                <ImageDropzone
                  label="Favicon"
                  hint="Browser tab icon. PNG (16×16 or 32×32). Will be applied to all pages."
                  value={draft.favicon}
                  onUpload={(f) => handleUpload(f, "favicon", faviconUpload)}
                  isUploading={faviconUpload.isUploading}
                  progress={faviconUpload.progress}
                  accept="image/png,image/x-icon,image/ico"
                />

                {draft.logo && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Logo Usage Preview</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                        <img src={draft.logo} alt="Logo" className="h-6 object-contain" />
                        <span className="text-[11px] text-slate-500 font-medium">Sidebar</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl">
                        <img src={draft.logo} alt="Logo" className="h-6 object-contain brightness-200" />
                        <span className="text-[11px] text-white font-medium">Dark Header</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── BRAND COLORS ── */}
            {subTab === "colors" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 mb-0.5">Brand Colors</h4>
                  <p className="text-[12px] text-slate-400 font-medium">Applied to buttons, sidebar accents, headers, and links across the platform.</p>
                </div>

                {/* Color Presets */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => updateDraftColors({ primary: preset.primary, secondary: preset.secondary, accent: preset.accent })}
                        className="group flex flex-col items-center gap-1.5 p-2 rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex gap-0.5">
                          <div className="w-4 h-4 rounded-l-md" style={{ backgroundColor: preset.primary }} />
                          <div className="w-4 h-4 rounded-r-md" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { key: "primary", label: "Primary Color", desc: "Buttons, active states, links" },
                    { key: "secondary", label: "Secondary Color", desc: "Backgrounds, sidebar fill" },
                    { key: "accent", label: "Accent Color", desc: "Highlights, badges, tags" },
                  ].map(c => (
                    <div key={c.key} className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{c.label}</Label>
                      <div className="relative">
                        <div className="h-11 rounded-xl border border-slate-200 overflow-hidden flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                          <input
                            type="color"
                            value={(draft.colors as any)?.[c.key] || "#6366f1"}
                            onChange={e => updateDraftColors({ [c.key]: e.target.value } as any)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="w-10 h-full" style={{ backgroundColor: (draft.colors as any)?.[c.key] || "#6366f1" }} />
                          <span className="flex-1 text-center text-[13px] font-mono font-semibold text-slate-700">
                            {(draft.colors as any)?.[c.key] || "#6366f1"}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">{c.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Color Palette Preview */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Color Scheme Preview</p>
                  <div className="flex h-10 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex-1" style={{ backgroundColor: draft.colors?.primary || "#6366f1" }} />
                    <div className="flex-1" style={{ backgroundColor: draft.colors?.secondary || "#f8fafc" }} />
                    <div className="flex-1" style={{ backgroundColor: draft.colors?.accent || "#10b981" }} />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 px-5 rounded-xl text-white text-[12px] font-bold flex items-center justify-center shadow-sm" style={{ backgroundColor: draft.colors?.primary }}>
                      Button
                    </div>
                    <div className="h-9 px-5 rounded-xl text-[12px] font-bold flex items-center justify-center border-2" style={{ color: draft.colors?.primary, borderColor: draft.colors?.primary }}>
                      Outline
                    </div>
                    <div className="h-9 px-4 rounded-xl text-white text-[12px] font-bold flex items-center justify-center" style={{ backgroundColor: draft.colors?.accent }}>
                      Badge
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── LOGIN PAGE ── */}
            {subTab === "login" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 mb-0.5">Login Page Design</h4>
                  <p className="text-[12px] text-slate-400 font-medium">Customize the institute admin login page layout, background image, and messaging.</p>
                </div>

                {/* Layout Picker */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Layout Style</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {LAYOUT_OPTIONS.map(opt => {
                      const isSelected = draft.loginPage?.layout === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => updateDraftLogin({ layout: opt.id as any })}
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all text-left",
                            isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {/* Tiny layout preview */}
                          <div className={cn("h-10 rounded-lg mb-2 overflow-hidden flex", opt.id === "right-image" && "flex-row-reverse")}>
                            {opt.id === "full-bg" ? (
                              <div className="flex-1 relative flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${draft.colors?.primary}60, ${draft.colors?.accent}60)` }}>
                                <div className="w-8 h-6 bg-white/90 rounded-md" />
                              </div>
                            ) : (
                              <>
                                <div className="w-1/2" style={{ background: `linear-gradient(135deg, ${draft.colors?.primary}, ${draft.colors?.accent})` }} />
                                <div className="w-1/2 bg-white flex items-center justify-center">
                                  <div className="w-6 h-4 bg-slate-100 rounded-sm" />
                                </div>
                              </>
                            )}
                          </div>
                          <p className={cn("text-[11px] font-bold", isSelected ? "text-indigo-700" : "text-slate-700")}>{opt.label}</p>
                          <p className="text-[10px] text-slate-400">{opt.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Background Image */}
                <ImageDropzone
                  label="Background / Cover Image"
                  hint="Recommended: 1920×1080 JPG or PNG. Will be used as left-panel or full background."
                  value={draft.loginPage?.image}
                  onUpload={(f) => loginImageUpload.upload(f).then(url => updateDraftLogin({ image: url })).catch(e => toast({ variant: "destructive", title: e.message }))}
                  isUploading={loginImageUpload.isUploading}
                  progress={loginImageUpload.progress}
                />

                {/* Text Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Heading Text</Label>
                    <Input
                      value={draft.loginPage?.heading || ""}
                      onChange={e => updateDraftLogin({ heading: e.target.value })}
                      placeholder="Welcome Back"
                      className="h-11 rounded-xl border-slate-200 text-[14px] font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sub-text</Label>
                    <Input
                      value={draft.loginPage?.subtext || ""}
                      onChange={e => updateDraftLogin({ subtext: e.target.value })}
                      placeholder="Login to your dashboard"
                      className="h-11 rounded-xl border-slate-200 text-[14px]"
                    />
                  </div>
                </div>

                {/* Overlay */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overlay Color</Label>
                    <div className="relative h-11 rounded-xl border border-slate-200 overflow-hidden flex items-center">
                      <input type="color" value={draft.loginPage?.overlayColor || "#000000"} onChange={e => updateDraftLogin({ overlayColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="w-10 h-full" style={{ backgroundColor: draft.loginPage?.overlayColor || "#000000" }} />
                      <span className="flex-1 text-center font-mono text-[13px] font-semibold text-slate-700">{draft.loginPage?.overlayColor || "#000000"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Overlay Opacity — {Math.round((draft.loginPage?.overlayOpacity ?? 0.4) * 100)}%
                    </Label>
                    <div className="h-11 flex items-center px-1">
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={draft.loginPage?.overlayOpacity ?? 0.4}
                        onChange={e => updateDraftLogin({ overlayOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-600 h-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── EMAIL BRANDING ── */}
            {subTab === "email" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 mb-0.5">Email Branding</h4>
                  <p className="text-[12px] text-slate-400 font-medium">Applied to password reset, welcome emails, and all system notifications.</p>
                </div>

                <ImageDropzone
                  label="Email Header Logo"
                  hint="Shown at the top of all emails. Recommended: white/transparent PNG, 300×80px."
                  value={draft.email?.headerLogo}
                  onUpload={(f) => emailLogoUpload.upload(f).then(url => updateDraftEmail({ headerLogo: url })).catch(e => toast({ variant: "destructive", title: e.message }))}
                  isUploading={emailLogoUpload.isUploading}
                  progress={emailLogoUpload.progress}
                />

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Brand Color</Label>
                  <div className="relative h-11 rounded-xl border border-slate-200 overflow-hidden flex items-center">
                    <input type="color" value={draft.email?.brandColor || "#6366f1"} onChange={e => updateDraftEmail({ brandColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="w-10 h-full" style={{ backgroundColor: draft.email?.brandColor || "#6366f1" }} />
                    <span className="flex-1 text-center font-mono text-[13px] font-semibold text-slate-700">{draft.email?.brandColor || "#6366f1"}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Used for email header background and CTA button.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Footer Text</Label>
                  <Input
                    value={draft.email?.footerText || ""}
                    onChange={e => updateDraftEmail({ footerText: e.target.value })}
                    placeholder="© 2026 Your Institute. All rights reserved."
                    className="h-11 rounded-xl border-slate-200 text-[13px]"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Shown at the bottom of every email.</p>
                </div>
              </div>
            )}

            {/* ── ADVANCED ── */}
            {subTab === "advanced" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 mb-0.5">Advanced Customization</h4>
                  <p className="text-[12px] text-slate-400 font-medium">Inject custom CSS for fine-grained control. Applied after all other styles.</p>
                </div>

                {/* Theme Presets */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-400" /> Theme Presets
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "Clean White", css: ":root { --radius: 0.75rem; }" },
                      { name: "Sharp Edges", css: ":root { --radius: 0.25rem; }" },
                      { name: "Rounded Soft", css: ":root { --radius: 1.5rem; }" },
                      { name: "Glassmorphism", css: ".card { backdrop-filter: blur(10px); background: rgba(255,255,255,0.7) !important; }" },
                    ].map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => updateDraft({ customCss: (draft.customCss ? draft.customCss + "\n" : "") + preset.css })}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left group"
                      >
                        <span className="text-[12px] font-semibold text-slate-700 group-hover:text-indigo-700">{preset.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom CSS Editor */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-3 h-3" /> Custom CSS
                  </Label>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono font-semibold">CSS Editor</span>
                      <button onClick={() => updateDraft({ customCss: "" })} className="text-slate-500 hover:text-slate-300 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={draft.customCss || ""}
                      onChange={e => updateDraft({ customCss: e.target.value })}
                      placeholder={`/* Custom CSS */\n.sidebar { border-right: 2px solid #e2e8f0; }\n.btn-primary { border-radius: 99px !important; }`}
                      className="w-full h-48 bg-slate-900 text-emerald-400 font-mono text-[12px] p-4 outline-none resize-none placeholder:text-slate-600"
                      spellCheck={false}
                    />
                  </div>
                  <p className="text-[10px] text-amber-600 font-semibold">⚠️ Custom CSS is injected globally. Use sparingly to avoid layout breaking changes.</p>
                </div>

                {/* Dark Mode Note */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 text-white text-[10px] font-bold">🌙</div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">Dark Mode Support (Coming Soon)</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Configure separate dark-mode brand colors and logos per institute. Currently inherits system preference.</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Live Preview (2/5) */}
        <div className="xl:col-span-2">
          <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-5 sticky top-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-slate-400" />
              <h4 className="text-[13px] font-bold text-slate-700">Live Preview</h4>
              <span className="text-[11px] text-slate-400 font-medium ml-1">— updates as you edit</span>
            </div>
            <div className="min-h-[280px]">
              <LivePreview branding={draft} subTab={subTab} />
            </div>
          </Card>
        </div>

      </div>
      )}
    </div>
  )
}
