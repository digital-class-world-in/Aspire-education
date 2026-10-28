"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function CourseCard({ course }: { course: any }) {
  const discount = (Number(course.originalPrice) && Number(course.sellingPrice) && Number(course.originalPrice) > Number(course.sellingPrice)) 
    ? Math.round(((Number(course.originalPrice) - Number(course.sellingPrice)) / Number(course.originalPrice)) * 100) 
    : 0

  return (
    <Link href={`/course/${encodeURIComponent((course.name || course.id).toLowerCase().replace(/\s+/g, '-'))}`} className="block h-full group">
      <Card className="border-2 border-zinc-200 rounded-2xl overflow-hidden group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300 flex flex-col h-full bg-white">
        <div className="h-56 relative overflow-hidden">
          <img src={course.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={course.name} />
          {course.type && (
            <div className={cn(
              "absolute top-4 left-4 text-white text-[10px] font-black  px-3 py-1 rounded-lg tracking-widest",
              course.type === 'Online' ? "bg-blue-600" : "bg-rose-600"
            )}>
              {course.type}
            </div>
          )}
        </div>
        <CardContent className="p-6 flex-1 flex flex-col">
          <h3 className="text-xl font-black mb-3 text-black group-hover:text-primary transition-colors line-clamp-2 tracking-tight leading-none">{course.name}</h3>
          <p className="text-black text-[14px] mb-6 flex-1 line-clamp-3 font-medium leading-relaxed">{course.description}</p>
          <div className="flex items-center gap-3 mt-auto">
            <span className="text-2xl font-black text-black tracking-tighter">₹ {Number(course.sellingPrice || course.price).toLocaleString()}</span>
            {discount > 0 && <span className="bg-[#FF7A1A] text-white text-[9px] font-black px-2 py-1 rounded-lg tracking-widest">{discount}% OFF</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
