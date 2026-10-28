import { FaceRecords } from "@/components/FaceRecords"
import { BranchSidebar } from "@/components/layout/branch-sidebar"
import { TopNav } from "@/components/layout/top-nav"

export default function BranchFaceRecordsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <BranchSidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8">
          <FaceRecords />
        </main>
      </div>
    </div>
  )
}
