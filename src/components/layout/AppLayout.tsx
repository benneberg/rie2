import React, { useState } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { OrbitalBackground } from "@/components/OrbitalBackground";
import { ChatWidget } from "@/components/rie/ChatWidget";
import { Button } from "@/components/ui/button";
import { Menu, X, Code2, FileText, LayoutDashboard, Settings, Github, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
type AppLayoutProps = {
  children: React.ReactNode;
  container?: boolean;
  className?: string;
  contentClassName?: string;
};
export function AppLayout({ children, container = false, className, contentClassName }: AppLayoutProps): JSX.Element {
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sessionId = searchParams.get('session');
  const location = useLocation();
  const navLinks = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Doc Studio", path: "/studio", icon: FileText },
    { name: "Settings", path: "/settings", icon: Settings },
  ];
  return (
    <div className={cn("min-h-screen flex flex-col relative", className)}>
      <OrbitalBackground />
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/5 px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-[#f59e0b] text-[#070911] px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter">v1.0</div>
          <span className="font-display font-black text-lg tracking-tighter uppercase">ArchLens</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Core Engine Online</span>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className={cn("flex-1 pt-16 pb-24", contentClassName)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname + (sessionId || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(container && "max-w-7xl mx-auto px-6 py-12")}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      {/* Fixed Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 glass border-t border-white/5 px-6 flex items-center justify-between">
        <div className="flex gap-6 items-center">
          <a href="#" className="text-[10px] font-bold uppercase tracking-widest hover:text-[#f59e0b] transition-colors">Docs</a>
          <a href="#" className="text-[10px] font-bold uppercase tracking-widest hover:text-[#f59e0b] transition-colors">API</a>
          <a href="https://github.com" target="_blank" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:text-[#f59e0b] transition-colors">
            <Github className="w-3.5 h-3.5" /> Github
          </a>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Menu</span>
          <Menu className="w-4 h-4" />
        </button>
      </nav>
      {/* Slide-out Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-[#070911]/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm z-[70] bg-[#0b0e18] border-l border-white/5 p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <span className="font-display font-black text-xl uppercase tracking-tighter">Navigation</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <div className="flex-1 space-y-6">
                <Link 
                  to="/" 
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-4 text-2xl font-display font-bold hover:text-[#f59e0b] transition-colors group"
                >
                  <span className="text-xs opacity-30 group-hover:opacity-100">01</span> Landing
                </Link>
                {sessionId && navLinks.map((link, i) => (
                  <Link 
                    key={link.path}
                    to={`${link.path}?session=${sessionId}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 text-2xl font-display font-bold hover:text-[#f59e0b] transition-colors group"
                  >
                    <span className="text-xs opacity-30 group-hover:opacity-100">0{i+2}</span> {link.name}
                  </Link>
                ))}
              </div>
              <div className="pt-8 border-t border-white/5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    System Healthy
                  </div>
                  <span className="text-[10px] font-mono opacity-30">ARCHLENS_CORE_BUILD_4.0.1</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {sessionId && <ChatWidget />}
    </div>
  );
}