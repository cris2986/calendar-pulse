import { CalendarEvent } from "@/core/types";

interface CalendarModalProps {
  calendarEvents: CalendarEvent[];
  onClose: () => void;
  onClearCalendar: () => Promise<void>;
}

export function CalendarModal({
  calendarEvents,
  onClose,
  onClearCalendar,
}: CalendarModalProps) {
  return (
    <div className="ea-modal-backdrop" onClick={onClose}>
      <div className="ea-modal" onClick={e => e.stopPropagation()}>
        <div className="ea-modal__header">
          <div className="ea-modal__title">Eventos importados</div>
          <button className="ea-modal__close" onClick={onClose}>×</button>
        </div>
        <div className="ea-modal__content">
          <div className="ea-row ea-row--between">
            <span className="ea-label">{calendarEvents.length} eventos</span>
            {calendarEvents.length > 0 && (
              <button className="ea-btn ea-btn--ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={onClearCalendar}>
                Borrar todo
              </button>
            )}
          </div>
          
          {calendarEvents.length === 0 ? (
            <div className="ea-empty">
              <div className="ea-empty__text">No hay eventos importados</div>
            </div>
          ) : (
            <div className="ea-list">
              {calendarEvents.slice(0, 50).map(ev => (
                <div key={ev.id} className="ea-list-item">
                  <div className="ea-list-item__top">
                    <span>{ev.summary}</span>
                  </div>
                  <div className="ea-list-item__sub">
                    {ev.start.toLocaleString()}
                  </div>
                </div>
              ))}
              {calendarEvents.length > 50 && (
                <div className="ea-list-item" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  ... y {calendarEvents.length - 50} más
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
