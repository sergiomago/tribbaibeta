import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { Edit, MessageCircle, Trash } from "lucide-react";
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

type RoleCardProps = {
  role: Tables<"roles">;
  onDelete: (id: string) => void;
  onStartChat: (id: string) => void;
  onEdit: (id: string) => void;
};

export const RoleCard = ({ role, onDelete, onStartChat, onEdit }: RoleCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div className="group relative rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-6 transition-all hover:bg-gray-800/50">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-100">
            {role.name}
          </h3>
          {role.alias && (
            <p className="mt-1 text-sm text-gray-400">
              {role.alias}
            </p>
          )}
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {role.tag}
        </span>
      </div>

      {role.description && (
        <p className="mt-2 text-sm text-gray-400 line-clamp-2">
          {role.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {role.model}
        </span>
        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-gray-800"
          >
            <Trash className="mr-2 h-3 w-3" />
            Delete
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(role.id)}
            className="text-primary hover:text-primary hover:bg-primary/5 border-gray-800"
          >
            <Edit className="mr-2 h-3 w-3" />
            Edit
          </Button>
          <Button 
            size="sm"
            onClick={() => onStartChat(role.id)}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <MessageCircle className="mr-2 h-3 w-3" />
            Chat
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-800">Cancel</AlertDialogCancel>
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
    </div>
  );
};