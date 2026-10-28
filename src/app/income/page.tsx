
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Plus, Search, Trash2, TrendingUp, DollarSign } from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, push, set, remove, off } from "firebase/database"

export default function IncomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const { database } = useFirebase()

  useEffect(() => {
    if (!database) return
    const dbRef = ref(database, 'income')
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setItems([])
      }
    })
    return () => off(dbRef)
  }, [database])

  const totalIncome = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items])

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      amount: formData.get("amount") as string,
      date: formData.get("date") as string,
      category: formData.get("category") as string,
      createdAt: Date.now()
    }
    if (database) {
      push(ref(database, 'income'), data)
      setIsModalOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#a0a0a00d] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font- public-sans text-black font-public-sans tracking-tight">Income</h2>
              <p className="text-[14px] text-black font-medium">Track all revenue streams for the institute</p>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[hsl(var(--primary))] text-white rounded-lg h-11 px-6 font- public-sans text-[14px] gap-2 border-none">
                  <Plus className="h-4 w-4" /> Add Income
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md p-0 border border-zinc-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-white px-8 py-6 border-b border-zinc-100">
                  <DialogTitle className="text-xl font- public-sans text-black">New Income Entry</DialogTitle>
                </div>
                <form onSubmit={handleAdd} className="p-8 space-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font- public-sans text-black tracking-wider">Title / Source</Label>
                    <Input name="title" required className="rounded-lg h-12 border-zinc-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font- public-sans text-black tracking-wider">Amount</Label>
                    <Input name="amount" type="number" required className="rounded-lg h-12 border-zinc-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font- public-sans text-black tracking-wider">Date</Label>
                    <Input name="date" type="date" required className="rounded-lg h-12 border-zinc-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font- public-sans text-black tracking-wider">Category</Label>
                    <Input name="category" placeholder="Fees, Donation, etc" className="rounded-lg h-12 border-zinc-200" />
                  </div>
                  <Button type="submit" className="bg-[hsl(var(--primary))] text-white rounded-lg h-12 w-full font- public-sans shadow-md border-none">Save Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm rounded-lg p-6 bg-white flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-black">Total Revenue</p>
                <h3 className="text-2xl font- public-sans text-black">${totalIncome.toLocaleString()}</h3>
              </div>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100">
                    <TableHead className="text-[11px] font- public-sans text-black tracking-widest h-14">Title</TableHead>
                    <TableHead className="text-[11px] font- public-sans text-black tracking-widest h-14">Category</TableHead>
                    <TableHead className="text-[11px] font- public-sans text-black tracking-widest h-14">Date</TableHead>
                    <TableHead className="text-[11px] font- public-sans text-black tracking-widest h-14">Amount</TableHead>
                    <TableHead className="text-[11px] font- public-sans text-black tracking-widest h-14 text-right pr-8">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} className="border-zinc-50">
                      <TableCell className="text-[14px] font-semibold text-black">{row.title}</TableCell>
                      <TableCell className="text-[14px] text-black">{row.category}</TableCell>
                      <TableCell className="text-[14px] text-black">{row.date}</TableCell>
                      <TableCell className="text-[14px] font- public-sans text-emerald-600">${Number(row.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `income/${row.id}`))} className="text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={5} className="h-32 text-center text-black">No income records found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
