import { Tables } from "@/integrations/supabase/types";
import { Edit, MessageCircle, Trash } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

type UserRoleListItemProps = {
  role: Tables<"roles">;
  onDelete: (id: string) => void;
  onStartChat: (id: string) => void;
  onEdit: (id: string) => void;
};

export const UserRoleListItem = ({ role, onDelete, onStartChat, onEdit }: UserRoleListItemProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <div className="group flex items-center justify-between p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-lg hover:border-primary/50 dark:hover:border-primary/50 transition-colors">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold truncate">{role.name}</h3>
            <Badge variant="outline" className="shrink-0">
              {role.tag}
            </Badge>
          </div>
          {role.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {role.description}
            </p>
          )}
        </div>

        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-gray-200 dark:border-gray-800"
          >
            <Trash className="h-3 w-3" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(role.id)}
            className="text-primary hover:text-primary hover:bg-primary/5 border-gray-200 dark:border-gray-800"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button 
            size="sm"
            onClick={() => onStartChat(role.id)}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <MessageCircle className="h-3 w-3" />
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
    </>
  );
};