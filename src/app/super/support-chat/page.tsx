"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, set, push, update, remove } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { 
  MessageSquare, 
  Search, 
  Filter, 
  User, 
  Clock, 
  CheckCircle2, 
  Send,
  X,
  Paperclip,
  ImageIcon,
  LogOut,
  Zap,
  Bell,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function SupportChatPage() {
  const { database, storage } = useFirebase()
  const [chats, setChats] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tab, setTab] = useState<'active' | 'closed'>('active')

  // Join State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [joiningInstId, setJoiningInstId] = useState<string | null>(null)
  const [executiveInfo, setExecutiveInfo] = useState({ name: "", position: "", photo: "" })
  const [joiningExecutive, setJoiningExecutive] = useState(false)

  // Message State
  const [inputValue, setInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Fetch Chats (Listen to all institutes)
  useEffect(() => {
    if (!database) return
    const instRef = ref(database, 'Institutes')
    
    const unsub = onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list: any[] = []
      
      Object.keys(data).forEach(id => {
        if (data[id].support_chat) {
          list.push({
            id,
            instituteName: data[id].profile?.instituteName || id,
            ...data[id].support_chat.details,
            messages: data[id].support_chat.messages ? Object.keys(data[id].support_chat.messages).map(k => ({ id: k, ...data[id].support_chat.messages[k] })) : []
          })
        }
      })
      
      list.sort((a, b) => (b.last_updated || 0) - (a.last_updated || 0))
      setChats(list)
      setIsLoading(false)

      // Keep active chat synced
      if (activeChat) {
        const updated = list.find(c => c.id === activeChat.id)
        if (updated) setActiveChat(updated)
      }
    })

    return () => off(instRef)
  }, [database, activeChat?.id])

  // 3. Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeChat?.messages])

  const handleJoinChat = async () => {
    if (!database || !joiningInstId || !executiveInfo.name || !executiveInfo.position) return
    setJoiningExecutive(true)
    try {
      const chatRef = ref(database, `Institutes/${joiningInstId}/support_chat`)
      
      await update(ref(database, `Institutes/${joiningInstId}/support_chat/details`), {
        assigned_executive: executiveInfo,
        status: 'active'
      })
      
      const msgsRef = ref(database, `Institutes/${joiningInstId}/support_chat/messages`)
      await push(msgsRef, {
        sender_type: 'executive',
        sender_name: executiveInfo.name,
        sender_position: executiveInfo.position,
        sender_photo: executiveInfo.photo,
        message: `Hello! I am ${executiveInfo.name}, ${executiveInfo.position}. How can I assist you?`,
        timestamp: Date.now()
      })
      
      setActiveChat(chats.find(c => c.id === joiningInstId))
      setIsJoinModalOpen(false)
      setJoiningExecutive(false)
    } catch (e) {
      console.error(e)
      setJoiningExecutive(false)
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || !activeChat || !database) return
    const text = inputValue
    setInputValue("")
    
    const msgsRef = ref(database, `Institutes/${activeChat.id}/support_chat/messages`)
    await push(msgsRef, {
      sender_type: 'executive',
      sender_name: activeChat.assigned_executive.name,
      sender_position: activeChat.assigned_executive.position,
      sender_photo: activeChat.assigned_executive.photo,
      message: text,
      timestamp: Date.now()
    })

    await update(ref(database, `Institutes/${activeChat.id}/support_chat/details`), {
      last_message: text,
      last_updated: Date.now()
    })
  }

  const markResolved = async () => {
    if (!activeChat || !database) return
    await set(ref(database, `Institutes/${activeChat.id}/support_chat/details/status`), 'closed')
    
    const msgsRef = ref(database, `Institutes/${activeChat.id}/support_chat/messages`)
    await push(msgsRef, {
      sender_type: 'executive',
      sender_name: activeChat.assigned_executive.name,
      message: 'This issue has been marked as resolved.',
      timestamp: Date.now()
    })
  }

  const clearChat = async () => {
    if (!activeChat || !database) return
    const chatRef = ref(database, `Institutes/${activeChat.id}/support_chat`)
    await remove(chatRef)
    setActiveChat(null)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !storage) return
    const sRef = storageRef(storage, `executives/${Date.now()}_${file.name}`)
    const snapshot = await uploadBytes(sRef, file)
    const url = await getDownloadURL(snapshot.ref)
    setExecutiveInfo({ ...executiveInfo, photo: url })
  }

  const filteredChats = chats.filter(c => 
    (c.status === tab) &&
    (c.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.last_message?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 animate-in fade-in duration-500 font-public-sans">
      {/* Left Sidebar: Chat List */}
      <Card className="w-[380px] flex flex-col border-slate-200 rounded-[32px] overflow-hidden bg-white shrink-0 shadow-sm">
        <div className="p-6 border-b border-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-black tracking-tight flex items-center gap-2">
               <MessageSquare className="w-6 h-6 text-indigo-600" /> Support Desk
            </h2>
          </div>
          
          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl">
             <button onClick={() => setTab('active')} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", tab === 'active' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}>Active ({chats.filter(c=>c.status==='active').length})</button>
             <button onClick={() => setTab('closed')} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", tab === 'closed' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}>Closed ({chats.filter(c=>c.status==='closed').length})</button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search ID..." 
              className="pl-10 h-11 rounded-xl bg-slate-50 border-none text-sm font-medium" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm font-medium">Loading...</div>
          ) : filteredChats.length === 0 ? (
            <div className="p-12 text-center text-slate-300 font-bold opacity-50 space-y-2">
               <Bell className="w-10 h-10 mx-auto" />
               <p>No {tab} chats</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredChats.map((chat) => (
                <div 
                  key={chat.id} 
                  onClick={() => {
                    if (chat.assigned_executive) setActiveChat(chat)
                    else { setJoiningInstId(chat.id); setIsJoinModalOpen(true); }
                  }}
                  className={cn(
                    "p-5 cursor-pointer transition-all hover:bg-slate-50 flex gap-4 border-l-4",
                    activeChat?.id === chat.id ? "bg-indigo-50/50 border-indigo-600" : "border-transparent",
                    chat.handoff_requested && !chat.assigned_executive ? "bg-rose-50/30 border-rose-500" : ""
                  )}
                >
                  <Avatar className="h-12 w-12 rounded-[18px] border-2 border-white shadow-sm shrink-0">
                    <AvatarFallback className="bg-slate-100 text-slate-600 font-black uppercase">{chat.instituteName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-black truncate pr-2">{chat.instituteName}</span>
                      <span className="text-[9px] font-bold text-slate-400">
                         {chat.last_updated ? formatDistanceToNow(chat.last_updated, { addSuffix: false }) : 'now'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 font-medium font-italic">"{chat.last_message || '...'}"</p>
                    {chat.handoff_requested && !chat.assigned_executive && (
                        <div className="mt-2 animate-pulse text-[8px] font-black text-rose-500 tracking-widest uppercase">Needs Executive 🆘</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Right Column: Chat Window */}
      <Card className="flex-1 flex flex-col border-slate-200 rounded-[32px] overflow-hidden bg-[#fafafa] shadow-sm relative">
        {activeChat ? (
          <>
            {/* Window Header */}
            <div className="bg-white p-6 border-b border-slate-50 flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 rounded-2xl border-2 border-white shadow-xl">
                  <AvatarFallback className="bg-indigo-600 text-white font-black uppercase">{activeChat.instituteName[0]}</AvatarFallback>
                </Avatar>
                 <div>
                    <h3 className="text-lg font-black text-black tracking-tight">{activeChat.instituteName}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                       <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-500">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> LIVE
                       </div>
                       {activeChat.ticket_id && (
                         <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black h-5">
                           TICKET: {activeChat.ticket_id}
                         </Badge>
                       )}
                       {activeChat.module && (
                         <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[9px] font-black h-5">
                           {activeChat.module} / {activeChat.issue_type}
                         </Badge>
                       )}
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={clearChat} 
                  variant="outline" 
                  className="rounded-xl h-11 px-4 text-rose-500 border-rose-100 hover:bg-rose-50 hover:text-rose-600 gap-2 font-bold text-xs"
                >
                  <Trash2 className="w-4 h-4" /> Clear Chat
                </Button>
                <Button onClick={markResolved} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-2 font-black text-xs h-11 px-6 border-none">
                  <CheckCircle2 className="w-4 h-4" /> Resolved
                </Button>
                <Button onClick={() => setActiveChat(null)} variant="ghost" className="rounded-xl h-11 w-11 p-0 text-slate-300 hover:text-black">
                   <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8" ref={scrollRef}>
              {(activeChat.messages || []).map((msg: any) => (
                <div key={msg.id} className={cn("flex flex-col", msg.sender_type === 'executive' ? "items-end" : "items-start")}>
                   <span className="text-[9px] font-black text-slate-400 mb-2 px-1 tracking-widest uppercase">
                    {msg.sender_type === 'executive' ? "Support Desk" : (msg.sender_position || msg.sender_name)}
                   </span>
                  
                  <div className={cn("flex items-end gap-3.5 max-w-[75%]", msg.sender_type === 'executive' && "flex-row-reverse")}>
                    <Avatar className="h-10 w-10 border-2 border-white shadow-xl rounded-[18px] shrink-0">
                       {msg.sender_photo ? <AvatarImage src={msg.sender_photo} /> : <AvatarFallback className="bg-slate-100 text-slate-400"><User className="w-5 h-5"/></AvatarFallback>}
                    </Avatar>
                    
                    <div className="space-y-2">
                      <div className={cn(
                        "p-4 rounded-[22px] text-[13px] font-medium leading-relaxed shadow-sm border",
                        msg.sender_type === 'executive' 
                          ? "bg-indigo-600 text-white border-indigo-500 rounded-br-none" 
                          : "bg-white text-slate-800 border-slate-100 rounded-bl-none shadow-md"
                      )}>
                        {msg.message}
                        {msg.image_url && (
                           <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 cursor-zoom-in" onClick={() => window.open(msg.image_url, '_blank')}>
                             <img src={msg.image_url} alt="Attached" className="max-w-full h-auto" />
                           </div>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-300 px-2 uppercase italic">{msg.timestamp ? format(msg.timestamp, "hh:mm a") : '...'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-8 bg-white border-t border-slate-50 shrink-0 shadow-2xl">
              {activeChat.status === 'closed' ? (
                 <div className="flex flex-col items-center gap-2 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Closed Conversation</p>
                 </div>
              ) : (
                <div className="flex items-center gap-4 relative">
                   <Button variant="ghost" size="icon" className="w-12 h-12 text-slate-300 hover:text-indigo-600 rounded-xl"><Paperclip className="w-6 h-6" /></Button>
                   <Input 
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Enter official response..." 
                    className="flex-1 h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-16 font-bold text-sm"
                   />
                   <Button onClick={sendMessage} disabled={!inputValue.trim()} className="absolute right-2 w-12 h-12 bg-indigo-600 hover:bg-black text-white rounded-xl shadow-xl transition-all">
                     <Send className="w-5 h-5" />
                   </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20 space-y-6 bg-white shrink-0">
             <div className="w-24 h-24 bg-indigo-50 rounded-[40px] flex items-center justify-center text-indigo-600 animate-bounce">
                <MessageSquare className="w-10 h-10" />
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl font-black">Executive Console</h3>
                <p className="text-slate-400 font-medium max-w-xs mx-auto">Click an active session on the left to start real-time troubleshooting.</p>
             </div>
          </div>
        )}
      </Card>

      {/* Join Handoff Modal */}
      <Dialog open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-y-auto rounded-[32px] bg-white border-none shadow-2xl">
          <div className="bg-indigo-600 p-8 text-white">
             <DialogTitle className="text-2xl font-black">Join Conversation</DialogTitle>
             <p className="text-indigo-100 text-xs font-medium mt-1">Fill details to start assist the institute user</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
               <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 relative group cursor-pointer overflow-hidden flex items-center justify-center" onClick={()=>fileInputRef.current?.click()}>
                  {executiveInfo.photo ? <img src={executiveInfo.photo} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-slate-300" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-bold">UPLOAD</div>
               </div>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>
            <div className="space-y-4">
               <div><Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Name</Label><Input value={executiveInfo.name} onChange={e=>setExecutiveInfo({...executiveInfo, name: e.target.value})} placeholder="Rahul S." className="h-12 rounded-xl mt-1" /></div>
               <div><Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Position</Label><Input value={executiveInfo.position} onChange={e=>setExecutiveInfo({...executiveInfo, position: e.target.value})} placeholder="Senior Tech Support" className="h-12 rounded-xl mt-1" /></div>
            </div>
            <Button onClick={handleJoinChat} disabled={!executiveInfo.name || !executiveInfo.position || joiningExecutive} className="w-full h-14 bg-indigo-600 hover:bg-black text-white rounded-2xl font-black shadow-xl">
              {joiningExecutive ? "Entering..." : "Join as Executive"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
