
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
import { Plus, Search, Trash2, TrendingDown, ReceiptText } from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, push, set, remove, off } from "firebase/database"

export default function ExpensesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const { database } = useFirebase()

  useEffect(() => {
    if (!database) return
    const dbRef = ref(database, 'expenses')
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

  const totalExpenses = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items])

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
      push(ref(database, 'expenses'), data)
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
              <h2 className="text-3xl font-bold text-black font-public-sans tracking-tight">Expenses</h2>
              <p className="text-[14px] text-black font-medium">Manage and track institute expenditures</p>
            </div>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#FF5C5C] text-white rounded-lg h-11 px-6 font-bold text-[14px] gap-2 border-none">
                  <Plus className="h-4 w-4" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md p-0 border border-zinc-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-white px-8 py-6 border-b border-zinc-100">
                  <DialogTitle className="text-xl font-bold text-black">New Expense Entry</DialogTitle>
                </div>
                <form onSubmit={handleAdd} className="p-8 space-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-black tracking-wider">Expense Item</Label>
                    <Input name="title" required className="rounded-lg h-12 border-zinc-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-black tracking-wider">Amount</Label>
                    <Input name="amount" type="number" required className="rounded-lg h-12 border-zinc-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-black tracking-wider">Date</Label>
                    <Input name="date" type="date" required className="rounded-lg h-12 border-zinc-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-black tracking-wider">Category</Label>
                    <Input name="category" placeholder="Salary, Rent, Utility, etc" className="rounded-lg h-12 border-zinc-200" />
                  </div>
                  <Button type="submit" className="bg-[#FF5C5C] text-white rounded-lg h-12 w-full font-bold shadow-md border-none">Save Expense</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm rounded-lg p-6 bg-white flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-black">Total Expenditure</p>
                <h3 className="text-2xl font-bold text-black">${totalExpenses.toLocaleString()}</h3>
              </div>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100">
                    <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Item</TableHead>
                    <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Category</TableHead>
                    <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Date</TableHead>
                    <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Amount</TableHead>
                    <TableHead className="text-[11px] font-bold text-black tracking-widest h-14 text-right pr-8">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} className="border-zinc-50">
                      <TableCell className="text-[14px] font-semibold text-black">{row.title}</TableCell>
                      <TableCell className="text-[14px] text-black">{row.category}</TableCell>
                      <TableCell className="text-[14px] text-black">{row.date}</TableCell>
                      <TableCell className="text-[14px] font-bold text-rose-600">${Number(row.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `expenses/${row.id}`))} className="text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && <TableRow><TableCell colSpan={5} className="h-32 text-center text-black">No expense records found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
