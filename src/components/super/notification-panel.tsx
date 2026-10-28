"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, MessageSquare, Ticket, Clock, X, CheckCircle2 } from "lucide-react"
import { ref, onValue, off } from "firebase/database"
import { useFirebase } from "@/firebase"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { database } = useFirebase()
  const [notifications, setNotifications] = useState<any[]>([])
  const lastIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!database) return
    const instRef = ref(database, 'Institutes')
    
    const unsub = onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      const alerts: any[] = []
      
      Object.keys(data).forEach(id => {
        const chat = data[id].support_chat
        const profile = data[id].profile
        
        if (chat?.details?.handoff_requested && !chat.details?.assigned_executive && chat.details?.status === 'active') {
          alerts.push({
            id: `handoff_${id}`,
            instId: id,
            type: 'handoff',
            title: 'Handoff Requested',
            message: `${profile?.instituteName || id} needs an executive.`,
            time: chat.details.handoff_at || Date.now(),
            href: '/super/support-chat'
          })
        }

        // Also check for new tickets
        if (data[id].support_tickets) {
           Object.keys(data[id].support_tickets).forEach(tId => {
             const ticket = data[id].support_tickets[tId]
             if (Date.now() - ticket.raised_at < 3600000) { // Last 1 hour
               alerts.push({
                 id: tId,
                 instId: id,
                 type: 'ticket',
                 title: 'New Ticket Raised',
                 message: `${profile?.instituteName || id}: ${ticket.module} - ${ticket.ticket_id}`,
                 time: ticket.raised_at,
                 href: `/super/institutes/${id}?tab=support`
               })
             }
           })
        }
      })

      alerts.sort((a, b) => b.time - a.time)
      
      const newIds = alerts.map(a => a.id)
      const hasFreshAlert = newIds.some(id => !lastIdsRef.current.has(id))
      
      if (hasFreshAlert && lastIdsRef.current.size > 0) {
        playNotificationSound()
      }
      
      lastIdsRef.current = new Set(newIds)
      setNotifications(alerts)
    })

    return () => off(instRef)
  }, [database])

  const playNotificationSound = () => {
    try {
      const audio = new Audio("https://assets.mixkit.io/active_storage/sfx/2869/2869-preview.mp3")
      audio.play()
    } catch (e) {
      console.error("Audio play failed", e)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[101]"
          >
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Notifications</h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No new alerts</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <Link 
                      key={n.id} 
                      href={n.href}
                      onClick={onClose}
                      className="p-4 flex gap-3 hover:bg-indigo-50/30 transition-all group"
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        n.type === 'handoff' ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-500"
                      )}>
                        {n.type === 'handoff' ? <MessageSquare className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 leading-tight mb-0.5">{n.title}</p>
                        <p className="text-[10px] font-medium text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                           <Clock className="w-2.5 h-2.5 text-slate-300" />
                           <span className="text-[9px] font-bold text-slate-300 uppercase">{formatDistanceToNow(n.time, { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Mark all as seen</button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
