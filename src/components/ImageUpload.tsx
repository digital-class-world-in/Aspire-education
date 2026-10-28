"use client"

import { useState, useRef } from "react"
import { Loader2, ImageIcon, Trash2 } from "lucide-react"
import { uploadFileToImageKit, deleteFileFromImageKit } from "@/lib/imagekit"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  disabled?: boolean;
  folder?: string;
}

export function ImageUpload({ value, onChange, label = "Upload Image", disabled, folder = "/website/uploads" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    if (disabled || isUploading) return;
    setShowDialog(true)
  }

  const proceedToUpload = () => {
    setShowDialog(false)
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 150)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeKB = file.size / 1024;
    if (sizeKB > 5 * 1024) {
      toast({
        variant: "destructive",
        title: "Invalid File Size",
        description: "Please upload an image under 5 MB"
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true)
    try {
      const res = await uploadFileToImageKit(file, folder)
      onChange(res.url)
      toast({ title: "Asset Uploaded", description: "The image has been successfully stored in ImageKit." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message || "An error occurred during upload." })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleRemove = async () => {
    if (!value) {
      onChange("")
      return
    }

    try {
      if (value.includes("imagekit.io")) {
        await deleteFileFromImageKit(value)
      }
      onChange("")
      toast({ title: "Asset Deleted", description: "The image has been removed." })
    } catch (err) {
      console.error("Deletion failed:", err)
      onChange("")
      toast({ variant: "destructive", title: "Sync Status", description: "Link cleared." })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 mt-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleUpload}
          disabled={isUploading || disabled}
        />

        {value ? (
          <div className="relative group w-32 h-32 rounded-xl overflow-hidden border-2 border-zinc-200 shadow-sm transition-all hover:border-rose-500">
            <img src={value} alt="Preview" className="w-full h-full object-cover bg-white" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={isUploading || disabled}
            onClick={handleUploadClick}
            className="w-32 h-32 border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
          >
            {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ImageIcon className="w-6 h-6 text-black" />}
            <span className="text-[14px] font-bold text-black text-center px-2 leading-tight">
              {isUploading ? "Uploading..." : label}
            </span>
          </Button>
        )}
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Image Size Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Please ensure your image is between <strong>100 KB and 1 MB</strong> before uploading. Files outside this range will be rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={proceedToUpload} className="rounded-xl bg-primary text-white hover:bg-primary/90">
              Select Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
