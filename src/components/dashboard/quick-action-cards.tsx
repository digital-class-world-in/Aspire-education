import { Card, CardContent } from "@/components/ui/card"
import { MoreVertical } from "lucide-react"
import Image from "next/image"

export function QuickActionCards() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-none shadow-sm rounded-2xl p-6 bg-white flex flex-col gap-4">
          <span className="text-[13px] font-semibold text-black font-public-sans">My Website</span>
          <div className="w-12 h-12 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#6366F1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl p-6 bg-white flex flex-col gap-4">
          <span className="text-[13px] font-semibold text-black font-public-sans">My Articles</span>
          <div className="w-12 h-12 flex items-center justify-center">
             <svg className="w-10 h-10 text-[#C084FC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
        </Card>
      </div>
      
      <Card className="border-none shadow-sm rounded-2xl p-6 bg-white">
        <div className="flex justify-between items-start mb-4">
          <span className="text-[13px] font-semibold text-black font-public-sans leading-tight max-w-[60px]">Manage Website</span>
          <MoreVertical className="h-4 w-4 text-zinc-300 cursor-pointer" />
        </div>
        <div className="w-12 h-12 flex items-center justify-center">
           <svg className="w-10 h-10 text-[#818CF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
      </Card>
    </div>
  )
}
