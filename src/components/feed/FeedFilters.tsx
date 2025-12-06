import { cn } from "@/lib/utils";

type FilterChip = "all" | "player" | "match" | "events" | "trending";

interface FeedFiltersProps {
  activeFilter: FilterChip;
  onFilterChange: (filter: FilterChip) => void;
}

const filters: { value: FilterChip; label: string }[] = [
  { value: "all", label: "All" },
  { value: "player", label: "Player Highlights" },
  { value: "match", label: "Match Highlights" },
  { value: "events", label: "Latest Events" },
  { value: "trending", label: "Trending" },
];

export function FeedFilters({ activeFilter, onFilterChange }: FeedFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            activeFilter === filter.value
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
