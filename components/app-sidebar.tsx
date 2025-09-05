"use client"

import type * as React from "react"
import { BarChart3, BookOpen, Key, User, CreditCard, Receipt, LogOut, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

// Navigation items based on the specification
const data = {
  navMain: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: BarChart3,
        },
        {
          title: "Get Started",
          url: "https://docs.ifalabs.com",
          target: "_blank",
          icon: BookOpen,
        },
        {
          title: "Status",
          url: "/status",
          target: "_blank",
          icon: BarChart3,
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          title: "API Keys",
          url: "/api-keys",
          icon: Key,
        },
        {
          title: "Account",
          url: "/account",
          icon: User,
        },
      ],
    },
    {
      title: "Billing",
      items: [
        {
          title: "Plan",
          url: "/plan",
          icon: CreditCard,
        },
        {
          title: "Billing",
          url: "/billing",
          icon: Receipt,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout, user } = useAuth()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
            <img src="/ifa.png" alt="IFA Labs" className="w-full h-full object-cover" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">IFA Labs Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a 
                        href={item.url}
                        {...(item.target && { target: item.target })}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="p-1">
          <ThemeToggle />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
