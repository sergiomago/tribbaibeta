import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatLayout } from "@/components/chat/ChatLayout";

const Index = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <ChatLayout />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;