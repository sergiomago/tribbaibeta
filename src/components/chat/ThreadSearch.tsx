import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUp, ArrowDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreadSearchProps {
  messages: any[];
  onMatchFound: (messageId: string) => void;
}

export function ThreadSearch({ messages, onMatchFound }: ThreadSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const findMatches = useCallback(() => {
    if (!searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const newMatches = messages
      .filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(msg => msg.id);

    setMatches(newMatches);
    if (newMatches.length > 0 && currentMatchIndex === -1) {
      setCurrentMatchIndex(0);
      onMatchFound(newMatches[0]);
    }
  }, [searchTerm, messages, currentMatchIndex, onMatchFound]);

  useEffect(() => {
    findMatches();
  }, [searchTerm, messages, findMatches]);

  const navigateMatch = (direction: 'next' | 'prev') => {
    if (matches.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentMatchIndex + 1 >= matches.length ? 0 : currentMatchIndex + 1;
    } else {
      newIndex = currentMatchIndex - 1 < 0 ? matches.length - 1 : currentMatchIndex - 1;
    }

    setCurrentMatchIndex(newIndex);
    onMatchFound(matches[newIndex]);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setMatches([]);
    setCurrentMatchIndex(-1);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search in thread..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {matches.length > 0 && (
        <>
          <div className="text-sm text-muted-foreground">
            {currentMatchIndex + 1} of {matches.length}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMatch('prev')}
              className="h-9 w-9"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMatch('next')}
              className="h-9 w-9"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}