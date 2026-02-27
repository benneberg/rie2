import React, { useEffect, useState } from "react";
import { Home, FileText, LayoutDashboard, History, Settings, Code2, PlusCircle, AlertCircle } from "lucide-react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { chatService } from "@/lib/chat";
import { SessionInfo } from "../../worker/types";
import { cn } from "@/lib/utils";
/**
 * AppSidebarContent - Refactored to be used inside the MenuPanel overlay
 */
export function AppSidebarContent(): JSX.Element {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const sessionId = searchParams.get('session');
  const [recentSessions, setRecentSessions] = useState<SessionInfo[]>([]);
  useEffect(() => {
    const loadSessions = async () => {
      const result = await chatService.listSessions();
      if (result.success && result.data) {
        setRecentSessions(result.data.slice(0, 8));
      }
    };
    loadSessions();
  }, [sessionId, location.pathname]);
  return (
    <div className="flex flex-col h-full space-y-12">
      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Quick Access</h4>
        <div className="grid grid-cols-1 gap-2">
          <Link to="/" className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group">
            <Home className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-xs font-bold uppercase tracking-widest">Terminal Landing</span>
          </Link>
          <Button variant="outline" className="w-full justify-start gap-3 p-3 border-dashed border-white/20 hover:border-[#f59e0b] bg-transparent text-xs uppercase tracking-widest h-auto" onClick={() => window.location.href = '/'}>
            <PlusCircle className="w-4 h-4 text-[#f59e0b]" /> New Archive Scan
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Scanned_Archives_Recent</h4>
        <div className="space-y-2">
          {recentSessions.map((session) => (
            <Link 
              key={session.id} 
              to={`/dashboard?session=${session.id}`}
              className={cn(
                "flex items-center gap-3 p-3 transition-all border",
                sessionId === session.id 
                  ? "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]" 
                  : "bg-white/5 border-transparent hover:border-white/10 text-white/50"
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span className="truncate text-[10px] font-mono tracking-widest uppercase">{session.title}</span>
            </Link>
          ))}
          {recentSessions.length === 0 && (
            <div className="p-8 text-center glass border-white/5">
              <AlertCircle className="w-4 h-4 mx-auto mb-2 opacity-20" />
              <span className="text-[9px] font-mono uppercase opacity-20">No_Session_Logs_Found</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// Fallback empty export to satisfy potential standard sidebar references
export function AppSidebar() {
  return null;
}