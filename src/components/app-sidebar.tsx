import React, { useEffect, useState } from "react";
import { Home, FileText, LayoutDashboard, History, Settings, ShieldCheck, PlusCircle, Code2, Globe, FileJson, AlertCircle } from "lucide-react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { chatService } from "@/lib/chat";
import { SessionInfo } from "../../worker/types";
import { cn } from "@/lib/utils";
export function AppSidebar(): JSX.Element {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const sessionId = searchParams.get('session');
  const [recentSessions, setRecentSessions] = useState<SessionInfo[]>([]);
  useEffect(() => {
    const loadSessions = async () => {
      const result = await chatService.listSessions();
      if (result.success && result.data) {
        setRecentSessions(result.data.slice(0, 15));
      }
    };
    loadSessions();
  }, [sessionId, location.pathname]);
  const isHome = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard';
  const isStudio = location.pathname === '/studio';
  const isSettings = location.pathname === '/settings';
  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-glow flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black tracking-tight uppercase">ArchLens</span>
          </Link>
        </div>
        <Link to="/">
          <Button variant="outline" className="w-full justify-start gap-2 border-dashed h-9 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-xs font-bold transition-all">
            <PlusCircle className="w-4 h-4 text-primary" />
            New Repository
          </Button>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Core Operations</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isHome} className={cn("transition-all", isHome && "bg-primary/10 text-primary font-bold")}>
                <Link to="/"><Home className="w-4 h-4" /> <span>Landing</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {sessionId && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isDashboard} className={cn("transition-all", isDashboard && "bg-primary/10 text-primary font-bold")}>
                    <Link to={`/dashboard?session=${sessionId}`}><LayoutDashboard className="w-4 h-4" /> <span>Dashboard</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isStudio} className={cn("transition-all", isStudio && "bg-primary/10 text-primary font-bold")}>
                    <Link to={`/studio?session=${sessionId}`}><FileText className="w-4 h-4" /> <span>Doc Studio</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isSettings} className={cn("transition-all", isSettings && "bg-primary/10 text-primary font-bold")}>
                    <Link to={`/settings?session=${sessionId}`}><Settings className="w-4 h-4" /> <span>Settings</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator className="opacity-40" />
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Recent History</SidebarGroupLabel>
          <SidebarMenu>
            {recentSessions.map((session) => (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton 
                  asChild 
                  isActive={sessionId === session.id}
                  className={cn(
                    "transition-all h-9",
                    sessionId === session.id ? "bg-accent/50 text-foreground font-bold" : "hover:bg-muted/50"
                  )}
                >
                  <Link to={`/dashboard?session=${session.id}`} className="flex items-center gap-2">
                    <History className={cn("w-4 h-4", sessionId === session.id ? "text-primary" : "text-muted-foreground/50")} />
                    <span className="truncate text-xs">{session.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {recentSessions.length === 0 && (
              <div className="px-3 py-4 text-[10px] text-muted-foreground/40 italic text-center flex flex-col items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No scan history available
              </div>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/40 bg-muted/5">
        <div className="flex flex-col gap-3">
           <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500/80 tracking-widest uppercase">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             RIE Engine Active
           </div>
           <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground/40 tracking-widest uppercase">
             <ShieldCheck className="w-3 h-3" /> System Stable v1.0.4
           </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}