import { Button } from "@/components/ui/button";
import { Grid, List, ArrowDown, ArrowUp, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortOption = 'role-asc' | 'role-desc' | 'date-new' | 'date-old';
type ViewMode = 'grid' | 'list';

type RoleControlsProps = {
  sortOption: SortOption;
  viewMode: ViewMode;
  onSortChange: (option: SortOption) => void;
  onViewModeChange: (mode: ViewMode) => void;
};

export const RoleControls = ({ 
  sortOption, 
  viewMode, 
  onSortChange, 
  onViewModeChange 
}: RoleControlsProps) => {
  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {sortOption === 'role-asc' && <ArrowUp className="mr-2" />}
            {sortOption === 'role-desc' && <ArrowDown className="mr-2" />}
            {sortOption === 'date-new' && <Calendar className="mr-2" />}
            {sortOption === 'date-old' && <Calendar className="mr-2" />}
            Sort by
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onSortChange('role-asc')}>
            Role (A-Z)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange('role-desc')}>
            Role (Z-A)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange('date-new')}>
            Newest First
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange('date-old')}>
            Oldest First
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button 
        variant="outline"
        size="sm"
        onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
      >
        {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
      </Button>
    </div>
  );
};