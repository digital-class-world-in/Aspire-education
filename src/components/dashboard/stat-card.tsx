import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  className?: string
}

export function StatCard({ title, value, icon, className }: StatCardProps) {
  return (
    <Card className={cn("border border-zinc-50 shadow-sm rounded-2xl bg-white", className)}>
      <CardContent className="p-6 flex items-center gap-5">
        <div className="text-4xl flex items-center justify-center">
          {icon}
        </div>
        <div className="space-y-0.5">
          <p className="text-[13px] font-medium text-black font-public-sans">{title}</p>
          <h3 className="text-2xl font-bold text-black font-public-sans">{value}</h3>
        </div>
      </CardContent>
    </Card>
  )
}
