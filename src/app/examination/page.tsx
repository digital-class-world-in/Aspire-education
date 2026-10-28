"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ExaminationEntryPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the primary sub-module: Online Exam
    router.replace("/examination/online-exam")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] font-bold text-black tracking-widest">Loading Module...</p>
      </div>
    </div>
  )
}
