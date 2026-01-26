import { PotentialEvent } from "@/core/types";

type Status = "leak" | "pending" | "covered" | "expired" | "discarded";
type Confidence = "high" | "medium" | "low";

interface EventCardProps {
  event: PotentialEvent;
  onMarkCovered: (id: number) => void;
  onDiscard: (id: number) => void;
  onDownloadICS: (event: PotentialEvent) => void;
}

const statusLabel: Record<Status, string> = {
  leak: "Fuga",
  pending: "Pendiente",
  covered: "Cubierto",
  expired: "Vencido",
  discarded: "Descartado",
};

function badgeClass(status: Status) {
  if (status === "leak") return "ea-badge ea-badge--danger";
  if (status === "covered") return "ea-badge ea-badge--ok";
  if (status === "expired" || status === "discarded") return "ea-badge ea-badge--muted";
  return "ea-badge";
}

function badgeClassConfidence(c: Confidence) {
  if (c === "high") return "ea-badge ea-badge--ok";
  if (c === "low") return "ea-badge ea-badge--muted";
  return "ea-badge";
}

function confLabel(c: Confidence) {
  if (c === "high") return "Alta";
  if (c === "medium") return "Media";
  return "Baja";
}

export function EventCard({
  event,
  onMarkCovered,
  onDiscard,
  onDownloadICS
}: EventCardProps) {
  const dateStr = event.detected_start.toLocaleDateString('es-ES', {
    weekday: 'short',
    month: '2-digit',
    day: '2-digit'
  });
  
  const timeStr = event.has_time
    ? event.detected_start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '(sin hora)';
  
  const dateLabel = `${dateStr} ${timeStr}`;

  return (
    <article className="ea-card ea-event">
      <div className="ea-row ea-row--between">
        <div className="ea-event__meta">
          <div className="ea-event__summary">{event.summary}</div>
          <div className="ea-event__date">{dateLabel}</div>
        </div>
        <div className="ea-badges">
          <span className={badgeClass(event.status)}>{statusLabel[event.status]}</span>
          <span className={badgeClassConfidence(event.confidence)}>{confLabel(event.confidence)}</span>
        </div>
      </div>
      <div className="ea-row ea-event__actions ea-event__actions--responsive">
        <button className="ea-btn ea-btn--ghost" type="button" onClick={() => onMarkCovered(event.id!)}>
          Marcar cubierto
        </button>
        <button className="ea-btn ea-btn--ghost" type="button" onClick={() => onDiscard(event.id!)}>
          Descartar
        </button>
        <button className="ea-btn ea-btn--primary" type="button" onClick={() => onDownloadICS(event)}>
          Descargar ICS
        </button>
      </div>
    </article>
  );
}