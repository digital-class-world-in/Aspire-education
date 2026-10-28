"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload, Plus, Save, Trash2, Award, Loader2, GripHorizontal, Type } from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref as dbRef, onValue, off, update, set, push } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export type CertificateField = {
  id: string
  key: string
  label: string
  type: 'text' | 'image' | 'qr'
  x: number // percentage
  y: number // percentage
  fontSize?: number // px
  color?: string
  fontWeight?: string
  fontStyle?: 'normal' | 'italic'
  tracking?: number
}

export type CertificateTemplateConfig = {
  id: string
  name: string
  frameUrl: string
  fields: CertificateField[]
  baseFontFamily?: string
  baseFontSize?: string
}

const AVAILABLE_VARIABLES = [
  { key: 'studentName', label: 'Student Name', type: 'text' },
  { key: 'academicYear', label: 'Academic Year / Session', type: 'text' },
  { key: 'courseName', label: 'Course/Achievement Title', type: 'text' },
  { key: 'certificateNo', label: 'Certificate Number', type: 'text' },
  { key: 'issueDate', label: 'Issue Date', type: 'text' },
  { key: 'instituteName', label: 'Institute Name', type: 'text' },
  { key: 'qrCode', label: 'Verification QR', type: 'qr' },
]

interface CertificateConfiguratorProps {
  templateId?: string; // If editing existing
  onSaveComplete?: () => void;
}

