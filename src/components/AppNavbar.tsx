import { LogOut, MessageSquare, Settings, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";

export function AppNavbar() {
  const { signOut } = useAuth();


  return (
    <nav className="border-b border-border/5 bg-white dark:bg-gray-800">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Chatrolando
          </h2>
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