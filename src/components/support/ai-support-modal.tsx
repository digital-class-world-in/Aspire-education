"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, set, push, remove, get, update } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import {
    Bot,
    Send,
    X,
    Ticket,
    ChevronRight,
    Sparkles,
    Lock,
    Paperclip,
    Image as ImageIcon,
    Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

export function AiSupportModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { database, storage, user: fbUser } = useFirebase()
    const { resolvedId } = useResolvedId()

    const [messages, setMessages] = useState<any[]>([])
    const [chatStatus, setChatStatus] = useState<'active' | 'closed'>('active')
    const [assignedExecutive, setAssignedExecutive] = useState<any>(null)
    const isInitializing = useRef(false)
    const lastExecRef = useRef<any>(null)

    const [inputValue, setInputValue] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [queuePosition, setQueuePosition] = useState<number | null>(null)
    const [showQueueOverlay, setShowQueueOverlay] = useState(false)
    const [handoffRequested, setHandoffRequested] = useState(false)
    const [onlineExecutives, setOnlineExecutives] = useState<any[]>([])

    const [ticketDetails, setTicketDetails] = useState({
        module: "",
        issueType: "",
        description: "",
        instituteName: ""
    })

    const modules = [
        "Fees Collection", "Admission", "Attendance", "Website Manager", "Staff Management", "Others"
    ]

    const issueTypes: Record<string, string[]> = {
        "Fees Collection": ["Payment not updated", "Wrong fee amount", "Receipt not generated", "Other"],
        "Attendance": ["Attendance not marked", "Wrong attendance", "Report issue", "Other"],
        "Admission": ["Form error", "Payment failed", "Other"],
        "Website Manager": ["Page not loading", "Image upload failed", "Other"],
        "Others": ["Login issue", "Slow performance", "Bug found"]
    }

    // 1. Initialize & Listen
    useEffect(() => {
        if (!database || !resolvedId) return

        // Fetch Institute Name
        get(ref(database, `Institutes/${resolvedId}/profile/instituteName`)).then(snap => {
            if (snap.exists()) {
                setTicketDetails(prev => ({ ...prev, instituteName: snap.val() }))
            }
        })

        // Listen for Online Executives
        const onlineRef = ref(database, 'Support/OnlineStatus')
        const unsubOnline = onValue(onlineRef, (snap) => {
            const val = snap.val() || {}
            setOnlineExecutives(Object.values(val))
        })

        if (!isOpen) return

        const chatBaseRef = ref(database, `Institutes/${resolvedId}/support_chat`)

        const unsub = onValue(chatBaseRef, (snapshot) => {
            const data = snapshot.val() || {}

            // Auto-Reset Check
            const createdAt = data.details?.created_at
            const today = format(new Date(), "yyyy-MM-dd")
            const chatDate = createdAt ? format(new Date(createdAt), "yyyy-MM-dd") : null

            if (chatDate && chatDate !== today) {
                remove(chatBaseRef)
                return
            }

            setChatStatus(data.details?.status || 'active')
            setAssignedExecutive(data.details?.assigned_executive)

            if (data.details?.assigned_executive && !lastExecRef.current) {
                try {
                    new Audio("https://assets.mixkit.io/active_storage/sfx/2869/2869-preview.mp3").play()
                } catch (e) { }
            }
            lastExecRef.current = data.details?.assigned_executive

            setHandoffRequested(data.details?.handoff_requested || false)

            // Handle Queue Logic
            if (data.details?.handoff_requested && !data.details?.assigned_executive) {
                setQueuePosition(prev => prev === null ? 10 : prev)
            } else {
                setQueuePosition(null)
            }

            const msgs = data.messages ? Object.keys(data.messages).map(k => ({ id: k, ...data.messages[k] })) : []
            setMessages(msgs)

            // If absolutely no messages, start AI flow
            if (msgs.length === 0 && !isInitializing.current) {
                startAiFlow()
            }
        })

        return () => {
            off(chatBaseRef)
            off(onlineRef)
        }
    }, [database, resolvedId, isOpen])

    // Queue Countdown Effect
    useEffect(() => {
        if (queuePosition !== null && queuePosition > 0 && !assignedExecutive) {
            const timer = setInterval(() => {
                setQueuePosition(prev => (prev && prev > 1) ? prev - 1 : prev)
            }, 60000) // 1 minute interval
            return () => clearInterval(timer)
        }
    }, [queuePosition, assignedExecutive])

    // Delay Overlay appearance
    useEffect(() => {
        if (queuePosition !== null && !assignedExecutive) {
            const timer = setTimeout(() => {
                setShowQueueOverlay(true)
            }, 3000)
            return () => clearTimeout(timer)
        } else {
            setShowQueueOverlay(false)
        }
    }, [queuePosition, assignedExecutive])

    // Inactivity Timeout Effect
    useEffect(() => {
        if (!database || !resolvedId || chatStatus === 'closed' || !isOpen) return

        const INACTIVITY_LIMIT = 5 * 60 * 1000 // 5 minutes

        const checkInactivity = setInterval(async () => {
            const detailsRef = ref(database, `Institutes/${resolvedId}/support_chat/details`)
            const snap = await get(detailsRef)
            if (snap.exists()) {
                const data = snap.val()
                const lastUpdated = data.last_updated || Date.now()
                const currentStatus = data.status || 'active'

                if (currentStatus === 'closed') return

                const diff = Date.now() - lastUpdated

                if (diff > INACTIVITY_LIMIT) {
                    // Send final message before closing
                    await addMessage('ai', '⚠️ No activity spotted. Conversation ended.', 'Digital Class Support', 'AI Assistant')
                    await update(detailsRef, {
                        status: 'closed',
                        last_updated: Date.now()
                    })
                    setChatStatus('closed')
                }
            }
        }, 10000) // Check every 10 seconds

        return () => clearInterval(checkInactivity)
    }, [database, resolvedId, chatStatus, isOpen])

    // 2. Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    const startAiFlow = async () => {
        if (!database || !resolvedId || isInitializing.current) return
        isInitializing.current = true

        // Check database again to be absolutely sure
        const msgsSnap = await get(ref(database, `Institutes/${resolvedId}/support_chat/messages`))
        if (msgsSnap.exists()) {
            isInitializing.current = false
            return
        }

        // Initializing details first
        const detailsRef = ref(database, `Institutes/${resolvedId}/support_chat/details`)
        await set(detailsRef, {
            status: 'active',
            created_at: Date.now(),
            institute_id: resolvedId,
            last_updated: Date.now()
        })

        await addMessage('ai', 'Hi 👋 Welcome to Digital Class Support. I am your AI assistant. How can I help you today?', 'Digital Class Support', 'AI Assistant')

        setTimeout(async () => {
            await addMessage('ai', 'Which module are you facing issues in?', 'Digital Class Support', 'AI Assistant', {
                type: 'options',
                options: modules
            })
            setCurrentStep('MODULE_SELECT')
            isInitializing.current = false
        }, 1500)
    }

    const addMessage = async (senderType: 'user' | 'ai' | 'executive', message: string, senderName: string, position?: string, extra: any = {}) => {
        if (!database || !resolvedId) return
        const msgsRef = ref(database, `Institutes/${resolvedId}/support_chat/messages`)
        await push(msgsRef, {
            sender_type: senderType,
            sender_name: senderName,
            sender_position: position || "",
            message,
            timestamp: Date.now(),
            ...extra
        })

        // Update last update
        await set(ref(database, `Institutes/${resolvedId}/support_chat/details/last_updated`), Date.now())
        await set(ref(database, `Institutes/${resolvedId}/support_chat/details/last_message`), message)
    }

    const handleOptionSelect = async (option: string) => {
        if (!resolvedId || chatStatus === 'closed') return

        await addMessage('user', option, fbUser?.displayName || "Institute User")

        setIsTyping(true)
        setTimeout(async () => {
            setIsTyping(false)

            if (currentStep === 'MODULE_SELECT') {
                setTicketDetails(prev => ({ ...prev, module: option }))
                const issues = issueTypes[option] || ["Other"]
                await addMessage('ai', `Got it. Please select the specific issue in **${option}**:`, 'Digital Class Support', 'AI Assistant', {
                    type: 'options',
                    options: issues
                })
                setCurrentStep('ISSUE_SELECT')
            }
            else if (currentStep === 'ISSUE_SELECT') {
                setTicketDetails(prev => ({ ...prev, issueType: option }))
                await addMessage('ai', `Can you explain your problem better? It will benefit ${ticketDetails.instituteName || 'the institute'} to find the perfect solution for you quickly. You can also upload a screenshot using the paperclip icon below.`, 'Digital Class Support', 'AI Assistant', { type: 'input_request' })
                setCurrentStep('DESC_INPUT')
            }
            else if (currentStep === 'TICKET_CONFIRM') {
                if (option.includes('Talk to Executive')) {
                    await startQueueFlow()
                } else if (option.includes('Generate Ticket')) {
                    await generateFormalTicket()
                } else {
                    await addMessage('ai', 'Sure! Please describe anything else you would like to add.', 'Digital Class Support', 'AI Assistant')
                    setCurrentStep('DESC_INPUT')
                }
            }
            else if (currentStep === 'EXECUTIVE_HANDOFF_PROMPT') {
                if (option.includes('Talk to Executive')) {
                    await startQueueFlow()
                } else {
                    await addMessage('ai', 'Thank you for choosing Digital Class Support. Have a great day!', 'Digital Class Support', 'AI Assistant')
                    await set(ref(database, `Institutes/${resolvedId}/support_chat/details/status`), 'closed')
                }
            }
        }, 1000)
    }

    const handleInputSubmit = async () => {
        if (!inputValue.trim() || !resolvedId || chatStatus === 'closed') return
        const text = inputValue
        setInputValue("")

        await addMessage('user', text, fbUser?.displayName || "Institute User")

        setIsTyping(true)
        setTimeout(async () => {
            setIsTyping(false)
            if (currentStep === 'DESC_INPUT') {
                setTicketDetails(prev => ({ ...prev, description: text }))
                await addMessage('ai', 'Okay, I have noted all your information. Do you want to talk to a live executive?', 'Digital Class Support', 'AI Assistant', {
                    type: 'options',
                    options: ['Talk to Executive 👨‍💼', 'No, Generate Ticket 🎫', 'Add More Details ➕']
                })
                setCurrentStep('TICKET_CONFIRM')
            }
        }, 1200)
    }

    const generateFormalTicket = async () => {
        if (!database || !resolvedId) return
        const ticketId = `DC-${Date.now().toString().slice(-6)}`

        const ticketsRef = ref(database, `Institutes/${resolvedId}/support_tickets`)
        const ticketData = {
            ticket_id: ticketId,
            raised_at: Date.now(),
            status: 'Open',
            institute_name: ticketDetails.instituteName,
            module: ticketDetails.module,
            issue_type: ticketDetails.issueType,
            problem: ticketDetails.description,
            last_update: Date.now()
        }
        await push(ticketsRef, ticketData)

        // Also update chat details for Super Admin visibility
        await update(ref(database, `Institutes/${resolvedId}/support_chat/details`), {
            ticket_id: ticketId,
            module: ticketDetails.module,
            issue_type: ticketDetails.issueType,
            last_updated: Date.now()
        })

        await addMessage('ai', `✅ Ticket Generated: **${ticketId}**\n\nInstitute: ${ticketDetails.instituteName}\nIssue: ${ticketDetails.module}\nDetails: ${ticketDetails.description}\n\nOur team has been notified. Would you like to talk to a live executive?`, 'Digital Class Support', 'AI Assistant', {
            type: 'options',
            options: ['Talk to Executive 👨\u200D💼', 'Close Conversation']
        })
        setCurrentStep('EXECUTIVE_HANDOFF_PROMPT')
    }

    const startQueueFlow = async () => {
        await addMessage('ai', 'Currently, all our executives are busy. I have placed you in the support queue. Please wait a moment.', 'Digital Class Support', 'AI Assistant')

        await set(ref(database, `Institutes/${resolvedId}/support_chat/details/handoff_requested`), true)
        await set(ref(database, `Institutes/${resolvedId}/support_chat/details/handoff_at`), Date.now())
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !resolvedId || !storage || !database) return

        setIsUploading(true)
        try {
            const fileName = `${Date.now()}_${file.name}`
            const path = `support_chats/${resolvedId}/screenshots/${fileName}`
            const sRef = storageRef(storage, path)

            const snapshot = await uploadBytes(sRef, file)
            const url = await getDownloadURL(snapshot.ref)

            await addMessage('user', 'Uploaded a screenshot', fbUser?.displayName || "Institute User", "", {
                image_url: url
            })

            setIsUploading(false)
        } catch (err) {
            console.error(err)
            setIsUploading(false)
        }
    }

    const handleExecutiveHandoff = async () => {
        if (!database || !resolvedId) return

        await set(ref(database, `Institutes/${resolvedId}/support_chat/details/handoff_requested`), true)
        await set(ref(database, `Institutes/${resolvedId}/support_chat/details/handoff_at`), Date.now())

        await addMessage('ai', 'Searching for an available executive... ⏳ \nThey will join this chat shortly. Please stay online.', 'Digital Class Support', 'AI Assistant')
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="fixed bottom-0 top-auto left-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] w-full sm:max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl sm:rounded-[32px] rounded-t-[32px] rounded-b-none flex flex-col h-[85vh] sm:h-[700px] font-public-sans transition-all duration-300 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full sm:data-[state=open]:slide-in-from-top-[48%] [&>button]:hidden">

                {/* Premium Header */}
                <div className="bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#DB2777] p-6 flex flex-col relative shrink-0 shadow-lg">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 bg-white/15 hover:bg-white/25 rounded-full transition-all text-white backdrop-blur-md z-20"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-white/30 overflow-hidden p-2 shrink-0 shadow-2xl rotate-3">
                            <img src="https://ik.imagekit.io/gnzjd77mb/2.png?updatedAt=1755682614417" className="w-full h-full object-contain" alt="DC" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-[17px] font-black text-white tracking-tight leading-loose drop-shadow-sm">Digital Class Support</h2>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                <span className="text-white/80 text-[10px] font-black tracking-widest uppercase">
                                    {assignedExecutive ? "Executive Live" : "AI Assistant Online"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#F8FAFC] relative scroll-smooth" ref={scrollRef}>

                    {messages.map((msg, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={cn("flex flex-col", msg.sender_type === 'user' ? "items-end" : "items-start")}
                        >
                            <div className={cn("flex items-end gap-2.5 max-w-[85%]", msg.sender_type === 'user' && "flex-row-reverse")}>
                                {msg.sender_type !== 'user' && (
                                    <Avatar className="w-8 h-8 border-2 border-white shadow-md shrink-0 rounded-xl">
                                        {msg.sender_type === 'ai' ? (
                                            <AvatarFallback className="bg-gradient-to-tr from-indigo-50 to-indigo-100 text-indigo-600"><Bot className="w-4 h-4" /></AvatarFallback>
                                        ) : (
                                            <AvatarImage src={msg.sender_photo} className="object-cover" />
                                        )}
                                        <AvatarFallback className="bg-indigo-600 text-white font-black uppercase">{msg.sender_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                )}

                                <div className="space-y-1.5 flex flex-col items-start w-full">
                                    <span className={cn(
                                        "text-[9px] font-black text-slate-400 px-1 tracking-widest uppercase",
                                        msg.sender_type === 'user' && "text-right w-full"
                                    )}>
                                        {msg.sender_type === 'user' ? "You" : (msg.sender_position || msg.sender_name)}
                                    </span>
                                    <div className={cn(
                                        "p-4 rounded-2xl text-[13px] leading-relaxed shadow-[0_10px_20px_rgba(0,0,0,0.02)] border transition-all duration-300 font-medium",
                                        msg.sender_type === 'user'
                                            ? "bg-indigo-600 text-white border-indigo-500 rounded-br-none"
                                            : "bg-white text-slate-700 border-slate-100 rounded-bl-none"
                                    )}>
                                        {msg.message}

                                        {msg.image_url && (
                                            <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer group relative" onClick={() => window.open(msg.image_url, '_blank')}>
                                                <img src={msg.image_url} alt="Screenshot" className="max-w-full h-auto transition-transform group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-black/5 group-hover:opacity-100 opacity-0 transition-opacity flex items-center justify-center">
                                                    <ImageIcon className="w-5 h-5 text-white drop-shadow" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {msg.type === 'options' && msg.options && (
                                        <div className={cn("flex flex-wrap gap-2 mt-2 w-full", msg.sender_type === 'user' ? "justify-end" : "")}>
                                            {msg.options.map((opt: string) => {
                                                const isCompleted = chatStatus === 'closed' || idx !== messages.length - 1;
                                                return (
                                                    <motion.button
                                                        key={opt}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => handleOptionSelect(opt)}
                                                        disabled={isCompleted}
                                                        className={cn(
                                                            "px-4 py-2 border rounded-xl text-[11px] font-black shadow-sm transition-all flex items-center gap-2 group",
                                                            isCompleted
                                                                ? "hidden"
                                                                : "bg-white border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 hover:shadow-indigo-100/50"
                                                        )}
                                                    >
                                                        {opt} <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <div className="flex items-end gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-100 rounded-bl-none shadow-sm">
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Footer */}
                <div className="p-5 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_25px_rgba(0,0,0,0.02)]">
                    {chatStatus === 'closed' ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-slate-300" />
                            </div>
                            <p className="text-[11px] text-slate-400 font-black tracking-widest uppercase">Resolution archived</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 relative">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isUploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-10 h-10 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 shrink-0 transition-all"
                                >
                                    {isUploading ? <Sparkles className="w-4 h-4 animate-spin text-indigo-500" /> : <Paperclip className="w-4 h-4" />}
                                </Button>

                                <div className="flex-1 relative group">
                                    <Input
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleInputSubmit()}
                                        placeholder="Tell us what's wrong..."
                                        className="h-11 bg-slate-50/50 border-slate-100 rounded-2xl pl-4 pr-12 text-[13px] font-bold placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all border-none shadow-inner"
                                    />
                                    <Button
                                        onClick={handleInputSubmit}
                                        disabled={!inputValue.trim()}
                                        className="absolute right-1 top-1 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase">
                                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                                Smarter Support Live
                            </div>
                        </div>
                    )}
                </div>

                <style jsx global>{`
          @keyframes reverse-spin {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          .animate-reverse-spin {
            animation: reverse-spin 8s linear infinite;
          }
          .animate-spin-slow {
            animation: spin 12s linear infinite;
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
        `}</style>

                {/* Full Screen Queue Overlay */}
                <AnimatePresence>
                    {showQueueOverlay && queuePosition !== null && !assignedExecutive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center bg-white pointer-events-auto"
                        >
                            <button
                                onClick={onClose}
                                className="absolute right-6 top-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="relative mb-12">
                                {/* Multiple Animated Rings */}
                                <div className="absolute inset-0 -m-12 rounded-full border-4 border-dashed border-indigo-50 animate-spin-slow opacity-50" />
                                <div className="absolute inset-0 -m-6 rounded-full border-2 border-indigo-100 animate-reverse-spin opacity-30" />

                                <div className="w-56 h-56 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-1.5 shadow-[0_30px_60px_rgba(79,70,229,0.4)]">
                                    <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-shimmer" />
                                        <span className="text-7xl font-black text-indigo-600 tabular-nums">{queuePosition}</span>
                                        <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest mt-1">Minutes Left</span>
                                    </div>
                                </div>

                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4 }}
                                    className="absolute -top-6 -right-6 w-16 h-16 bg-rose-500 rounded-[24px] flex items-center justify-center text-white shadow-2xl rotate-12"
                                >
                                    <Clock className="w-8 h-8" />
                                </motion.div>
                            </div>

                            <div className="space-y-6 max-w-[320px]">
                                <h3 className="text-4xl font-black text-slate-800 tracking-tight leading-tight">All Hands on Deck! 👨‍💼</h3>
                                <p className="text-base font-medium text-slate-500 leading-relaxed">
                                    Our executives are currently busy assisting other users. You are in the <span className="text-indigo-600 font-bold">priority queue</span>.
                                </p>

                                <div className="pt-4 flex flex-col items-center gap-3">
                                    <div className="flex gap-1.5 items-center bg-indigo-50 px-4 py-2 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-2">Connecting...</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </DialogContent>
        </Dialog>
    )
}
