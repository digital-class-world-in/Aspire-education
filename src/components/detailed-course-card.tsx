"use client"

import { Card, CardContent } from "@/components/ui/card"

export function DetailedCourseCard({ course }: { course: any }) {
  const discount = course.originalPrice && course.sellingPrice
    ? Math.round(((course.originalPrice - course.sellingPrice) / course.originalPrice) * 100)
    : 0
  return (
    <Card className="border-2 border-zinc-200 rounded-2xl overflow-hidden group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300 flex flex-col h-full bg-white">
      <div className="h-56 relative overflow-hidden">
        <img src={course.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={course.name} />
        {course.type && <div className="absolute top-4 left-4 bg-primary/90 text-white text-[14px] font-bold px-3 py-1 rounded-full">{course.type}</div>}
      </div>
      <CardContent className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{course.name}</h3>
        <p className="text-black text-[14px] mb-4 flex-1 line-clamp-3">{course.description}</p>
        <div className="flex items-center gap-3 mt-auto">
          <span className="text-2xl font-black text-primary">₹{Number(course.sellingPrice || course.price || 0).toLocaleString()}</span>
          {discount > 0 && (
            <span className="bg-[#FF7A1A] text-white text-[10px] font-black px-2 py-1 rounded-lg">
              {discount}% OFF
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
