import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Globe, BookOpen, Settings, Share2, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const links = [
  { name: "Website Editor", icon: Globe, description: "Modify your site content" },
  { name: "Publish Article", icon: BookOpen, description: "Post new news or blogs" },
  { name: "SEO Optimization", icon: Settings, description: "Improve search rankings" },
  { name: "Social Media", icon: Share2, description: "Manage social integrations" },
]

export function QuickLinks() {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Website Management</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.map((link) => (
          <Button
            key={link.name}
            variant="outline"
            className="h-auto p-4 flex flex-col items-start justify-start gap-2 border-primary/20 group text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-accent group-hover:text-white transition-colors">
                <link.icon className="h-5 w-5 text-accent group-hover:text-white" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-black group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <div>
              <p className="font-bold text-[14px]">{link.name}</p>
              <p className="text-[14px] text-black font-normal">{link.description}</p>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
