'use client';

import { Wallet, LayoutDashboard, History, Settings, ShieldCheck, Search, Briefcase, Building, Users, AlertCircle, PieChart } from "lucide-react"
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

// Base menu items (without Transactions URL – will be set dynamically)
const baseMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Wallet },
  { title: "Portfolio", url: "/portfolio", icon: Briefcase },
  { title: "Business Units", url: "/business-units", icon: Building },
  { title: "Funds", url: "/funds", icon: PieChart },
  // Transactions will be added conditionally
  { title: "Security", url: "#", icon: ShieldCheck },
  { title: "Settings", url: "#", icon: Settings },
]

// Admin-only menu items (with correct Transactions link)
const adminControlItems = [
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Withdrawals", url: "/admin/withdrawal-requests", icon: AlertCircle },
  { title: "Business Units", url: "/admin/business-units", icon: Building },
  { title: "Transactions", url: "/admin/transactions", icon: History },
  { title: "Settings", url: "#", icon: Settings },
]

export function AppSidebar() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // Build menu items with correct Transactions link based on role
  const menuItems = [
    ...baseMenuItems.slice(0, 4), // Dashboard, Accounts, Portfolio, Business Units
    {
      title: "Transactions",
      url: isAdmin ? "/admin/transactions" : "/transactions",
      icon: History,
    },
    ...baseMenuItems.slice(4), // Security, Settings
  ]

return (
    <Sidebar className="border-r border-border bg-sidebar flex flex-col h-full">
      {/* 1. FIXED HEADER: Logo and Search (will not scroll) */}
      <SidebarHeader className="gap-6 px-4 py-8 flex-shrink-0">
        <div className="flex items-center gap-4 px-2">
          <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg rotate-12 shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 leading-none">
              CORE ENGINE
            </h1>
          </div>
        </div>

        <div className="relative group px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40" />
          <Input 
            placeholder="Search core..." 
            className="pl-10 bg-black/40 border-white/5 text-[11px] h-10 rounded-lg"
          />
        </div>
      </SidebarHeader>

      {/* 2. SCROLLABLE CONTENT AREA */}
      <div className="flex-1 min-h-0"> {/* min-h-0 is essential for the scroll to work in flex */}
        <ScrollArea className="h-full">
          <SidebarContent>
            {/* MENU SECTION */}
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
                          <item.icon className="h-5 w-5 opacity-70" />
                          <span className="font-medium">{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* ADMIN CONTROL SECTION */}
            {isAdmin && (
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
                            <item.icon className="h-5 w-5 opacity-70" />
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
      </div>
    </Sidebar>
  )
}