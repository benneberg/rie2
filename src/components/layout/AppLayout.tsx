import React, { useState, ReactNode } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { OrbitalBackground } from "@/components/OrbitalBackground";
import { ChatWidget } from "@/components/rie/ChatWidget";
import { Button } from "@/components/ui/button";
import { AppSidebarContent } from "@/components/app-sidebar";
import { X, Github, Terminal, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
type AppLayoutProps = {
  children: ReactNode;
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
    { name: "Dashboard", path: "/dashboard", icon: ChevronRight },
    { name: "Doc Studio", path: "/studio", icon: ChevronRight },
    { name: "Settings", path: "/settings", icon: ChevronRight },
  ];
  return (
    <div className={cn("min-h-screen flex flex-col relative selection:bg-primary/30 selection:text-primary", className)}>
      <OrbitalBackground />
      <header className="fixed top-0 left-0 right-0 z-[60] h-16 glass border-b border-white/5 px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter group-hover:scale-105 transition-transform">PRO</div>
          <span className="font-display font-black text-lg tracking-tighter uppercase group-hover:text-primary transition-colors">ArchLens</span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] opacity-40">System_Active</span>
          </div>
          {sessionId && (
            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-mono opacity-50 uppercase tracking-widest">
              Session_ID: {sessionId.slice(0, 8)}
            </div>
          )}
        </div>
      </header>
      <main className={cn("flex-1 pt-16 pb-24 relative z-10", contentClassName)}>
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
      <nav className="fixed bottom-0 left-0 right-0 z-[60] h-16 glass border-t border-white/5 px-8 flex items-center justify-between">
        <div className="flex gap-8 items-center">
          <Link to="/" className="text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary hover:tracking-[0.3em] transition-all duration-300">Terminal</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary hover:tracking-[0.3em] transition-all duration-300">
            <Github className="w-3.5 h-3.5" /> Source
          </a>
        </div>
        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex items-center gap-3 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all group shadow-glass"
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
              className="fixed inset-0 z-[70] bg-[#070911]/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md z-[80] bg-[#0b0e18] border-l border-white/10 p-0 flex flex-col relative overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%]" />
              <div className="relative z-10 flex flex-col h-full overflow-y-auto p-10 scrollbar-none">
                <div className="flex justify-between items-center mb-12">
                  <span className="font-display font-black text-2xl uppercase tracking-tighter">Console_Nav</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)} className="hover:bg-white/5">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
                <div className="space-y-12">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/50">Core_Navigation</h4>
                    <div className="flex flex-col gap-4">
                      {sessionId && navLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={`${link.path}?session=${sessionId}`}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center justify-between text-2xl font-display font-black hover:text-primary transition-all group"
                        >
                          {link.name.toUpperCase()}
                          <ChevronRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="pt-8 border-t border-white/5">
                    <AppSidebarContent />
                  </div>
                </div>
                <div className="mt-auto pt-10 border-t border-white/10 opacity-30">
                  <div className="flex flex-col gap-2">
                    <div className="text-[9px] font-mono space-y-1 uppercase tracking-widest">
                      <p>BUILD: ARCH_V4.2.1_STABLE</p>
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