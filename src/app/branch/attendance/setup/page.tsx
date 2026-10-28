"use client"
import dynamic from "next/dynamic"
const FaceSetup = dynamic(() => import("@/components/FaceSetup").then(mod => mod.FaceSetup), { ssr: false })
import { BranchSidebar } from "@/components/layout/branch-sidebar"
import { TopNav } from "@/components/layout/top-nav"

export default function BranchFaceSetupPage() {
  return (
    <main className="flex-1 p-8">
      <FaceSetup />
    </main>
  )
}
