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
    <div className="group relative rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm p-6 transition-all hover:shadow-lg hover:bg-white">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {role.name}
          </h3>
          {role.alias && (
            <p className="mt-1 text-sm text-gray-600">
              {role.alias}
            </p>
          )}
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {role.tag}
        </span>
      </div>

      {role.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
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
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <Trash className="mr-2 h-3 w-3" />
            Delete
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(role.id)}
            className="text-primary hover:text-primary-hover hover:bg-primary/5 border-primary/20"
          >
            <Edit className="mr-2 h-3 w-3" />
            Edit
          </Button>
          <Button 
            size="sm"
            onClick={() => onStartChat(role.id)}
            className="bg-gradient-primary text-white hover:opacity-90"
          >
            <MessageCircle className="mr-2 h-3 w-3" />
            Chat
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(role.id);
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};