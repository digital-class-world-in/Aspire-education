"use client"

import { motion } from "framer-motion"
import { 
  UserPlus, 
  Award, 
  BookOpen, 
  Monitor, 
  Briefcase, 
  Trophy,
  ArrowRight
} from "lucide-react"

const STEPS = [
  { id: 1, title: "Admission", icon: UserPlus, desc: "Seamless enrollment process with expert counselling." },
  { id: 2, title: "Orientation", icon: Award, desc: "Introduction to campus culture, values and academic standards." },
  { id: 3, title: "Classroom", icon: BookOpen, desc: "Conceptual learning in modern smart classrooms." },
  { id: 4, title: "Practical", icon: Monitor, desc: "Hands-on experience in state-of-the-art computer labs." },
  { id: 5, title: "Internship", icon: Briefcase, desc: "Real-world exposure through corporate internships." },
  { id: 6, title: "Placement", icon: Trophy, desc: "Career launch with top-tier industry partners." }
]

export function InfrastructureCycle() {
  return (
    <div className="relative py-20 overflow-hidden bg-zinc-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <span className="text-primary font-black tracking-[0.3em] text-[10px]">Your Growth Engine</span>
          <h2 className="text-4xl lg:text-5xl font-black text-black tracking-tight">The Academic Lifecycle</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
              
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                  <step.icon className="w-8 h-8" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-primary/40">0{step.id}</span>
                    <h4 className="text-xl font-black text-black tracking-tight">{step.title}</h4>
                  </div>
                  <p className="text-[14px] text-black font-medium leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-4 flex items-center gap-2 text-[10px] font-black tracking-widest text-primary opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-500">
                  Phase Details <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Connecting line for desktop/visual fliar */}
              {i < STEPS.length - 1 && (
                <div className="absolute top-1/2 -right-4 w-8 h-[2px] bg-zinc-100 hidden lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
