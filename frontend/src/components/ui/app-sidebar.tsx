import { Wallet, LayoutDashboard, History, Settings, ShieldCheck, Search, Briefcase, Building, Users, AlertCircle } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Input } from "./input"
import { useAuth } from "@/app/contexts/AuthContext"
import { ScrollArea } from "@/components/ui/scroll-area"



// MENU for all users
const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Wallet },
  { title: "Portfolio", url: "/portfolio", icon: Briefcase },
  { title: "Business Units", url: "/business-units", icon: Building },
  { title: "Transactions", url: "#", icon: History },
  { title: "Security", url: "#", icon: ShieldCheck },
  { title: "Settings", url: "#", icon: Settings },
]

// ADMIN ONLY menu
const adminControlItems = [
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Withdrawals", url: "/admin/withdrawal-requests", icon: AlertCircle },
  { title: "Business Units", url: "/admin/business-units", icon: Building },
  { title: "Transactions", url: "#", icon: History },
  { title: "Settings", url: "#", icon: Settings },
]

export function AppSidebar() {
  const { user } = useAuth()

  return (
     <Sidebar className="border-r border-border bg-sidebar flex flex-col h-full">
      <SidebarHeader className="gap-6 px-4 py-8 flex-shrink-0">
        
        {/* LOGO & BRANDING */}
        <div className="flex items-center gap-4 px-2">
          {/* Glowing square icon */}
          <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg rotate-12 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-transform hover:rotate-0 duration-300" />
          
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 leading-none">
              CORE ENGINE
              <span className="text-purple-500 text-[10px] font-mono ml-1 align-top opacity-80">
                v1.0
              </span>
            </h1>
            <span className="text-[9px] text-muted tracking-[0.2em] uppercase mt-1 font-medium opacity-50">
              Systems Interface
            </span>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative group px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40 group-focus-within:text-purple-500 group-focus-within:opacity-100 transition-all" />
          <Input 
            placeholder="Search core..." 
            className="pl-10 bg-black/40 border-white/5 text-[11px] h-10 focus-visible:ring-purple-500/50 rounded-lg placeholder:text-muted/50"
          />
        </div>

      </SidebarHeader>

      {/* MAIN MENU CONTENT */}
      <ScrollArea className="flex-1">
      <SidebarContent>
        {/* MENU SECTION - Show for everyone */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-muted font-mono text-[10px] tracking-widest uppercase">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="hover:bg-primary/10 hover:text-primary transition-all py-6 px-4">
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 opacity-70 group-hover:opacity-100" />
                      <span className="font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ADMIN CONTROL SECTION - Only show for ADMIN */}
        {user?.role === 'ADMIN' && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-muted font-mono text-[10px] tracking-widest uppercase">
              Admin Control
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-2">
              <SidebarMenu>
                {adminControlItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="hover:bg-primary/10 hover:text-primary transition-all py-6 px-4">
                      <a href={item.url} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 opacity-70 group-hover:opacity-100" />
                        <span className="font-medium">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      </ScrollArea>
    </Sidebar>
  )
}