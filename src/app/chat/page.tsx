
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  Circle,
  Clock,
  ShieldCheck,
  MessageSquare,
  History,
  Lock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Plus,
  X,
  MoreHorizontal,
  UserCheck,
  Briefcase,
  Users,
  Check,
  CheckCheck
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref as dbRef, onValue, off } from "firebase/database"
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  doc, 
  setDoc, 
  writeBatch,
  limit,
  updateDoc
} from "firebase/firestore"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { encryptMessage, decryptMessage } from "@/lib/crypto-utils"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { usePathname } from "next/navigation"

export default function InternalChatPage() {
  const pathname = usePathname()
  const { database, firestore } = useFirebase()
  const { user } = useUser()
  const { resolvedId, staffId, branchId } = useResolvedId()
  
  const currentUserId = useMemo(() => {
    return branchId || staffId || user?.uid || "";
  }, [branchId, staffId, user]);

  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [chatMeta, setChatMeta] = useState<Record<string, any>>({})
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<any>(null)

  const currentUserRole = useMemo(() => {
    if (pathname.startsWith('/student')) return 'Student'
    if (pathname.startsWith('/staff')) return 'Staff'
    if (pathname.startsWith('/branch')) return 'Branch'
    return 'Admin'
  }, [pathname])

  // Fetch Contacts based on Role Permissions
  useEffect(() => {
    if (!database || !resolvedId || !currentUserId) return
    const rootPath = `Institutes/${resolvedId}`
    
    // Fetch Staff
    onValue(dbRef(database, `${rootPath}/employees`), (snapshot) => {
      const staff = Object.entries(snapshot.val() || {}).map(([id, val]: any) => ({
        id,
        name: `${val.firstName || ''} ${val.lastName || ''}`.trim() || "Staff Member",
        role: 'Staff',
        email: val.staffEmail,
        avatar: `https://picsum.photos/seed/${id}/40/40`
      }))
      
      // Fetch Students
      onValue(dbRef(database, `${rootPath}/admissions`), (s2) => {
        const students = Object.entries(s2.val() || {}).map(([id, val]: any) => ({
          id,
          name: val.studentName || "Student",
          role: 'Student',
          email: val.email,
          avatar: `https://picsum.photos/seed/${id}/40/40`
        }))

        // Fetch Admin Profile for Identity
        onValue(dbRef(database, `${rootPath}/profile`), (s3) => {
          const profile = s3.val() || {}
          const adminContact = {
            id: resolvedId, 
            name: "Administrator",
            role: 'Admin',
            email: profile.email || "admin@institute.com",
            avatar: process.env.NEXT_PUBLIC_LOGO_URL || profile.logoUrl || `https://picsum.photos/seed/${resolvedId}/40/40`
          }

          let allowed: any[] = []
          if (currentUserRole === 'Admin') {
            // Admin can chat with everyone
            allowed = [...staff, ...students]
          } else if (currentUserRole === 'Staff') {
            // Staff sees Admin + Students
            allowed = [adminContact, ...students]
          } else if (currentUserRole === 'Student') {
            // Student ONLY sees Administrator (WhatsApp Support Style)
            allowed = [adminContact]
          } else if (currentUserRole === 'Branch') {
            allowed = [adminContact, ...staff, ...students]
          }

          setContacts(allowed.filter(c => c.id !== currentUserId))
        })
      })
    })
  }, [database, resolvedId, currentUserId, currentUserRole])

  // Sync Chat Metadata (Conversations List)
  useEffect(() => {
    if (!firestore || !currentUserId || !resolvedId) return

    const chatsRef = collection(firestore, 'institutes', resolvedId, 'chats')
    const q = query(chatsRef, where('participants', 'array-contains', currentUserId))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meta: Record<string, any> = {}
      snapshot.docs.forEach(doc => {
        meta[doc.id] = doc.data()
      })
      setChatMeta(meta)
    })

    return () => unsubscribe()
  }, [firestore, currentUserId, resolvedId])

  // Fetch Messages for Selected Chat
  useEffect(() => {
    if (!firestore || !selectedContact || !currentUserId || !resolvedId) return

    const chatId = [currentUserId, selectedContact.id].sort().join('_')
    const messagesRef = collection(firestore, 'institutes', resolvedId, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        text: decryptMessage(doc.data().text || "", chatId)
      }))
      setMessages(msgs)
      
      // Mark as seen
      const unread = snapshot.docs.filter(d => d.data().senderId !== currentUserId && d.data().status !== 'seen')
      if (unread.length > 0) {
        const batch = writeBatch(firestore)
        unread.forEach(d => {
          batch.update(doc(firestore, 'institutes', resolvedId, 'chats', chatId, 'messages', d.id), { status: 'seen' })
        })
        batch.update(doc(firestore, 'institutes', resolvedId, 'chats', chatId), { [`unreadCount.${currentUserId}`]: 0 })
        batch.commit().catch(() => {});
      }

      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })

    return () => unsubscribe()
  }, [firestore, selectedContact, currentUserId, resolvedId])

  // Handle Typing Indicator
  const handleTyping = () => {
    if (!firestore || !selectedContact || !currentUserId || !resolvedId) return
    const chatId = [currentUserId, selectedContact.id].sort().join('_')
    const chatDocRef = doc(firestore, 'institutes', resolvedId, 'chats', chatId)

    if (!isTyping) {
      setIsTyping(true)
      updateDoc(chatDocRef, { [`typing.${currentUserId}`]: true }).catch(() => {})
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      updateDoc(chatDocRef, { [`typing.${currentUserId}`]: false }).catch(() => {})
    }, 2000)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedContact || !currentUserId || !resolvedId || !firestore) return

    setIsSending(true)
    const chatId = [currentUserId, selectedContact.id].sort().join('_')
    const encrypted = encryptMessage(newMessage.trim(), chatId)
    const currentUnread = chatMeta[chatId]?.unreadCount?.[selectedContact.id] || 0
    
    const chatDocRef = doc(firestore, 'institutes', resolvedId, 'chats', chatId)
    const chatUpdateData = {
      lastMessage: encrypted,
      lastMessageAt: serverTimestamp(),
      participants: [currentUserId, selectedContact.id],
      updatedAt: serverTimestamp(),
      [`unreadCount.${selectedContact.id}`]: currentUnread + 1,
      [`typing.${currentUserId}`]: false
    }

    try {
      await setDoc(chatDocRef, chatUpdateData, { merge: true })
      const messagesRef = collection(firestore, 'institutes', resolvedId, 'chats', chatId, 'messages')
      const messageData = {
        senderId: currentUserId,
        senderName: user?.displayName || 'User',
        text: encrypted,
        type: 'text',
        status: 'sent',
        createdAt: serverTimestamp()
      }
      await addDoc(messagesRef, messageData)
      setNewMessage("")
      setIsTyping(false)
    } catch (error) {
      console.error("Message send error:", error);
    } finally {
      setIsSending(false)
    }
  }

  const activeContacts = useMemo(() => {
    return contacts.filter(c => {
      const chatId = [currentUserId, c.id].sort().join('_')
      return !!chatMeta[chatId]?.lastMessageAt
    })
  }, [contacts, chatMeta, currentUserId])

  const sortedAndFilteredActiveContacts = useMemo(() => {
    return activeContacts
      .filter(c => (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const chatIdA = [currentUserId, a.id].sort().join('_')
        const chatIdB = [currentUserId, b.id].sort().join('_')
        const timeA = chatMeta[chatIdA]?.lastMessageAt?.toMillis() || 0
        const timeB = chatMeta[chatIdB]?.lastMessageAt?.toMillis() || 0
        return timeB - timeA
      })
  }, [activeContacts, searchTerm, chatMeta, currentUserId])

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F2F5] font-public-sans text-black selection:bg-primary/20">
      {!pathname.startsWith('/staff') && !pathname.startsWith('/student') && !pathname.startsWith('/branch') && <Sidebar />}
      
      <div className={cn("flex flex-col flex-1 min-w-0", (!pathname.startsWith('/staff') && !pathname.startsWith('/student') && !pathname.startsWith('/branch')) && "lg:pl-[300px]")}>
        <TopNav />
        <main className="flex-1 flex overflow-hidden p-0 bg-white">
          <Card className="flex-1 flex overflow-hidden border-none shadow-none rounded-none bg-white">
            
            {/* 📱 LEFT SIDEBAR: ACTIVE CHATS (WhatsApp Style) */}
            <div className={cn(
              "w-full md:w-96 bg-white border-r border-zinc-200 flex flex-col shrink-0 transition-all duration-300",
              !isSidebarOpen && selectedContact ? "hidden md:flex" : "flex"
            )}>
              <div className="p-4 bg-[#F0F2F5] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-black">Chats</h2>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsNewChatModalOpen(true)} size="icon" variant="ghost" className="h-10 w-10 rounded-full text-black hover:bg-zinc-200 transition-colors">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-black group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Search or start new chat" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 rounded-lg border-none bg-white font-medium text-black shadow-sm focus-visible:ring-primary" 
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="divide-y divide-zinc-50">
                  {sortedAndFilteredActiveContacts.map((contact) => {
                    const chatId = [currentUserId, contact.id].sort().join('_')
                    const meta = chatMeta[chatId]
                    const unread = meta?.unreadCount?.[currentUserId] || 0
                    const isSelected = selectedContact?.id === contact.id
                    const isOtherTyping = meta?.typing?.[contact.id] === true

                    return (
                      <button
                        key={contact.id}
                        onClick={() => { setSelectedContact(contact); setIsSidebarOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 transition-all group relative border-none bg-transparent outline-none cursor-pointer",
                          isSelected ? "bg-[#F0F2F5]" : "hover:bg-[#F5F6F6]"
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-12 w-12 rounded-full border border-zinc-100 shadow-sm">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback className="bg-zinc-100 text-black font-bold">{contact.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-emerald-500 text-white stroke-[2px]" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[14px] font-bold text-black truncate font-public-sans">{contact.name}</span>
                            {meta?.lastMessageAt && (
                              <span className={cn("text-[10px] font-bold ", unread > 0 ? "text-emerald-500" : "text-black")}>
                                {format(meta.lastMessageAt.toDate(), "hh:mm a")}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <p className={cn("text-[13px] truncate max-w-[180px]", isOtherTyping ? "text-emerald-500 font-bold" : "text-black font-medium")}>
                              {isOtherTyping ? "typing..." : (meta?.lastMessage ? decryptMessage(meta.lastMessage, chatId) : contact.role)}
                            </p>
                            {unread > 0 && (
                              <Badge className="bg-emerald-500 text-white border-none h-5 min-w-[20px] rounded-full flex items-center justify-center p-1 text-[10px] font-black">{unread}</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {sortedAndFilteredActiveContacts.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-200">
                        <History className="w-8 h-8" />
                      </div>
                      <p className="text-[11px] font-bold text-black tracking-widest px-10 leading-loose">No active conversations found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* 💬 RIGHT WINDOW: CHAT AREA (WhatsApp Web Style) */}
            <div className={cn(
              "flex-1 bg-[#E5DDD5] flex flex-col overflow-hidden relative transition-all duration-300",
              !selectedContact ? "hidden md:flex" : "flex"
            )}>
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              
              {!selectedContact ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-8 bg-[#F0F2F5] relative z-10">
                  <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-zinc-200 shadow-xl border-b-4 border-emerald-500">
                    <ShieldCheck className="w-16 h-16 text-emerald-500/20" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-black font-public-sans">IMS Secure Messaging</h3>
                    <p className="text-[14px] text-black max-w-sm font-medium leading-relaxed">
                      Select a contact from the sidebar to initiate a secure, real-time node-to-node communication.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-black text-[14px] font-black tracking-widest">
                    <Lock className="w-3 h-3" /> End-to-End Encrypted Node
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-16 bg-[#F0F2F5] px-4 flex items-center justify-between shrink-0 z-10 shadow-sm border-b border-zinc-200">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSelectedContact(null)}
                        className="md:hidden h-10 w-10 text-black hover:bg-zinc-200 rounded-full"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </Button>
                      <div className="relative">
                        <Avatar className="h-10 w-10 rounded-full border border-zinc-200">
                          <AvatarImage src={selectedContact.avatar} />
                          <AvatarFallback className="bg-zinc-200 text-black font-bold">{selectedContact.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <h4 className="text-[14px] font-black text-black leading-none font-public-sans">{selectedContact.name}</h4>
                        <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1 tracking-widest">
                          {chatMeta[[currentUserId, selectedContact.id].sort().join('_')]?.typing?.[selectedContact.id] ? "typing..." : "online"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="text-black hover:bg-zinc-200 rounded-full h-10 w-10"><Search className="w-5 h-5" /></Button>
                      <Button variant="ghost" size="icon" className="text-black hover:bg-zinc-200 rounded-full h-10 w-10"><MoreHorizontal className="w-5 h-5" /></Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 relative">
                    <div className="p-6 md:p-10 space-y-4 relative z-10">
                      {messages.map((msg, i) => {
                        const isMe = msg.senderId === currentUserId
                        return (
                          <div key={msg.id} className={cn("flex w-full animate-in slide-in-from-bottom-1 duration-300", isMe ? "justify-end" : "justify-start")}>
                            <div className={cn(
                              "max-w-[85%] md:max-w-[65%] px-3 py-2 rounded-lg shadow-sm relative group",
                              isMe 
                                ? "bg-[#D9FDD3] text-black rounded-tr-none" 
                                : "bg-white text-black rounded-tl-none"
                            )}>
                              <p className="text-[14px] leading-relaxed font-medium pr-12">{msg.text}</p>
                              <div className={cn(
                                "flex items-center gap-1 mt-1 justify-end",
                                isMe ? "text-black" : "text-black"
                              )}>
                                <span className="text-[10px] font-medium font-public-sans">
                                  {msg.createdAt ? format(msg.createdAt.toDate(), "hh:mm a") : '...'}
                                </span>
                                {isMe && (
                                  <>
                                    {msg.status === 'seen' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={scrollRef} className="h-4" />
                    </div>
                  </ScrollArea>

                  <div className="p-3 bg-[#F0F2F5] shrink-0 border-t border-zinc-200">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="text-black hover:bg-zinc-200 rounded-full h-10 w-10 border-none bg-transparent outline-none cursor-pointer"><Smile className="w-6 h-6" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="text-black hover:bg-zinc-200 rounded-full h-10 w-10 border-none bg-transparent outline-none cursor-pointer"><Paperclip className="w-6 h-6" /></Button>
                      </div>
                      <Input 
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        placeholder="Type a message" 
                        className="flex-1 h-11 border-none bg-white shadow-none focus-visible:ring-0 text-[15px] font-medium text-black placeholder:text-black rounded-lg" 
                      />
                      <Button 
                        type="submit" 
                        disabled={!newMessage.trim() || isSending}
                        className={cn(
                          "h-11 w-11 rounded-full shadow-md active:scale-90 transition-all shrink-0 p-0 border-none cursor-pointer",
                          newMessage.trim() ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-zinc-300 text-black"
                        )}
                      >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 translate-x-0.5" />}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* 🚀 NEW CHAT SELECTION MODAL */}
          <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
            <DialogContent className="max-w-md p-0 border-none rounded-[24px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-[#008069] p-6 text-white relative">
                <DialogTitle className="text-xl font-bold tracking-tight font-public-sans">New Session</DialogTitle>
                
              </div>
              
              <ScrollArea className="max-h-[60vh]">
                <div className="p-4 space-y-6">
                  {/* DIRECTORY SECTION */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-4 pb-2 border-b border-zinc-50">
                      <h4 className="text-[11px] font-black text-emerald-600 tracking-widest">Available Nodes</h4>
                    </div>
                    <div className="space-y-1">
                      {contacts.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedContact(c); setIsNewChatModalOpen(false); setIsSidebarOpen(false); }}
                          className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[#F5F6F6] transition-all group text-left border-none bg-transparent outline-none cursor-pointer"
                        >
                          <Avatar className="h-12 w-12 rounded-full border border-zinc-100 shadow-sm">
                            <AvatarImage src={c.avatar} />
                            <AvatarFallback className="bg-zinc-50 text-black font-bold text-[14px]">{c.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-[14px] font-black text-black font-public-sans tracking-tight">{c.name}</p>
                            <p className="text-[10px] font-bold text-black tracking-widest">{c.role}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-200 group-hover:text-emerald-500 transition-all group-hover:translate-x-1" />
                        </button>
                      ))}
                      {contacts.length === 0 && (
                        <div className="py-10 text-center text-zinc-300 italic text-[10px] font-bold tracking-widest">No accessible contacts found</div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
