"use client"

import { useEffect, useState } from "react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { toast } from "@/hooks/use-toast"

export function SuperSupportListener() {
  const { database } = useFirebase()
  const [lastProcessedAt, setLastProcessedAt] = useState<number>(Date.now())

  useEffect(() => {
    if (!database) return

    const instRef = ref(database, 'Institutes')

    const unsub = onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      
      Object.keys(data).forEach(id => {
        const chat = data[id].support_chat
        if (chat && chat.details?.handoff_requested && !chat.details?.assigned_executive && chat.details?.status === 'active') {
          const handoffAt = chat.details.handoff_at || 0
          
          if (handoffAt > lastProcessedAt) {
            playNoticeSound()
            toast({
              title: "Support Request! 🆘",
              description: `Institute ${id} needs assistance.`,
              variant: "default",
              duration: 10000
            })
            setLastProcessedAt(handoffAt)
          }
        }
      })
    })

    return () => off(instRef)
  }, [database, lastProcessedAt])

  const playNoticeSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3')
    audio.play().catch(e => {})
  }

  return null
}
