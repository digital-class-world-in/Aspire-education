import { FaceRecords } from "@/components/FaceRecords"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"

export default function AdminFaceRecordsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8">
          <FaceRecords />
        </main>
      </div>
    </div>
  )
}
