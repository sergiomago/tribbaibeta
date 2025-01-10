import { AppNavbar } from "@/components/AppNavbar";
import { RoleList } from "@/components/roles/RoleList";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Roles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete role: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartChat = async (roleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create a new thread
      const { data: thread, error: threadError } = await supabase
        .from('threads')
        .insert({
          name: "New Chat",
          user_id: user.id
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Add the role to the thread
      const { error: roleError } = await supabase
        .from('thread_roles')
        .insert({
          thread_id: thread.id,
          role_id: roleId,
        });

      if (roleError) throw roleError;

      // Navigate to the new chat
      navigate(`/chats/${thread.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/roles/edit/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Roles</h1>
          <Button 
            onClick={() => navigate('/roles/create')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Role
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