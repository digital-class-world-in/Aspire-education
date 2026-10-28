
"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { X, Edit2, Trash2, FileSpreadsheet, FileText, Hand, MessageCircle, Check, X as CloseIcon } from "lucide-react"

export default function AdmissionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1">
        <TopNav />
        <main className="flex-1 p-4 md:px-8 md:pb-8 animate-in fade-in duration-500">
          <div className="max-w-[1500px] mx-auto space-y-6">

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-none shadow-sm rounded-2xl bg-white p-6 h-32 flex flex-col justify-between">
                <span className="text-[15px] font-semibold text-black font-public-sans">Active</span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-6 bg-[#4ADE80] rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                  <span className="text-2xl font-bold text-black">3</span>
                </div>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl bg-white p-6 h-32 flex flex-col justify-between">
                <span className="text-[15px] font-semibold text-black font-public-sans">Inactive</span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-6 bg-[#FBBF24] rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                  <span className="text-2xl font-bold text-black">0</span>
                </div>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl bg-white p-6 h-32 flex flex-col justify-between">
                <span className="text-[15px] font-semibold text-black font-public-sans">Total Admission</span>
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-1.5 rounded-lg">
                    <Check className="h-6 w-6 text-emerald-500 stroke-[3px]" />
                  </div>
                  <span className="text-2xl font-bold text-black">86</span>
                </div>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl bg-white p-6 h-32 flex flex-col justify-between">
                <span className="text-[15px] font-semibold text-black font-public-sans">Rejected</span>
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-1.5 rounded-lg">
                    <CloseIcon className="h-6 w-6 text-red-500 stroke-[3px]" />
                  </div>
                  <span className="text-2xl font-bold text-black">0</span>
                </div>
              </Card>
            </div>

            {/* Select Criteria Filter */}
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden p-8">
              <h2 className="text-lg font-semibold text-black font-public-sans mb-6">Select Criteria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-black tracking-widest">Enquiry Source</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-zinc-200 rounded-lg h-10 text-black">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Website</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-black tracking-widest">Enquiry For</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-zinc-200 rounded-lg h-10 text-black">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class1">Class 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-black tracking-widest">Enquiry From Date</Label>
                  <Input type="date" className="bg-white border-zinc-200 rounded-lg h-10 text-black" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-black tracking-widest">Enquiry To Date</Label>
                  <Input type="date" className="bg-white border-zinc-200 rounded-lg h-10 text-black" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-black tracking-widest">Enquiry Status</Label>
                  <Select>
                    <SelectTrigger className="bg-white border-zinc-200 rounded-lg h-10 text-black">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <Button className="bg-[#FF5C5C] hover:bg-[#FF5C5C]/90 text-white rounded-lg h-10 px-8 font-bold">
                  Reset
                </Button>
                <Button className="bg-black hover:bg-zinc-800 text-white rounded-lg h-10 px-8 font-bold">
                  Search
                </Button>
              </div>
            </Card>

            {/* Table Section */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-bold text-black font-public-sans">Admission Enquiries (106)</h3>
                  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg h-7 px-3 text-[11px] font-bold">
                        Add New+
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-0 border-none rounded-3xl overflow-hidden bg-white sm:max-w-[900px]">
                      <div className="bg-white px-8 py-6 flex items-center justify-between border-b border-zinc-50">
                        <DialogTitle className="text-xl font-semibold text-[#6366F1] font-public-sans">Add New Enquiry</DialogTitle>
                        <DialogDescription className="sr-only">Provide the details of the student inquiry below.</DialogDescription>
                        
                      </div>
                      <div className="p-8 max-h-[85vh] overflow-y-auto scrollbar-none">
                        <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-black tracking-wider">Name</Label>
                            <Input placeholder="Name" className="bg-white border-zinc-200 rounded-xl h-12" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-black tracking-wider">Email</Label>
                            <Input type="email" placeholder="Email" className="bg-white border-zinc-200 rounded-xl h-12" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-black tracking-wider">Phone</Label>
                            <Input type="tel" placeholder="Phone" className="bg-white border-zinc-200 rounded-xl h-12" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-black tracking-wider">Enquire For Course Or Class</Label>
                            <Select>
                              <SelectTrigger className="bg-white border-zinc-200 rounded-xl h-12">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="class1">Class 1</SelectItem>
                                <SelectItem value="class2">Class 2</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-black tracking-wider">Enquiry Date</Label>
                            <Input type="date" className="bg-white border-zinc-200 rounded-xl h-12" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-black tracking-wider">Follow Up Date</Label>
                            <Input type="date" className="bg-white border-zinc-200 rounded-xl h-12" />
                          </div>
                          <div className="md:col-span-2 pt-4">
                            <Button type="submit" className="bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-xl h-12 px-10 font-bold w-full md:w-auto">
                              Submit Now
                            </Button>
                          </div>
                        </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Input
                      placeholder="Search Data...."
                      className="h-10 w-full md:w-80 bg-white border-zinc-200 rounded-lg text-[14px] pl-4"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                      <FileSpreadsheet className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-orange-50">
                      <FileText className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <Card className="border border-zinc-100 shadow-sm rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-white border-b border-zinc-100">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">SR NO.</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">ACTION</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">STATUS</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">MOVE</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">SHARE ON</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">SOURCE</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">ENQUIRY DATE</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">FOLLOW UP DATE</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">STUDENT NAME</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">MOBILE</TableHead>
                        <TableHead className="text-[10px] font-bold text-black tracking-widest h-12">FROM STAFF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { sr: "106", source: "Facebook", date: "03-02-2026", follow: "2026-02-12", name: "Sakshi kalal", phone: "6354000011" },
                        { sr: "105", source: "FACEBOOK", date: "20.01.2026", follow: "2026-02-03", name: "ANKITA SANJAY", phone: "7709799996" }
                      ].map((row, i) => (
                        <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="font-medium text-black">{row.sr}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button className="text-black hover:text-black"><Edit2 className="h-3.5 w-3.5" /></button>
                              <button className="text-black hover:text-black"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="px-3 py-1 bg-[#4ADE80] text-white text-[10px] font-bold rounded-md">Done</span>
                          </TableCell>
                          <TableCell>
                            <Hand className="h-4 w-4 text-black cursor-pointer" />
                          </TableCell>
                          <TableCell>
                            <MessageCircle className="h-4 w-4 text-emerald-500 fill-emerald-500/10 cursor-pointer" />
                          </TableCell>
                          <TableCell className="text-black text-[14px]">{row.source}</TableCell>
                          <TableCell className="text-black text-[14px]">{row.date}</TableCell>
                          <TableCell className="text-black text-[14px]">{row.follow}</TableCell>
                          <TableCell className="text-black text-[14px] font-medium">{row.name}</TableCell>
                          <TableCell className="text-black text-[14px]">{row.phone}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
