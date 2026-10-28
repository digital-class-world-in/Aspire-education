import { AlertCircle } from "lucide-react"

interface MissingContentPlaceholderProps {
  pageName: string
}

export function MissingContentPlaceholder({ pageName }: MissingContentPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-6 text-center bg-zinc-50 border border-zinc-100 rounded-3xl shadow-sm mx-auto max-w-2xl my-12">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
        <AlertCircle className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-black text-black mb-4 tracking-tight">No Content Available for {pageName}</h2>
      <p className="text-black font-medium">
        It looks like the {pageName} content has not been updated yet. Please check back later.
      </p>
    </div>
  )
}
