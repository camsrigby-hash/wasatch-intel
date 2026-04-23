import { AppHeader } from "./AppHeader";

export function AppShell({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <AppHeader />
      <main className={padded ? "flex-1 overflow-auto" : "flex-1 min-h-0 relative"}>
        {children}
      </main>
    </div>
  );
}
