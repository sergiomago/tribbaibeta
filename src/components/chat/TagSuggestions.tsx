import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Role } from '@/types/role';

interface TagSuggestionsProps {
  roles: Role[];
  visible: boolean;
  selectedIndex: number;
  onSelect: (role: Role) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  cursorPosition?: { top: number; left: number };
  inputRef: React.RefObject<HTMLInputElement>;
  filterText?: string;
}

export function TagSuggestions({
  roles,
  visible,
  selectedIndex,
  onSelect,
  onKeyDown,
  cursorPosition,
  inputRef,
  filterText = '',
}: TagSuggestionsProps) {
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const isMobile = window.innerWidth <= 768;

  // Filter roles based on input after @
  const filteredRoles = roles.filter(role => 
    !filterText || 
    role.tag.toLowerCase().includes(filterText.toLowerCase()) ||
    role.name.toLowerCase().includes(filterText.toLowerCase())
  );

  useEffect(() => {
    if (!visible || !suggestionsRef.current || !inputRef.current) return;

    if (isMobile) {
      // Position above the keyboard on mobile
      suggestionsRef.current.style.bottom = '60px';
      suggestionsRef.current.style.left = '0';
      suggestionsRef.current.style.right = '0';
    } else if (cursorPosition) {
      // Position below cursor on desktop
      const inputRect = inputRef.current.getBoundingClientRect();
      const top = cursorPosition.top + 24;
      const left = Math.min(
        cursorPosition.left,
        inputRect.right - 200 // Ensure suggestions don't overflow
      );
      
      suggestionsRef.current.style.top = `${top}px`;
      suggestionsRef.current.style.left = `${left}px`;
    }
  }, [visible, cursorPosition, isMobile, inputRef, filterText]);

  if (!visible || filteredRoles.length === 0) return null;

  return (
    <div
      ref={suggestionsRef}
      className={cn(
        "absolute z-50 w-[200px] max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 shadow-md",
        isMobile && "fixed w-full max-w-[100vw] mx-auto left-0 right-0 bottom-[60px]"
      )}
      onKeyDown={onKeyDown}
    >
      {filteredRoles.map((role, index) => (
        <button
          key={role.id}
          className={cn(
            "w-full text-left px-2 py-3 text-sm rounded-sm hover:bg-accent",
            selectedIndex === index && "bg-accent",
            "min-h-[44px]"
          )}
          onClick={() => onSelect(role)}
        >
          <div className="font-medium">{role.name}</div>
          <div className="text-xs text-muted-foreground">@{role.tag}</div>
        </button>
      ))}
    </div>
  );
}