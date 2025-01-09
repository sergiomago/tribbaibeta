import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LogOut, MessageSquare, Settings, User, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";

export function AppSidebar() {
  const { signOut } = useAuth();

  const menuItems = [
    {
      title: "Roles",
      icon: User,
      url: "/",
    },
    {
      title: "Team Chats",
      icon: Users,
      url: "/team-chats",
    },
    {
      title: "Individual Chats",
      icon: MessageSquare,
      url: "/chats",
    },
    {
      title: "Settings",
      icon: Settings,
      url: "/settings",
    },
  ];

  return (
    <Sidebar className="h-14 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarContent className="flex h-full flex-row items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Chatrolando
          </h2>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="flex flex-row items-center gap-1">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={item.url}
                        className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="sr-only">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </SidebarContent>
    </Sidebar>
  );
}