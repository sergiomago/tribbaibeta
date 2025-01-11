import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { Edit, MessageCircle, Trash, ChevronDown, ChevronUp } from "lucide-react";
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
  isTemplate?: boolean;
};

export const RoleCard = ({ role, onDelete, onStartChat, onEdit, isTemplate }: RoleCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="group relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-6 transition-all hover:bg-white/70 dark:hover:bg-gray-800/70 shadow-sm hover:shadow-md">
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {role.name}
            </h3>
            {role.alias && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {role.alias}
              </p>
            )}
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {role.tag}
          </span>
        </div>

        {role.description && (
          <div className="mb-4">
            <p className={`text-sm text-gray-600 dark:text-gray-300 ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {role.description}
            </p>
            {role.description.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-auto p-0 text-xs text-primary hover:bg-transparent hover:text-primary/80"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        )}

        {!isTemplate && (
          <div className="mt-auto flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-gray-200 dark:border-gray-800"
            >
              <Trash className="h-3 w-3 mr-2" />
              Delete
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(role.id)}
              className="text-primary hover:text-primary hover:bg-primary/5 border-gray-200 dark:border-gray-800"
            >
              <Edit className="h-3 w-3 mr-2" />
              Edit
            </Button>
            <Button 
              size="sm"
              onClick={() => onStartChat(role.id)}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              <MessageCircle className="h-3 w-3 mr-2" />
              Chat
            </Button>
          </div>
        )}
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
    </div>
  );
};