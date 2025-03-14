import { LogOut, MessageSquare, Settings, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";

export function AppNavbar() {
  const { signOut } = useAuth();

  const menuItems = [
    {
      title: "Roles",
      icon: User,
      url: "/",
    },
    {
      title: "Chats",
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
    <nav className="border-b border-border/5 bg-white dark:bg-gray-800">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Chatrolando
          </h2>
          <div className="flex items-center gap-4">
            {menuItems.map((item) => (
              <a
                key={item.title}
                href={item.url}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </nav>
  );
}