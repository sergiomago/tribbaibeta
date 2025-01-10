import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SearchBarProps {
  onResultSelect: (threadId: string, messageId: string) => void;
}

export function SearchBar({ onResultSelect }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["messageSearch", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          thread_id,
          created_at,
          role:roles(name)
        `)
        .textSearch('search_vector', searchQuery)
        .limit(10);
        
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 2,
  });

  return (
    <div className="relative">
      <div className="flex gap-2 p-2">
        <div className="relative flex-1">
          <Input
            type="search"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {searchQuery.length > 2 && (
        <div className="absolute w-full bg-background border rounded-md shadow-lg mt-1 max-h-[300px] overflow-y-auto z-10">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : searchResults?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {searchResults?.map((result) => (
                <Button
                  key={result.id}
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => onResultSelect(result.thread_id, result.id)}
                >
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {result.role?.name || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {result.content}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}