"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Database, Download, History, Search, FileJson, Clock } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, get, update, onValue, off, push } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"

export default function BackupPage() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupLogs, setBackupLogs] = useState<any[]>([])
  const [instituteName, setInstituteName] = useState<string>("Your Institute")
  const { database } = useFirebase()
  const { user } = useUser()

  useEffect(() => {
    if (!database || !user) return
    
    const rootPath = `Institutes/${user.uid}`
    
    // Listen for profile changes
    onValue(ref(database, `${rootPath}/profile`), (snapshot) => {
      const data = snapshot.val()
      if (data?.instituteName) setInstituteName(data.instituteName)
    })

    // Listen for backup history
    onValue(ref(database, `${rootPath}/backup-logs`), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setBackupLogs(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      } else {
        setBackupLogs([])
      }
    })

    return () => {
      off(ref(database, `${rootPath}/profile`))
      off(ref(database, `${rootPath}/backup-logs`))
    }
  }, [database, user])

  const handleExport = async () => {
    if (!database || !user) return
    setIsBackingUp(true)
    try {
      const snapshot = await get(ref(database, `Institutes/${user.uid}`))
      const data = snapshot.val()
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${instituteName.replace(/\s+/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      const now = format(new Date(), "PPPpp")
      await update(ref(database, `Institutes/${user.uid}/profile`), { lastBackup: now })
      await push(ref(database, `Institutes/${user.uid}/backup-logs`), {
        timestamp: Date.now(),
        date: now,
        status: "Successful",
        type: "JSON Full Export",
        performedBy: user.email
      })

      toast({ title: "Backup Successful", description: "Institute data exported correctly." })
    } catch (e) {
      toast({ variant: "destructive", title: "Backup Failed" })
    } finally {
      setIsBackingUp(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f9] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-black font-public-sans tracking-tight">Database Backup</h2>
              <p className="text-[14px] text-black font-medium">Manage and monitor institutional data exports</p>
            </div>
            <Button 
              onClick={handleExport} 
              disabled={isBackingUp}
              className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all"
            >
              {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export JSON Backup
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <Card className="border-none shadow-sm rounded-[32px] bg-white p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-black shadow-inner">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-black tracking-tight">Export History</h3>
                    <p className="text-[10px] font-bold text-black tracking-widest">Audit trail of all backups</p>
                  </div>
                </div>
                <div className="relative w-64 group">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                  <Input placeholder="Filter logs..." className="pl-10 h-10 bg-zinc-50 border-none rounded-xl text-[14px] font-bold" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black text-black tracking-widest h-14 pl-8">Timestamp</TableHead>
                      <TableHead className="text-[10px] font-black text-black tracking-widest h-14">Type</TableHead>
                      <TableHead className="text-[10px] font-black text-black tracking-widest h-14">Performed By</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black text-black tracking-widest h-14">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupLogs.map((log) => (
                      <TableRow key={log.id} className="border-zinc-50 transition-none hover:bg-zinc-50/30 group">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-zinc-200 group-hover:text-primary transition-colors" />
                            <span className="text-[14px] font-bold text-black">{log.date}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileJson className="w-4 h-4 text-amber-500" />
                            <span className="text-[14px] font-bold text-black">{log.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[14px] font-medium text-black lowercase">{log.performedBy}</TableCell>
                        <TableCell className="text-right pr-8">
                          <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black tracking-widest">{log.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {backupLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center text-zinc-300 italic">No backup history available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
