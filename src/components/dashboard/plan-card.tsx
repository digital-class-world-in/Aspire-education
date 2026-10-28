import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ShieldCheck } from "lucide-react"

export function PlanCard() {
  return (
    <Card className="border-none shadow-sm bg-accent text-accent-foreground">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Current Plan</CardTitle>
        <ShieldCheck className="h-5 w-5 opacity-80" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-2xl font-bold">Premium Annual</h4>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none">Active</Badge>
          </div>
          <p className="text-[14px] opacity-80 mt-1">Full access to all institute features</p>
        </div>
        
        <div className="flex items-center gap-2 text-[14px] bg-white/10 p-3 rounded-lg">
          <Calendar className="h-4 w-4" />
          <span>Expiry Date: <span className="font-bold">Oct 24, 2025</span></span>
        </div>

        <Button variant="secondary" className="w-full bg-white text-accent hover:bg-white/90 font-bold">
          Upgrade Plan
        </Button>
      </CardContent>
    </Card>
  )
}