export function CertificateConfigurator({ templateId, onSaveComplete }: CertificateConfiguratorProps) {
  const { database, storage } = useFirebase()

  const [templateName, setTemplateName] = useState("New Certificate Template")
  const [frameUrl, setFrameUrl] = useState<string>("")
  const [fields, setFields] = useState<CertificateField[]>([])

  const [baseFontFamily, setBaseFontFamily] = useState("'Inter', sans-serif")
  const [baseFontSize, setBaseFontSize] = useState("Default")

  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(!!templateId)

  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => {
    if (!database || !templateId) {
      setIsLoading(false);
      return;
    }
    const configPath = `GlobalSettings/CustomCertificates/${templateId}`
    const unsubscribe = onValue(dbRef(database, configPath), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setTemplateName(data.name || "Untitled Template")
        setFrameUrl(data.frameUrl || "")
        setFields(data.fields || [])
        setBaseFontFamily(data.baseFontFamily || "'Inter', sans-serif")
        setBaseFontSize(data.baseFontSize || "Default")
      }
      setIsLoading(false)
    })
    return () => off(dbRef(database, configPath))
  }, [database, templateId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (5MB max for certificates)
    const sizeKB = file.size / 1024
    if (sizeKB > 5 * 1024) {
      toast({ variant: "destructive", title: "File Too Large", description: "Certificate frame must be less than 5MB." })
      return
    }

    setIsUploading(true)
    try {
      const res = await uploadFileToImageKit(file, "/certificates")
      setFrameUrl(res.url)
      toast({ title: "Frame Uploaded Successfully", description: "Stored in ImageKit." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Failed to upload to ImageKit" })
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddField = (variableKey: string) => {
    const variableDef = AVAILABLE_VARIABLES.find(v => v.key === variableKey)
    if (!variableDef) return

    if (fields.some(f => f.key === variableKey)) {
      toast({ title: "Duplicate Variable", description: "This variable is already mapped.", variant: "destructive" })
      return
    }

    const newField: CertificateField = {
      id: `field_${Date.now()}`,
      key: variableDef.key,
      label: variableDef.label,
      type: variableDef.type as any,
      x: 50,
      y: 50,
      fontSize: variableKey === 'studentName' ? 42 : 24,
      color: '#1a120b',
      fontWeight: 'bold',
      fontStyle: 'normal',
      tracking: 0
    }

    setFields([...fields, newField])
  }

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const handleSaveConfig = async () => {
    if (!database) return
    if (!frameUrl) {
      toast({ variant: "destructive", title: "Frame Required", description: "Please upload a certificate frame first." })
      return
    }

    setIsSaving(true)
    try {
      const targetId = templateId || push(dbRef(database, 'GlobalSettings/CustomCertificates')).key
      const configPath = `GlobalSettings/CustomCertificates/${targetId}`

      await set(dbRef(database, configPath), {
        id: targetId,
        name: templateName,
        frameUrl,
        fields,
        baseFontFamily,
        baseFontSize,
        updatedAt: Date.now()
      })

      toast({ title: "Certificate Template Saved" })
      if (onSaveComplete) onSaveComplete()
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed" })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault()
    setDraggingId(id)
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()

    let newX = ((e.clientX - containerRect.left) / containerRect.width) * 100
    let newY = ((e.clientY - containerRect.top) / containerRect.height) * 100

    newX = Math.max(0, Math.min(100, newX))
    newY = Math.max(0, Math.min(100, newY))

    setFields(fields.map(f => {
      if (f.id === draggingId) {
        return { ...f, x: newX, y: newY }
      }
      return f
    }))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
      setDraggingId(null)
    }
  }

  if (isLoading) return <div className="p-8 text-center text-black font-bold animate-pulse">Loading Configurator...</div>

  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden font-public-sans">
      <div className="bg-zinc-50 px-10 py-6 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-600" />
          <h3 className="font-black text-black text-[14px] tracking-widest">Certificate Frame Designer</h3>
        </div>
        <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-none font-bold tracking-widest text-[9px]">Professional Customization</Badge>
      </div>

      <div className="p-10 space-y-10">

        {/* Step 1: Basic Info & Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-[10px] font-black text-black tracking-[0.2em]">Template Name</Label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full h-12 border border-zinc-200 rounded-xl px-4 font-bold text-[14px] focus:ring-1 focus:ring-amber-500 outline-none"
              placeholder="e.g. Academic Excellence 2024"
            />
          </div>
          <div className="space-y-4">
            <Label className="text-[10px] font-black text-black tracking-[0.2em]">Upload Frame (Landscape)</Label>
            <div className="flex items-center gap-4">
              <Button asChild disabled={isUploading} className="bg-white border border-zinc-200 text-black hover:bg-zinc-50 rounded-xl h-12 px-6 font-bold text-[10px] tracking-widest shadow-sm flex-1">
                <label className="cursor-pointer">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  {frameUrl ? 'Change Frame' : 'Select Blank Certificate Image'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </Button>
              {frameUrl && <Button onClick={() => setFrameUrl("")} variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-12 text-[10px] tracking-widest font-black rounded-xl">Remove</Button>}
            </div>
          </div>

          {/* Global Font Configurations */}
          <div className="space-y-4">
            <Label className="text-[10px] font-black text-black tracking-[0.2em]">Global Font Style</Label>
            <Select value={baseFontFamily} onValueChange={setBaseFontFamily}>
              <SelectTrigger className="h-12 border-zinc-200 rounded-xl font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-2xl">
                <SelectItem value="'Inter', sans-serif" className="font-bold">Modern (Inter)</SelectItem>
                <SelectItem value="'Playfair Display', serif" className="font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Elegant (Playfair)</SelectItem>
                <SelectItem value="'Great Vibes', cursive" className="font-bold text-lg" style={{ fontFamily: "'Great Vibes', cursive" }}>Classic (Great Vibes)</SelectItem>
                <SelectItem value="'Cormorant Garamond', serif" className="font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Vintage (Cormorant)</SelectItem>
                <SelectItem value="'Montserrat', sans-serif" className="font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Clean (Montserrat)</SelectItem>
                <SelectItem value="'Dancing Script', cursive" className="font-bold text-lg" style={{ fontFamily: "'Dancing Script', cursive" }}>Casual (Dancing)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4">
            <Label className="text-[10px] font-black text-black tracking-[0.2em]">Global Base Size</Label>
            <Select value={baseFontSize} onValueChange={setBaseFontSize}>
              <SelectTrigger className="h-12 border-zinc-200 rounded-xl font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-2xl">
                <SelectItem value="Default" className="font-bold text-zinc-500">Template Default</SelectItem>
                <SelectItem value="16px" className="font-bold">Small (16px)</SelectItem>
                <SelectItem value="24px" className="font-bold">Medium (24px)</SelectItem>
                <SelectItem value="36px" className="font-bold">Large (36px)</SelectItem>
                <SelectItem value="48px" className="font-bold">X-Large (48px)</SelectItem>
                <SelectItem value="64px" className="font-bold">Huge (64px)</SelectItem>
                <SelectItem value="80px" className="font-bold">Giant (80px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Designer Workspace */}
        {frameUrl && (
          <div className="space-y-8 pt-10 border-t border-zinc-50">
            <div className="flex flex-col lg:flex-row gap-10">

              {/* Mapping Canvas (Landscape) */}
              <div className="flex-1 bg-zinc-50/50 p-8 flex justify-center items-center rounded-[32px] border border-zinc-100 shadow-inner overflow-hidden min-h-[400px]">
                <div
                  ref={containerRef}
                  className="relative w-full aspect-[1123/794] bg-white rounded-lg shadow-2xl border border-zinc-200 overflow-hidden"
                  onPointerMove={handlePointerMove}
                >
                  <img src={frameUrl} alt="Certificate Frame" className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none bg-white" />

                  {fields.map(field => (
                    <div
                      key={field.id}
                      onPointerDown={(e) => handlePointerDown(e, field.id)}
                      onPointerUp={handlePointerUp}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        color: field.color || '#000',
                        fontSize: field.type === 'text' ? (baseFontSize && baseFontSize !== "Default" ? baseFontSize : `${field.fontSize || 24}px`) : undefined,
                        fontWeight: field.fontWeight || 'bold',
                        fontStyle: field.fontStyle || 'normal',
                        fontFamily: baseFontFamily,
                        letterSpacing: field.type === 'text' ? `${field.tracking || 0}px` : undefined,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={cn(
                        "absolute cursor-move select-none flex items-center justify-center p-1 rounded transition-shadow touch-none whitespace-nowrap",
                        draggingId === field.id ? "ring-2 ring-amber-500 bg-amber-500/10 shadow-lg z-50" : "hover:ring-1 hover:ring-zinc-400 z-10",
                        field.type !== 'text' && "bg-black/10 border-2 border-dashed border-zinc-400 w-24 h-24"
                      )}
                    >
                      {field.type === 'text' ? `{${field.key}}` : `[${field.label}]`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Panel */}
              <div className="w-full lg:w-[450px] space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-black tracking-[0.2em] mb-2 block">Add Dynamic Field</Label>
                  <Select onValueChange={(val) => handleAddField(val)}>
                    <SelectTrigger className="h-14 bg-white font-bold border-zinc-200 rounded-2xl">
                      <SelectValue placeholder="Select field to position..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_VARIABLES.filter(v => !fields.some(f => f.key === v.key)).map(v => (
                        <SelectItem key={v.key} value={v.key} className="font-bold">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                  {fields.map((field) => (
                    <div key={field.id} className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-50 pb-3">
                        <div className="flex items-center gap-2">
                          <GripHorizontal className="w-4 h-4 text-zinc-300" />
                          <span className="text-[12px] font-black text-black">{field.label}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveField(field.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {field.type === 'text' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black tracking-widest text-black uppercase">Font (px)</Label>
                            <input
                              type="number"
                              value={field.fontSize}
                              onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, fontSize: Number(e.target.value) } : f))}
                              className="w-full h-11 border border-zinc-200 rounded-xl px-3 font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black tracking-widest text-black uppercase">Color</Label>
                            <div className="flex items-center gap-2 h-11 border border-zinc-200 rounded-xl px-2 bg-zinc-50/50">
                              <input type="color" value={field.color} onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, color: e.target.value } : f))} className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent" />
                              <span className="text-[11px] font-black font-mono">{field.color?.toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="space-y-1.5 col-span-2 flex items-center gap-6 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={field.fontWeight === 'bold'} onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, fontWeight: e.target.checked ? 'bold' : 'normal' } : f))} className="w-4 h-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
                              <span className="text-[11px] font-black">BOLD</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={field.fontStyle === 'italic'} onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, fontStyle: e.target.checked ? 'italic' : 'normal' } : f))} className="w-4 h-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
                              <span className="text-[11px] font-black italic">ITALIC</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="text-center p-10 border-2 border-dashed border-zinc-100 rounded-[32px] text-[10px] font-black tracking-[0.2em] text-zinc-300">
                      Add variable to begin mapping
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full h-16 bg-black hover:bg-zinc-800 text-white rounded-2xl font-black tracking-widest text-[12px] shadow-2xl border-none active:scale-95 transition-all mt-6">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />}
                  PUBLISH CUSTOM TEMPLATE
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
