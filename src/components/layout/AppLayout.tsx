import React, { useState } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { OrbitalBackground } from "@/components/OrbitalBackground";
import { ChatWidget } from "@/components/rie/ChatWidget";
import { Button } from "@/components/ui/button";
import { Menu, X, Code2, FileText, LayoutDashboard, Settings, Github, BookOpen, Terminal } from "lucide-react";
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
    <div className={cn("min-h-screen flex flex-col relative selection:bg-primary/30 selection:text-primary", className)}>
      <OrbitalBackground />
      <header className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/5 px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-[#f59e0b] text-[#070911] px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter group-hover:scale-105 transition-transform">v1.0</div>
          <span className="font-display font-black text-lg tracking-tighter uppercase group-hover:text-primary transition-colors">ArchLens</span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] opacity-40">Core_Engine_Active</span>
          </div>
          {sessionId && (
            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-mono opacity-50">
              ID: {sessionId.slice(0, 8)}
            </div>
          )}
        </div>
      </header>
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 glass border-t border-white/5 px-8 flex items-center justify-between">
        <div className="flex gap-8 items-center">
          <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary hover:tracking-[0.3em] transition-all duration-300">Architecture</a>
          <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary hover:tracking-[0.3em] transition-all duration-300">Terminal_API</a>
          <a href="https://github.com" target="_blank" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary hover:tracking-[0.3em] transition-all duration-300">
            <Github className="w-3.5 h-3.5" /> Source
          </a>
        </div>
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex items-center gap-3 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all group"
        >
          <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-primary">Console_Menu</span>
          <Terminal className="w-4 h-4 text-primary" />
        </button>
      </nav>
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-[#070911]/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm z-[70] bg-[#0b0e18] border-l border-white/10 p-10 flex flex-col relative overflow-hidden"
            >
              {/* Scan-line Aesthetic Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%]" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-16">
                  <span className="font-display font-black text-2xl uppercase tracking-tighter">System_NAV</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)} className="hover:bg-white/5">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
                <div className="flex-1 space-y-8">
                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 text-3xl font-display font-black hover:text-primary transition-all group"
                  >
                    <span className="text-[10px] font-mono opacity-30 group-hover:opacity-100 group-hover:text-primary">01</span> Terminal_HOME
                  </Link>
                  {sessionId && navLinks.map((link, i) => (
                    <Link
                      key={link.path}
                      to={`${link.path}?session=${sessionId}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-4 text-3xl font-display font-black hover:text-primary transition-all group"
                    >
                      <span className="text-[10px] font-mono opacity-30 group-hover:opacity-100 group-hover:text-primary">0{i+2}</span> {link.name.toUpperCase()}
                    </Link>
                  ))}
                </div>
                <div className="pt-8 border-t border-white/10 relative z-10">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ArchLens_Core: Online
                    </div>
                    <div className="text-[9px] font-mono opacity-30 space-y-1">
                      <p>BUILD: ARCH_V4.0.1_STABLE</p>
                      <p>REGION: GLOBAL_EDGE</p>
                      <p>© 2024 ARCHLENS SYSTEMS</p>
                    </div>
                  </div>
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