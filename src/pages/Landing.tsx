import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, initializeSettings, autopurge } from "@/db/database";
import { processIncoming } from "@/features/ingest/processIncoming";
import { parseICSFile } from "@/features/calendar/icsParser";
import { downloadICS } from "@/features/calendar/icsExport";
import { requestNotificationPermission, checkForLeaksAndNotify } from "@/features/notifications/webNotifications";
import { PotentialEvent, Settings, CalendarEvent } from "@/core/types";
import { matchAgainstCalendar } from "@/core/matcher";
import { deriveStatus } from "@/core/stateMachine";
import { EventCard } from "@/components/EventCard";
import "../styles/home.css";

export default function Landing() {
  const [events, setEvents] = useState<PotentialEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [icsFile, setIcsFile] = useState<File | null>(null);
  
  // Modals state
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    initializeApp().catch(error => {
      console.error('Failed to initialize app:', error);
      toast.error('Error al inicializar la aplicación: ' + error.message);
    });
  }, []);

  async function initializeApp() {
    try {
      await initializeSettings();
      await autopurge();
      await loadEvents();
      await loadSettings();
      await loadCalendarEvents();
      await requestNotificationPermission();
      
      const allEvents = await db.potentialEvents.toArray();
      checkForLeaksAndNotify(allEvents);
    } catch (error) {
      console.error('Initialization error:', error);
      throw error;
    }
  }

  async function loadEvents() {
    try {
      const allEvents = await db.potentialEvents
        .orderBy('detected_start')
        .toArray();
      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    }
  }

  async function loadCalendarEvents() {
    try {
      const evs = await db.calendarEvents
        .orderBy('start')
        .toArray();
      setCalendarEvents(evs);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  }

  async function loadSettings() {
    try {
      const s = await db.settings.get(1);
      if (s) setSettings(s);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!settings) return;
    try {
      const newSettings = { ...settings, [key]: value };
      await db.settings.put({ ...newSettings, id: 1 });
      setSettings(newSettings);
      toast.success("Configuración guardada");
      
      // If window_hours changed, recalculate statuses
      if (key === 'window_hours') {
        await recalculateAllStatuses();
        await loadEvents();
      }
    } catch (error) {
      toast.error("Error al guardar configuración");
    }
  }

  async function handleClearCalendar() {
    if (!confirm("¿Estás seguro de borrar todos los eventos importados?")) return;
    try {
      await db.calendarEvents.clear();
      await loadCalendarEvents();
      await recalculateAllStatuses();
      await loadEvents();
      toast.success("Calendario limpiado");
    } catch (error) {
      toast.error("Error al limpiar calendario");
    }
  }

  async function handleProcessText() {
    if (!inputText.trim()) {
      toast.error("Por favor ingresa texto");
      return;
    }
    
    setLoading(true);
    const result = await processIncoming(inputText, 'paste');
    
    if (result.success) {
      toast.success("Compromiso procesado");
      setInputText("");
      await loadEvents();
    } else {
      toast.error("Error al procesar: " + result.error);
    }
    setLoading(false);
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        toast.success("Texto pegado desde portapapeles");
      }
    } catch (error) {
      toast.error("No se pudo acceder al portapapeles");
    }
  }

  async function handlePickIcsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setIcsFile(file);
      toast.success("Archivo seleccionado: " + file.name);
    }
  }

  async function handleImportIcs() {
    if (!icsFile) {
      toast.error("Selecciona un archivo .ics primero");
      return;
    }
    
    setLoading(true);
    try {
      const content = await icsFile.text();
      const parsedEvents = await parseICSFile(content);
      
      await db.calendarEvents.bulkAdd(parsedEvents);
      await recalculateAllStatuses();
      
      toast.success(`${parsedEvents.length} eventos importados`);
      await loadEvents();
      await loadCalendarEvents();
      setIcsFile(null);
    } catch (error) {
      toast.error("Error al importar ICS");
    }
    setLoading(false);
  }

  async function recalculateAllStatuses() {
    const potentialEvents = await db.potentialEvents.toArray();
    const calendarEvents = await db.calendarEvents.toArray();
    const s = await db.settings.get(1);
    const windowHours = s?.window_hours ?? 48;
    
    for (const event of potentialEvents) {
      const matchResult = matchAgainstCalendar(event, calendarEvents, windowHours);
      const newStatus = deriveStatus(new Date(), event, matchResult, windowHours);
      
      if (newStatus !== event.status) {
        await db.potentialEvents.update(event.id!, {
          status: newStatus,
          updated_at: new Date()
        });
      }
    }
  }

  async function handleMarkCovered(id: number) {
    await db.potentialEvents.update(id, { status: 'covered', updated_at: new Date() });
    await loadEvents();
    toast.success("Marcado como cubierto");
  }

  async function handleDiscard(id: number) {
    await db.potentialEvents.update(id, { status: 'discarded', updated_at: new Date() });
    await loadEvents();
    toast.success("Evento descartado");
  }

  const leaks = events.filter(e => e.status === 'leak');
  const pending = events.filter(e => e.status === 'pending');

  return (
    <div className="ea-page">
      <header className="ea-header">
        <div className="ea-header__left">
          <div className="ea-appmark" aria-hidden />
          <div>
            <div className="ea-title">Event Auditor</div>
            <div className="ea-subtitle">Auditor de compromisos no agendados</div>
          </div>
        </div>
        <div className="ea-header__right">
          <button 
            className="ea-iconbtn" 
            aria-label="Calendario" 
            type="button"
            onClick={() => setShowCalendar(true)}
          >
            📅
          </button>
          <button 
            className="ea-iconbtn" 
            aria-label="Ajustes" 
            type="button"
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
        </div>
      </header>

      <main className="ea-content">
        <section className="ea-card">
          <div className="ea-card__head">
            <div className="ea-card__title">Ingresar compromiso</div>
            <div className="ea-card__hint">Pega o escribe texto con fecha/hora.</div>
          </div>
          <label className="ea-field">
            <span className="ea-label">Texto</span>
            <textarea
              className="ea-textarea"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ej:\nmañana 19:00 dentista\nlunes 10:30 reunión`}
              rows={4}
              disabled={loading}
            />
          </label>
          <div className="ea-row">
            <button className="ea-btn ea-btn--primary" onClick={handleProcessText} type="button" disabled={loading}>
              Procesar
            </button>
            <button className="ea-btn ea-btn--ghost" onClick={handlePaste} type="button" disabled={loading}>
              Pegar
            </button>
          </div>
        </section>

        <section className="ea-card">
          <div className="ea-card__head">
            <div className="ea-card__title">Calendario objetivo</div>
            <div className="ea-card__hint">Importa un archivo .ics para comparar.</div>
          </div>
          <div className="ea-row ea-row--between">
            <label className="ea-file">
              <input 
                className="ea-file__input" 
                type="file" 
                accept=".ics,text/calendar" 
                onChange={handlePickIcsFile}
                disabled={loading}
              />
              <span className="ea-btn ea-btn--ghost">
                {icsFile ? icsFile.name.slice(0, 20) : "Seleccionar archivo"}
              </span>
            </label>
            <button className="ea-btn ea-btn--primary" onClick={handleImportIcs} type="button" disabled={loading || !icsFile}>
              Importar ICS
            </button>
          </div>
        </section>

        <section className="ea-card">
          <div className="ea-row ea-row--between ea-stack-sm">
            <div className="ea-card__title">Bandeja</div>
            <div className="ea-badges">
              <span className="ea-badge ea-badge--danger">Fugas {leaks.length}</span>
              <span className="ea-badge">Pendientes {pending.length}</span>
            </div>
          </div>
          
          {leaks.length === 0 && pending.length === 0 ? (
            <div className="ea-empty">
              <div className="ea-empty__icon">✅</div>
              <div className="ea-empty__text">
                No hay compromisos sin agendar próximos
              </div>
            </div>
          ) : (
            <div className="ea-list">
              {leaks.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onMarkCovered={handleMarkCovered}
                  onDiscard={handleDiscard}
                  onDownloadICS={downloadICS}
                />
              ))}
              {pending.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onMarkCovered={handleMarkCovered}
                  onDiscard={handleDiscard}
                  onDownloadICS={downloadICS}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Settings Modal */}
      {showSettings && settings && (
        <div className="ea-modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="ea-modal" onClick={e => e.stopPropagation()}>
            <div className="ea-modal__header">
              <div className="ea-modal__title">Configuración</div>
              <button className="ea-modal__close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="ea-modal__content">
              <div className="ea-field">
                <span className="ea-label">Ventana de detección</span>
                <select 
                  className="ea-select"
                  value={settings.window_hours}
                  onChange={(e) => updateSetting('window_hours', Number(e.target.value) as 24 | 48)}
                >
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                </select>
              </div>
              
              <div className="ea-field">
                <span className="ea-label">Retención de datos</span>
                <select 
                  className="ea-select"
                  value={settings.retention_days}
                  onChange={(e) => updateSetting('retention_days', Number(e.target.value) as 7 | 30 | 90)}
                >
                  <option value={7}>7 días</option>
                  <option value={30}>30 días</option>
                  <option value={90}>90 días</option>
                </select>
              </div>

              <div className="ea-field">
                <span className="ea-label">Notificaciones</span>
                <div className="ea-row">
                  <button 
                    className={`ea-btn ${settings.notifications_enabled ? 'ea-btn--primary' : 'ea-btn--ghost'}`}
                    onClick={() => updateSetting('notifications_enabled', true)}
                  >
                    Activadas
                  </button>
                  <button 
                    className={`ea-btn ${!settings.notifications_enabled ? 'ea-btn--primary' : 'ea-btn--ghost'}`}
                    onClick={() => updateSetting('notifications_enabled', false)}
                  >
                    Desactivadas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="ea-modal-backdrop" onClick={() => setShowCalendar(false)}>
          <div className="ea-modal" onClick={e => e.stopPropagation()}>
            <div className="ea-modal__header">
              <div className="ea-modal__title">Eventos importados</div>
              <button className="ea-modal__close" onClick={() => setShowCalendar(false)}>×</button>
            </div>
            <div className="ea-modal__content">
              <div className="ea-row ea-row--between">
                <span className="ea-label">{calendarEvents.length} eventos</span>
                {calendarEvents.length > 0 && (
                  <button className="ea-btn ea-btn--ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleClearCalendar}>
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
      )}
    </div>
  );
}