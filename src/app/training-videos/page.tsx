"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    PlayCircle,
    Play,
    CheckCircle2,
    ChevronRight,
    Video,
    Layers,
    Info,
    ExternalLink,
    ChevronLeft,
    Search,
    BookOpen
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface VideoEntry {
    title: string
    url: string
}

interface StepEntry {
    title: string
    videos: VideoEntry[]
}

interface TrainingModule {
    id: string
    title: string
    assignedInstitutes: string[]
    steps: StepEntry[]
    createdAt: string
    updatedAt: string
}

export default function TrainingVideosPage() {
    const { database } = useFirebase()
    const { resolvedId, isLoading: isIdLoading } = useResolvedId()

    const [modules, setModules] = useState<TrainingModule[]>([])
    const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null)
    const [activeStep, setActiveStep] = useState(0)
    const [activeVideo, setActiveVideo] = useState<VideoEntry | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!database || !resolvedId) return

        const modulesRef = ref(database, 'TrainingVideos')
        onValue(modulesRef, (snapshot) => {
            const data = snapshot.val() || {}
            const list = Object.keys(data)
                .map(k => ({ ...data[k], id: k }))
                .filter((m: TrainingModule) => m.assignedInstitutes?.includes(resolvedId))

            setModules(list)
            if (list.length > 0 && !selectedModule) {
                setSelectedModule(list[0])
                if (list[0].steps?.[0]?.videos?.[0]) {
                    setActiveVideo(list[0].steps[0].videos[0])
                }
            }
            setIsLoading(false)
        })

        return () => off(modulesRef)
    }, [database, resolvedId])

    const getYoutubeEmbedUrl = (url: string) => {
        if (!url) return ""
        let videoId = ""
        if (url.includes("youtube.com/watch?v=")) {
            videoId = url.split("v=")[1].split("&")[0]
        } else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1].split("?")[0]
        } else if (url.includes("youtube.com/embed/")) {
            videoId = url.split("embed/")[1].split("?")[0]
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : ""
    }

    const currentSteps = selectedModule?.steps || []
    const currentVideos = currentSteps[activeStep]?.videos || []

    if (isIdLoading || isLoading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex">
                <SidebarMain />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex font-public-sans">
            <Sidebar />
            <div className="lg:pl-[300px] flex flex-col flex-1 w-full">
                <TopNav />
                <main className="flex-1 p-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20 w-full">

                    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-primary">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <PlayCircle className="w-6 h-6" />
                                </div>
                                <h2 className="text-sm font-bold uppercase tracking-widest opacity-60">Learning Center</h2>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">University Training</h1>
                            <p className="text-slate-500 font-medium">Master your ERP system with our step-by-step video guides.</p>
                        </div>

                        {modules.length > 1 && (
                            <div className="flex gap-2">
                                {modules.map(m => (
                                    <Button
                                        key={m.id}
                                        onClick={() => {
                                            setSelectedModule(m)
                                            setActiveStep(0)
                                            if (m.steps?.[0]?.videos?.[0]) setActiveVideo(m.steps[0].videos[0])
                                        }}
                                        variant={selectedModule?.id === m.id ? "default" : "outline"}
                                        className={cn(
                                            "rounded-xl h-12 px-6 font-bold transition-all",
                                            selectedModule?.id === m.id ? "shadow-lg shadow-primary/20" : "bg-white"
                                        )}
                                    >
                                        {m.title}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    {modules.length === 0 ? (
                        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] p-20 text-center bg-white">
                            <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-300">
                                <Video className="w-12 h-12" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">No Training Videos Assigned</h2>
                            <p className="text-slate-500 max-w-md mx-auto font-medium">Your account doesn't have any training modules assigned yet. Contact Super Admin for access.</p>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            {/* Horizontal Stepper */}
                            <div className="relative">
                                <div className="absolute top-[28px] left-0 right-0 h-1 bg-slate-100 z-0 rounded-full" />
                                <ScrollArea className="w-full" orientation="horizontal">
                                    <div className="relative z-10 flex justify-between items-center gap-8 min-w-max pb-4 px-4">
                                        {currentSteps.map((step, idx) => {
                                            const isActive = activeStep === idx
                                            const isCompleted = activeStep > idx
                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center gap-4 group">
                                                    <button
                                                        onClick={() => {
                                                            setActiveStep(idx)
                                                            if (step.videos?.[0]) setActiveVideo(step.videos[0])
                                                        }}
                                                        className={cn(
                                                            "w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-300 border-4",
                                                            isActive ? "bg-primary text-white border-white shadow-xl shadow-primary/30 scale-110" :
                                                                isCompleted ? "bg-emerald-500 text-white border-white shadow-lg shadow-emerald-100" :
                                                                    "bg-white text-slate-400 border-slate-50 hover:border-slate-200"
                                                        )}
                                                    >
                                                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <span className="text-lg font-black">{idx + 1}</span>}
                                                    </button>
                                                    <span className={cn(
                                                        "text-[13px] font-bold text-center tracking-tight transition-colors px-4 py-1.5 rounded-full",
                                                        isActive ? "text-primary bg-primary/5" : "text-slate-500"
                                                    )}>
                                                        {step.title}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
                                {/* Main Content Area - Video Player */}
                                <div className="lg:col-span-8 space-y-6">
                                    <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden bg-white">
                                        <div className="aspect-video bg-black relative flex items-center justify-center group">
                                            {activeVideo ? (
                                                <iframe
                                                    key={activeVideo.url}
                                                    src={`${getYoutubeEmbedUrl(activeVideo.url)}?autoplay=0&rel=0`}
                                                    title={activeVideo.title}
                                                    className="w-full h-full border-none"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <div className="text-white flex flex-col items-center">
                                                    <PlayCircle className="w-16 h-16 opacity-20 mb-4" />
                                                    <p className="font-bold tracking-widest uppercase opacity-40">Select a Video to Play</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-3 py-1">STEP {activeStep + 1}</Badge>
                                                <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                                    <Video className="w-3.5 h-3.5" /> {currentVideos.length} Videos in this step
                                                </span>
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 mb-4">{activeVideo?.title || "Choose a lesson"}</h2>
                                            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                                                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <BookOpen className="w-4.5 h-4.5 text-primary" />
                                                    <span className="text-[13px] font-bold text-slate-700">Course: {selectedModule?.title}</span>
                                                </div>
                                                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <Layers className="w-4.5 h-4.5 text-primary" />
                                                    <span className="text-[13px] font-bold text-slate-700">Module: {currentSteps[activeStep]?.title}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Sidebar - Video List for Current Step */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                            <h3 className="font-black text-slate-900 tracking-tight">Step Content</h3>
                                            <Badge variant="secondary" className="bg-white shadow-sm border-none font-black text-[10px] items-center gap-1.5 flex py-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                PLAYLIST
                                            </Badge>
                                        </div>
                                        <ScrollArea className="h-[550px]">
                                            <div className="p-4 space-y-2">
                                                {currentVideos.map((vid, idx) => {
                                                    const isActive = activeVideo?.url === vid.url
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setActiveVideo(vid)}
                                                            className={cn(
                                                                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all border-2 text-left group",
                                                                isActive ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                                                                isActive ? "bg-white/20" : "bg-slate-100 text-slate-400 group-hover:text-primary"
                                                            )}>
                                                                {isActive ? <Play className="w-5 h-5 fill-current" /> : <PlayCircle className="w-6 h-6" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={cn("text-xs font-bold uppercase tracking-widest opacity-60 mb-1", isActive ? "text-white" : "text-slate-400")}>VIDEO {idx + 1}</p>
                                                                <h4 className={cn("text-[13px] font-black line-clamp-1 leading-tight", isActive ? "text-white" : "text-slate-900")}>{vid.title}</h4>
                                                            </div>
                                                            <ChevronRight className={cn("w-4 h-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-1", isActive ? "text-white" : "text-slate-300")} />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    )
}

function SidebarMain() {
    return <div className="hidden lg:flex lg:w-[300px] border-r border-slate-100 bg-white" />
}
