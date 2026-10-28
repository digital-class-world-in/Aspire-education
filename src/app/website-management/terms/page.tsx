"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Save, Loader2, Eye } from "lucide-react"
import Link from "next/link"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, set } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import dynamic from 'next/dynamic'

// Use our wrapper component to avoid SSR/Turbopack issues with Quill's CSS
const QuillEditor = dynamic(() => import('@/components/quill-editor'), { ssr: false })

export default function TermsManagementPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [content, setContent] = useState("")
  const [privacyContent, setPrivacyContent] = useState("")
  const id = user?.uid || process.env.NEXT_PUBLIC_DB_ID || "FYQRMChCqPb64iM5hFvVlr2omyu2"

  useEffect(() => {
    if (!database) return

    const rootPath = `Institutes/${id}/website_settings/terms`

    onValue(ref(database, rootPath), (snapshot) => {
      const data = snapshot.val()
      if (data && data.content) {
        setContent(data.content)
      }
    })

    const privacyPath = `Institutes/${id}/website_settings/privacy`
    onValue(ref(database, privacyPath), (snapshot) => {
      const data = snapshot.val()
      if (data && data.content) {
        setPrivacyContent(data.content)
      }
      setIsLoading(false)
    })
  }, [database, id])

  const handleSave = async () => {
    if (!database) return
    setIsSaving(true)
    try {
      await Promise.all([
        set(ref(database, `Institutes/${id}/website_settings/terms`), { content }),
        set(ref(database, `Institutes/${id}/website_settings/privacy`), { content: privacyContent })
      ])
      toast({ title: "Policy content published", description: "All changes saved successfully." })
    } catch (e) {
      toast({ variant: "destructive", title: "Sync failed" })
    } finally {
      setIsSaving(false)
    }
  }

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing node connection...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-32 text-[15px] font-bold text-black">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Terms & Privacy</h2>
              <p className="text-[14px] text-black font-medium mt-1">Manage public terms and privacy policy pages</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                asChild
                className="h-11 px-6 rounded-xl font-bold text-[14px] gap-2 border-zinc-200 bg-white hover:bg-zinc-50 shadow-sm text-black"
              >
                <Link href="/" target="_blank">
                  <Eye className="h-4 w-4" />
                  Preview Website
                </Link>
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="h-4 w-4" />} {isSaving ? "Publishing..." : "Publish content"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10">
            <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10">
              <h4 className="text-lg font-normal text-black flex items-center gap-2 border-b border-zinc-50 pb-4 mb-6">
                <FileText className="w-5 h-5 text-primary" /> Terms & Conditions Editor
              </h4>
              <div className="bg-white rounded-xl min-h-[400px]">
                <QuillEditor 
                  theme="snow" 
                  value={content} 
                  onChange={setContent} 
                  modules={modules}
                  className="h-[300px] mb-12"
                />
              </div>
            </Card>

            <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white overflow-hidden p-10">
              <h4 className="text-lg font-normal text-black flex items-center gap-2 border-b border-zinc-50 pb-4 mb-6">
                <FileText className="w-5 h-5 text-primary" /> Privacy Policy Editor
              </h4>
              <div className="bg-white rounded-xl min-h-[400px]">
                <QuillEditor 
                  theme="snow" 
                  value={privacyContent} 
                  onChange={setPrivacyContent} 
                  modules={modules}
                  className="h-[300px] mb-12"
                />
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
