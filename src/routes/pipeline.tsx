import { useState, useRef, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { DEAL_STAGES, type Deal, type DealStage, type ApiEnvelope } from "@/lib/types";
import {
  useDeals,
  useCreateDeal,
  useUpdateDeal,
  useDeleteDeal,
  useDealNotes,
  useCreateDealNote,
  useDealContacts,
  useCreateDealContact,
} from "@/lib/api-client";
import {
  Mail,
  Phone,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Wasatch Intel" },
      { name: "description", content: "Kanban-style deal pipeline for land development opportunities." },
      { property: "og:title", content: "Pipeline — Wasatch Intel" },
      { property: "og:description", content: "Manage your land deals from prospect to close." },
    ],
  }),
  component: PipelinePage,
});

const STAGE_TONE: Record<DealStage, string> = {
  "Prospect":       "border-muted-foreground/30",
  "Diligence":      "border-[var(--color-signal-med)]",
  "LOI":            "border-primary",
  "Under Contract": "border-[var(--color-opportunity)]",
  "Closed/Dead":    "border-muted-foreground/20",
};

// ── Page ─────────────────────────────────────────────────────────────────────

function PipelinePage() {
  const { data: env, isLoading } = useDeals();
  const deals: Deal[] = env?.data ?? [];

  const updateDeal = useUpdateDeal();
  const qc         = useQueryClient();

  const [activeId,     setActiveId]     = useState<string | null>(null);
  const [newDealOpen,  setNewDealOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const dealId   = active.id as string;
    const newStage = over.id  as DealStage;
    const deal     = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    qc.setQueryData<ApiEnvelope<Deal[]>>(["deals"], (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((d) =>
          d.id === dealId ? { ...d, stage: newStage, updatedAt: new Date().toISOString() } : d,
        ),
      };
    });

    updateDeal.mutate(
      { id: dealId, patch: { stage: newStage } },
      {
        onError: () => {
          // Revert
          qc.setQueryData<ApiEnvelope<Deal[]>>(["deals"], (old) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.map((d) =>
                d.id === dealId ? { ...d, stage: deal.stage } : d,
              ),
            };
          });
        },
      },
    );
  }

  return (
    <AppShell>
      <div className="h-full flex flex-col">
        <header className="px-6 pt-6 pb-3 flex items-center justify-between border-b border-border">
          <div>
            <h1 className="text-xl font-semibold">Pipeline</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading
                ? "Loading…"
                : `${deals.length} active deal${deals.length !== 1 ? "s" : ""} · ${DEAL_STAGES.length} stages`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Mail className="h-3.5 w-3.5" /> Outreach templates
            </Button>
            <Button size="sm" onClick={() => setNewDealOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New deal
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-x-auto p-4">
          {isLoading ? (
            <div className="flex gap-3">
              {DEAL_STAGES.map((s) => (
                <Skeleton key={s} className="h-48 w-[280px] shrink-0 rounded-lg" />
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-flow-col auto-cols-[280px] gap-3 h-full">
                {DEAL_STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    deals={deals.filter((d) => d.stage === stage)}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
              </DragOverlay>
            </DndContext>
          )}

          {!isLoading && deals.length === 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground max-w-md mx-auto">
              No active deals. Create one from a parcel deep-dive or click "+ New deal" above.
            </div>
          )}
        </div>
      </div>

      <NewDealDialog open={newDealOpen} onOpenChange={setNewDealOpen} />
      <DeleteDealDialog deal={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </AppShell>
  );
}

// ── Kanban column (droppable) ─────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  onDelete,
}: {
  stage: DealStage;
  deals: Deal[];
  onDelete: (d: Deal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-t-2 ${STAGE_TONE[stage]} bg-muted/30 flex flex-col min-h-0 transition-colors ${isOver ? "bg-muted/60" : ""}`}
    >
      <div className="px-3 py-2.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-tight">{stage}</h3>
        <Badge variant="outline" className="text-[10px] h-5">
          {deals.length}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {deals.length === 0 && (
          <div className="px-2 py-4 text-[11px] text-muted-foreground text-center">
            No deals in {stage}
          </div>
        )}
        {deals.map((d) => (
          <DraggableDealCard key={d.id} deal={d} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ── Draggable wrapper ─────────────────────────────────────────────────────────

function DraggableDealCard({ deal, onDelete }: { deal: Deal; onDelete: (d: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:   deal.id,
    data: { stage: deal.stage },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-40" : ""}
    >
      <DealCard deal={deal} onDelete={onDelete} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ── Deal card ─────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  onDelete,
  dragHandleProps,
  isDragging,
}: {
  deal: Deal;
  onDelete?: (d: Deal) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={`bg-card border border-border rounded-md p-2.5 hover:shadow-sm hover:border-primary/30 transition-all ${isDragging ? "shadow-lg ring-1 ring-primary/40" : ""}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] text-muted-foreground truncate">{deal.parcelApn}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          {onDelete && (
            <button
              className="h-5 w-5 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(deal)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="text-xs font-medium mt-1">{deal.jurisdiction || "—"}</div>
      {deal.acres != null && (
        <div className="text-[10px] text-muted-foreground">{deal.acres} ac</div>
      )}
      {deal.residualLandValue != null && (
        <div className="font-mono text-sm font-semibold mt-1">
          ${(deal.residualLandValue / 1000).toFixed(0)}k
        </div>
      )}
      {deal.notes && (
        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{deal.notes}</p>
      )}

      {/* Footer row */}
      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-1">
        <span className="text-[10px] text-muted-foreground truncate">→ {deal.nextAction || "No next action"}</span>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {deal.updatedAt ? formatDistanceToNow(new Date(deal.updatedAt)) : ""}
        </span>
      </div>

      {/* Action icons + expand toggle */}
      <div className="flex items-center gap-1 mt-1.5">
        {deal.contact && (
          <>
            <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground">
              <Mail className="h-3 w-3" />
            </button>
            <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground">
              <Phone className="h-3 w-3" />
            </button>
          </>
        )}
        <button className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground">
          <FileText className="h-3 w-3" />
        </button>
        {deal.contact && (
          <span className="ml-1 text-[10px] text-muted-foreground truncate flex-1">{deal.contact}</span>
        )}
        <button
          className="ml-auto h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Expanded panels */}
      {expanded && <DealPanels deal={deal} />}
    </article>
  );
}

// ── Expanded notes + contacts panels ─────────────────────────────────────────

function DealPanels({ deal }: { deal: Deal }) {
  const { data: notesEnv }    = useDealNotes(deal.id);
  const { data: contactsEnv } = useDealContacts(deal.id);
  const createNote    = useCreateDealNote();
  const createContact = useCreateDealContact();

  const notes    = notesEnv?.data    ?? [];
  const contacts = contactsEnv?.data ?? [];

  // Auto-save inline note after 1s idle
  const updateDeal   = useUpdateDeal();
  const [noteText, setNoteText] = useState(deal.notes);
  const saveTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNoteSave = useCallback(
    (value: string) => {
      setNoteText(value);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateDeal.mutate({ id: deal.id, patch: { notes: value } });
      }, 1000);
    },
    [deal.id, updateDeal],
  );

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // New contact mini-form state
  const [addContact, setAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");

  function submitContact() {
    if (!contactName.trim()) return;
    createContact.mutate({ dealId: deal.id, name: contactName.trim(), role: contactRole.trim() });
    setContactName("");
    setContactRole("");
    setAddContact(false);
  }

  return (
    <div className="mt-2 pt-2 border-t border-border space-y-3">
      {/* Notes */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Notes</div>
        <textarea
          className="w-full rounded border border-border bg-background p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          rows={3}
          value={noteText}
          onChange={(e) => scheduleNoteSave(e.target.value)}
          placeholder="Add a note…"
        />
        {notes.length > 0 && (
          <div className="mt-1 space-y-1">
            {notes.slice(0, 3).map((n) => (
              <div key={n.id} className="text-[10px] text-muted-foreground border-l-2 border-muted pl-2">
                {n.body}
              </div>
            ))}
          </div>
        )}
        <button
          className="mt-1 text-[10px] text-primary hover:underline"
          onClick={() => {
            const body = noteText.trim();
            if (!body) return;
            createNote.mutate({ dealId: deal.id, body });
          }}
        >
          Save to history
        </button>
      </div>

      {/* Contacts */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-between">
          Contacts
          <button onClick={() => setAddContact((a) => !a)}>
            <UserPlus className="h-3 w-3" />
          </button>
        </div>
        {contacts.length === 0 && !addContact && (
          <p className="text-[10px] text-muted-foreground">No contacts yet.</p>
        )}
        {contacts.map((c) => (
          <div key={c.id} className="text-[10px] flex items-center gap-1.5">
            <span className="font-medium">{c.name}</span>
            {c.role && <span className="text-muted-foreground">· {c.role}</span>}
          </div>
        ))}
        {addContact && (
          <div className="mt-1 space-y-1">
            <input
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <input
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Role (optional)"
              value={contactRole}
              onChange={(e) => setContactRole(e.target.value)}
            />
            <div className="flex gap-1">
              <button
                className="text-[10px] text-primary hover:underline"
                onClick={submitContact}
              >
                Add
              </button>
              <button
                className="text-[10px] text-muted-foreground hover:underline"
                onClick={() => setAddContact(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New deal dialog ───────────────────────────────────────────────────────────

export function NewDealDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: Partial<{ parcelApn: string; jurisdiction: string; acres: number | null }>;
}) {
  const createDeal = useCreateDeal();

  const [apn,          setApn]          = useState(prefill?.parcelApn   ?? "");
  const [jurisdiction, setJurisdiction] = useState(prefill?.jurisdiction ?? "");
  const [stage,        setStage]        = useState<DealStage>("Prospect");
  const [nextAction,   setNextAction]   = useState("");
  const [notes,        setNotes]        = useState("");

  // Sync prefill when it changes (e.g. opened from ParcelDeepDive)
  useEffect(() => {
    if (open) {
      setApn(prefill?.parcelApn ?? "");
      setJurisdiction(prefill?.jurisdiction ?? "");
      setStage("Prospect");
      setNextAction("");
      setNotes("");
    }
  }, [open, prefill?.parcelApn, prefill?.jurisdiction]);

  function submit() {
    if (!apn.trim()) return;
    createDeal.mutate(
      {
        parcelApn:    apn.trim(),
        jurisdiction: jurisdiction.trim(),
        stage,
        acres:        prefill?.acres ?? null,
        nextAction:   nextAction.trim(),
        notes:        notes.trim(),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Parcel APN">
            <input
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="00-000-0-0000"
              value={apn}
              onChange={(e) => setApn(e.target.value)}
            />
          </Field>
          <Field label="Jurisdiction">
            <input
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. Erda"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </Field>
          <Field label="Stage">
            <select
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Next action">
            <input
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. Call planning dept"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="Initial notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={!apn.trim() || createDeal.isPending}>
            {createDeal.isPending ? "Creating…" : "Create deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteDealDialog({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const deleteDeal = useDeleteDeal();

  return (
    <AlertDialog open={deal != null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move deal to Closed/Dead?</AlertDialogTitle>
          <AlertDialogDescription>
            Parcel {deal?.parcelApn} in {deal?.jurisdiction} will be soft-deleted (stage → Closed/Dead)
            and removed from the active board. This can be undone by editing the deal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!deal) return;
              deleteDeal.mutate(deal.id, { onSuccess: onClose });
            }}
          >
            Close deal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
