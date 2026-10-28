"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { useUser, useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"

const quotes = [
  "Morning is when I am awake and there is a dawn in me.",
  "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Change is the end result of all true learning.",
  "The roots of education are bitter, but the fruit is sweet.",
  "An investment in knowledge pays the best interest.",
  "The more that you read, the more things you will know. The more that you learn, the more places you'll go."
]

export function WelcomeBanner() {
  const [dailyQuote, setDailyQuote] = useState("")
  const { database } = useFirebase()
  const { resolvedId, isBranch, branchId } = useResolvedId()
  const [instituteName, setInstituteName] = useState<string>("Your Institute")

  useEffect(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000)
    const oneDay = 1000 * 60 * 60 * 24
    const dayOfYear = Math.floor(diff / oneDay)
    setDailyQuote(quotes[dayOfYear % quotes.length])
  }, [])

  useEffect(() => {
    if (!database || !resolvedId) return

    if (isBranch && branchId) {
      const branchRef = ref(database, `Institutes/${resolvedId}/branches/${branchId}`)
      const unsubscribe = onValue(branchRef, (snapshot) => {
        const data = snapshot.val()
        if (data?.branchName) {
          setInstituteName(data.branchName)
        }
      })
      return () => off(branchRef)
    } else {
      const profileRef = ref(database, `Institutes/${resolvedId}/profile`)
      const unsubscribe = onValue(profileRef, (snapshot) => {
        const data = snapshot.val()
        if (data?.instituteName) {
          setInstituteName(data.instituteName)
        }
      })
      return () => off(profileRef)
    }
  }, [database, resolvedId, isBranch, branchId])

  return (
    <Card className="border-none shadow-sm overflow-hidden rounded-[32px] bg-white">
      <div className="h-1.5 w-full bg-primary transition-colors" />
      <CardContent className="p-0 flex flex-col md:flex-row items-center relative h-fit">
        <div className="p-6 md:p-8 flex-1 space-y-2">
          <h2 className="text-[14px] md:text-lg font-normal text-primary flex items-center gap-2 font-public-sans tracking-tight">
            💐 Welcome, {instituteName}
          </h2>
          <p className="text-black max-w-xl leading-relaxed text-[12px] font-medium">
            "{dailyQuote}"
          </p>
        </div>
        <div className="relative w-full md:w-[300px] h-32 md:h-40 flex items-center justify-end pr-8">
          <div className="relative w-full h-full opacity-80">
            <Image 
              src="https://ik.imagekit.io/2wtn9m5bl/a-man-teacher-working-on-laptop-illustration.png" 
              alt="Welcome Illustration" 
              width={300}
              height={160}
              className="object-contain"
              data-ai-hint="teacher laptop"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
