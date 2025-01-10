import { AppNavbar } from "@/components/AppNavbar";
import { RoleList } from "@/components/roles/RoleList";
import { Button } from "@/components/ui/button";
import { settingsStore } from "@/stores/settingsStore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";

const Roles = () => {
  const navigate = useNavigate();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Tables<"roles">[];
    }
  });

  const playNotificationSound = () => {
    const settings = settingsStore.getSettings();
    if (settings.soundEnabled) {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(error => {
        console.error("Error playing notification sound:", error);
      });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleStartChat = (id: string) => {
    navigate(`/chats?role=${id}`);
  };

  const handleEdit = (id: string) => {
    // TODO: Implement edit functionality
    console.log('Edit role:', id);
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Roles</h1>
          <Button 
            variant="outline" 
            onClick={playNotificationSound}
            className="ml-2"
          >
            Test Sound
          </Button>
        </div>
        <RoleList 
          roles={roles}
          isLoading={isLoading}
          onDelete={handleDelete}
          onStartChat={handleStartChat}
          onEdit={handleEdit}
        />
      </main>
    </div>
  );
};

export default Roles;