"use client"

export function Loader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="text-[10px] font-black text-black tracking-[0.3em] animate-pulse">
        Loading...
      </div>
    </div>
  );
}
