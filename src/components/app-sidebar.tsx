import React, { useEffect, useState } from "react";
import { Home, Layers, Compass, Star, Settings, FileText, Share2, LayoutDashboard, History } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
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
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { chatService } from "@/lib/chat";
import { SessionInfo } from "../../worker/types";
export function AppSidebar(): JSX.Element {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const [recentSessions, setRecentSessions] = useState<SessionInfo[]>([]);
  useEffect(() => {
    const loadSessions = async () => {
      const result = await chatService.listSessions();
      if (result.success && result.data) {
        setRecentSessions(result.data.slice(0, 5));
      }
    };
    loadSessions();
  }, [sessionId]);
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500" />
          <span className="text-sm font-bold tracking-tight">ArchLens Engine</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={!sessionId}>
                <Link to="/"><Home className="w-4 h-4" /> <span>Landing</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {sessionId && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/dashboard'}>
                    <Link to={`/dashboard?session=${sessionId}`}><LayoutDashboard className="w-4 h-4" /> <span>Dashboard</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/studio'}>
                    <Link to={`/studio?session=${sessionId}`}><FileText className="w-4 h-4" /> <span>Doc Studio</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Recent Scans</SidebarGroupLabel>
          <SidebarMenu>
            {recentSessions.map((session) => (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton asChild isActive={sessionId === session.id}>
                  <Link to={`/dashboard?session=${session.id}`}>
                    <History className="w-4 h-4" /> 
                    <span className="truncate">{session.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {recentSessions.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground italic">No recent scans</div>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-4 text-[10px] text-muted-foreground/60 leading-tight">
          ArchLens v1.0.0<br />
          Cloudflare Durable Objects Enabled
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}