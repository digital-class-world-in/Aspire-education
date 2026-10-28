"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Building2, ArrowRight } from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function SuperDynamicFieldsPage() {
  const { database } = useFirebase()
  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!database) return
    const instRef = ref(database, 'Institutes')
    const unsubscribe = onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ 
        ...data[k].profile, 
        id: k
      }))
      
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      setInstitutes(list)
      setIsLoading(false)
    })
    return () => off(instRef)
  }, [database])

  const filtered = institutes.filter(i => 
    !searchTerm || 
    i.instituteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) return <div className="p-20 text-center font-black animate-pulse text-black">Loading Institutes...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-32">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-black tracking-tight">Dynamic Fields</h2>
        <p className="text-[14px] text-black font-medium">Select an institute to configure its dynamic fields per module.</p>
      </div>

      <Card className="border border-zinc-200 shadow-sm rounded-2xl bg-white p-6">
        <div className="relative group">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
          <Input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search institutes..." 
            className="pl-12 h-12 rounded-xl border-zinc-200 bg-zinc-50 focus-visible:ring-primary font-bold" 
          />
        </div>
      </Card>

      <Card className="border border-zinc-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="text-[10px] font-black text-black  pl-8 w-20">No.</TableHead>
                <TableHead className="text-[10px] font-black text-black ">Institute Details</TableHead>
                <TableHead className="text-[10px] font-black text-black ">Plan & Status</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black text-black ">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inst, idx) => (
                <TableRow key={inst.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                  <TableCell className="pl-8 text-[14px] font-black text-black">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary shadow-inner">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[14px] font-black text-black">{inst.instituteName || "Unnamed"}</p>
                        <p className="text-[10px] font-bold text-black mt-1 ">ID: {inst.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-black text-primary">{inst.currentPlan || "None"}</span>
                      <Badge className={cn("w-max rounded px-2 py-0.5 text-[9px]  shadow-none border-none", inst.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>{inst.status || 'Offline'}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button asChild variant="ghost" className="h-9 rounded-xl text-primary bg-blue-50 hover:bg-blue-100 font-bold text-[10px] ">
                      <Link href={`/super/dynamic-fields/${inst.id}`}>
                        Configure Modules <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-black font-bold text-[14px] ">
                    No results found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  )
}
