import { Tables } from "@/integrations/supabase/types";
import { Edit, MessageCircle, Trash, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { BaseRoleCard } from "./BaseRoleCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useThreadMutations } from "@/hooks/useThreadMutations";
import { useRoleMind } from "@/hooks/useRoleMind";
import { useToast } from "@/hooks/use-toast";

type UserRoleCardProps = {
  role: Tables<"roles">;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
};

interface Thread {
  id: string;
  name: string;
}

export const UserRoleCard = ({ role, onDelete, onEdit }: UserRoleCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createThread } = useThreadMutations();
  const { recreateMind } = useRoleMind(role.id);
  const { toast } = useToast();

  const handleStartChat = async () => {
    if (!user) return;
    
    createThread.mutate(
      { userId: user.id, roleId: role.id },
      {
        onSuccess: (thread: Thread) => {
          navigate(`/chats?thread=${thread.id}`);
        },
      }
    );
  };

  const handleRecreateMind = async () => {
    try {
      await recreateMind(role.id);
      toast({
        title: "Mind recreation started",
        description: "The role's mind is being recreated. This may take a moment.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to recreate mind. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <BaseRoleCard role={role}>
      <div className="absolute inset-x-0 bottom-4 px-6">
        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-gray-200 dark:border-gray-800"
          >
            <Trash className="h-3 w-3 mr-2" />
            Delete
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(role.id)}
            className="flex-1 text-primary hover:text-primary hover:bg-primary/5 border-gray-200 dark:border-gray-800"
          >
            <Edit className="h-3 w-3 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRecreateMind}
            className="flex-1 text-primary hover:text-primary hover:bg-primary/5 border-gray-200 dark:border-gray-800"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Recreate Mind
          </Button>
          <Button 
            size="sm"
            onClick={handleStartChat}
            disabled={createThread.isPending}
            className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <MessageCircle className="h-3 w-3 mr-2" />
            Chat
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 dark:border-gray-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(role.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseRoleCard>
  );
};