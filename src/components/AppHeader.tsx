import { Link, useRouterState } from "@tanstack/react-router";
import { Search, Map, Rss, FileText, Building2, Bookmark, Kanban, SlidersHorizontal, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TABS: { to: string; label: string; icon: typeof Map; exact?: boolean }[] = [
  { to: "/", label: "Map", icon: Map, exact: true },
  { to: "/feed", label: "Feed", icon: Rss },
  { to: "/agendas", label: "Agendas", icon: FileText },
  { to: "/developers", label: "Developers", icon: Building2 },
  { to: "/watchlists", label: "Watchlists", icon: Bookmark },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/search", label: "Search", icon: SlidersHorizontal },
];

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-12 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-[11px] font-semibold">
            U
          </div>
          <span className="text-sm font-semibold tracking-tight">Wasatch Intel</span>
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest hidden sm:inline">v0.1</span>
        </Link>

        <div className="relative flex-1 max-w-2xl mx-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search parcels, addresses, applicants, transcripts…"
            className="h-8 pl-8 text-xs bg-muted/50 border-transparent focus-visible:bg-background"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-signal-high)]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className="flex items-center gap-px px-2 -mt-px overflow-x-auto">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "group inline-flex items-center gap-1.5 px-3 h-9 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
