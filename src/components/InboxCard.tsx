import { PotentialEvent } from "@/core/types";
import { EventCard } from "@/components/EventCard";

interface InboxCardProps {
  debugMode: boolean;
  leaks: PotentialEvent[];
  pending: PotentialEvent[];
  allEvents: PotentialEvent[];
  displayEvents: PotentialEvent[];
  dbStats: { totalCount: number; lastStatus: string | null };
  onMarkCovered: (id: number) => void;
  onDiscard: (id: number) => void;
  onDownloadICS: (event: PotentialEvent) => void;
}

export function InboxCard({
  debugMode,
  leaks,
  pending,
  allEvents,
  displayEvents,
  dbStats,
  onMarkCovered,
  onDiscard,
  onDownloadICS,
}: InboxCardProps) {
  return (
    <section className="ea-card">
      <div className="ea-row ea-row--between ea-stack-sm">
        <div className="ea-card__title">
          Bandeja {debugMode && <span style={{ color: "var(--primary)", fontSize: "12px" }}>(DEBUG MODE)</span>}
        </div>
        <div className="ea-badges">
          <span className="ea-badge ea-badge--danger">Fugas {leaks.length}</span>
          <span className="ea-badge">Pendientes {pending.length}</span>
          {debugMode && <span className="ea-badge">Total {allEvents.length}</span>}
        </div>
      </div>

      {debugMode && (
        <div className="ea-debug-panel">
          <div className="ea-debug-stat">
            <span className="ea-debug-label">DB Count:</span>
            <span className="ea-debug-value">{dbStats.totalCount}</span>
          </div>
          <div className="ea-debug-stat">
            <span className="ea-debug-label">Last Status:</span>
            <span className="ea-debug-value">{dbStats.lastStatus || "N/A"}</span>
          </div>
        </div>
      )}

      {displayEvents.length === 0 ? (
        <div className="ea-empty">
          <div className="ea-empty__icon">📭</div>
          <div className="ea-empty__text">
            {debugMode ? "No hay eventos procesados (modo debug)" : "No hay compromisos sin agendar próximos"}
          </div>
        </div>
      ) : (
        <div className="ea-list">
          {displayEvents.map((event: PotentialEvent) => (
            <EventCard
              key={event.id}
              event={event}
              onMarkCovered={onMarkCovered}
              onDiscard={onDiscard}
              onDownloadICS={onDownloadICS}
            />
          ))}
        </div>
      )}
    </section>
  );
}
