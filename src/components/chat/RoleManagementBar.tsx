import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RoleTagProps {
  name: string;
  tag: string;
}

export function RoleManagementBar() {
  return (
    <div className="border-b p-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <Input
          className="text-lg font-semibold bg-transparent border-none hover:bg-gray-100 dark:hover:bg-gray-800 px-2 max-w-[300px]"
          defaultValue="Project Discussion"
          placeholder="Chat title..."
        />
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <RoleTag name="Developer" tag="dev" />
        <RoleTag name="Product Manager" tag="pm" />
        <RoleTag name="Designer" tag="design" />
      </div>
    </div>
  );
}

function RoleTag({ name, tag }: RoleTagProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm">
      <span className="font-medium text-primary">{name}</span>
      <span className="text-xs text-gray-500">@{tag}</span>
      <button className="ml-1 rounded-full hover:bg-primary/20 p-1">
        <X className="h-3 w-3 text-primary" />
      </button>
    </div>
  );
}