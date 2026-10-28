"use client"
import { useState, useEffect } from "react"
import { useFirebase } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function BrandingPopup() {
  const { database } = useFirebase()
  const [popup, setPopup] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const instituteUid = "YOUR_INSTITUTE_UID_HERE"   // ← same dynamic logic as /about
    const path = `Institutes/${instituteUid}/website_settings/brandingPopup`

    onValue(ref(database, path), (snap) => {
      const data = snap.val()
      if (data?.enabled) setPopup(data)
    })
  }, [database])

  useEffect(() => {
    if (!popup) return
    if (localStorage.getItem("brandingPopupDismissed") !== "true") {
      setShow(true)
    }
  }, [popup])

  const close = () => {
    setShow(false)
    localStorage.setItem("brandingPopupDismissed", "true")
  }

  if (!show || !popup) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6">
      <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        {popup.imageUrl && <img src={popup.imageUrl} className="w-full h-64 object-cover" />}
        
        <button onClick={close} className="absolute top-6 right-6 text-black hover:text-black transition-colors">
          <X className="w-7 h-7" />
        </button>

        <div className="p-10">
          <h3 className="text-4xl font-bold tracking-tight mb-5">{popup.title}</h3>
          <p className="text-black text-lg leading-relaxed mb-8">{popup.description}</p>
          
          <Button asChild size="lg" className="w-full h-14 text-lg font-bold">
            <a href={popup.buttonLink}>{popup.buttonText}</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
