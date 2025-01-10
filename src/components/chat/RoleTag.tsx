interface RoleTagProps {
  role: {
    id: string;
    name: string;
    tag: string;
  };
  onRemove: () => void;
}

export function RoleTag({ role, onRemove }: RoleTagProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full animate-fade-in group hover:bg-primary/15 transition-colors">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-primary">{role.name}</span>
        <span className="text-xs text-muted-foreground">@{role.tag}</span>
      </div>
      <button
        className="ml-1 rounded-full p-1 hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100"
        onClick={onRemove}
        aria-label="Remove role"
      >
        <svg
          className="h-3 w-3 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}