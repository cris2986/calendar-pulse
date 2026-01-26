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
import { useInbox } from "@/hooks/use-inbox";
import "../styles/home.css";

export default function Landing() {
  // Debug mode toggle (can be controlled via URL param or state)
  const [debugMode, setDebugMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true';
  });

  const { events, leaks, pending, allEvents, isLoading } = useInbox(debugMode);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [icsFile, setIcsFile] = useState<File | null>(null);
  
  // Modals state
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);

  // Debug stats
  const [dbStats, setDbStats] = useState<{ totalCount: number; lastStatus: string | null }>({
    totalCount: 0,
    lastStatus: null
  });

  useEffect(() => {
    initializeApp().catch(error => {
      console.error('Failed to initialize app:', error);
      toast.error('Error al inicializar la aplicación: ' + error.message);
    });
  }, []);

  useEffect(() => {
    if (debugMode) {
      updateDebugStats();
    }
  }, [debugMode, events]);

  async function initializeApp() {
    try {
      await initializeSettings();
      await autopurge();
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
      
      // Update debug stats
      if (debugMode) {
        await updateDebugStats();
      }
    } else {
      toast.error("Error al procesar: " + result.error);
    }
    setLoading(false);
  }

  async function updateDebugStats() {
    try {
      const totalCount = await db.potentialEvents.count();
      const lastEvent = await db.potentialEvents
        .orderBy('created_at')
        .reverse()
        .first();
      
      setDbStats({
        totalCount,
        lastStatus: lastEvent?.status || null
      });
    } catch (error) {
      console.error('Failed to update debug stats:', error);
    }
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
    toast.success("Marcado como cubierto");
  }

  async function handleDiscard(id: number) {
    await db.potentialEvents.update(id, { status: 'discarded', updated_at: new Date() });
    toast.success("Evento descartado");
  }

  async function handleResetAllData() {
    if (!confirm("⚠️ ADVERTENCIA: Esto borrará TODOS los datos locales (eventos, calendario, configuración). ¿Estás seguro?")) return;
    
    try {
      await db.potentialEvents.clear();
      await db.rawRecords.clear();
      await db.calendarEvents.clear();
      await initializeSettings(); // Reset to defaults
      await loadSettings();
      await loadCalendarEvents();
      toast.success("Todos los datos han sido eliminados");
    } catch (error) {
      toast.error("Error al resetear datos: " + error);
    }
  }

  async function handleExportData() {
    try {
      const potentialEvents = await db.potentialEvents.toArray();
      const calendarEvents = await db.calendarEvents.toArray();
      const rawRecords = await db.rawRecords.toArray();
      const settings = await db.settings.get(1);
      
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        data: {
          potentialEvents,
          calendarEvents,
          rawRecords,
          settings
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `event-auditor-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Datos exportados correctamente");
    } catch (error) {
      toast.error("Error al exportar datos: " + error);
    }
  }

  async function handleImportData(file: File) {
    try {
      const content = await file.text();
      const importData = JSON.parse(content);
      
      if (!importData.version || !importData.data) {
        throw new Error("Formato de archivo inválido");
      }
      
      // Clear existing data
      await db.potentialEvents.clear();
      await db.rawRecords.clear();
      await db.calendarEvents.clear();
      
      // Import data
      if (importData.data.potentialEvents?.length > 0) {
        await db.potentialEvents.bulkAdd(importData.data.potentialEvents.map((e: any) => ({
          ...e,
          detected_start: new Date(e.detected_start),
          detected_end: e.detected_end ? new Date(e.detected_end) : undefined,
          created_at: new Date(e.created_at),
          updated_at: new Date(e.updated_at)
        })));
      }
      
      if (importData.data.calendarEvents?.length > 0) {
        await db.calendarEvents.bulkAdd(importData.data.calendarEvents.map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: e.end ? new Date(e.end) : undefined,
          imported_at: new Date(e.imported_at)
        })));
      }
      
      if (importData.data.rawRecords?.length > 0) {
        await db.rawRecords.bulkAdd(importData.data.rawRecords.map((r: any) => ({
          ...r,
          created_at: new Date(r.created_at)
        })));
      }
      
      if (importData.data.settings) {
        await db.settings.put({ ...importData.data.settings, id: 1 });
      }
      
      await loadSettings();
      await loadCalendarEvents();
      
      toast.success(`Datos importados: ${importData.data.potentialEvents?.length || 0} eventos`);
    } catch (error) {
      toast.error("Error al importar datos: " + error);
    }
  }

  // Display events based on debug mode
  const displayEvents = debugMode ? allEvents : [...leaks, ...pending];

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
            aria-label="Debug Mode" 
            type="button"
            onClick={() => setDebugMode(!debugMode)}
            style={{ 
              background: debugMode ? 'rgba(79, 140, 255, 0.2)' : 'rgba(255, 255, 255, 0.02)',
              borderColor: debugMode ? 'rgba(79, 140, 255, 0.35)' : 'var(--line)'
            }}
          >
            🐛
          </button>
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
            aria-label="Gestión de datos" 
            type="button"
            onClick={() => setShowDataManagement(true)}
          >
            💾
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
            <div className="ea-card__title">
              Bandeja {debugMode && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>(DEBUG MODE)</span>}
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
                <span className="ea-debug-value">{dbStats.lastStatus || 'N/A'}</span>
              </div>
            </div>
          )}
          
          {displayEvents.length === 0 ? (
            <div className="ea-empty">
              <div className="ea-empty__icon">📭</div>
              <div className="ea-empty__text">
                {debugMode ? 'No hay eventos procesados (modo debug)' : 'No hay compromisos sin agendar próximos'}
              </div>
            </div>
          ) : (
            <div className="ea-list">
              {displayEvents.map((event: PotentialEvent) => (
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

      {/* Data Management Modal */}
      {showDataManagement && (
        <div className="ea-modal-backdrop" onClick={() => setShowDataManagement(false)}>
          <div className="ea-modal" onClick={e => e.stopPropagation()}>
            <div className="ea-modal__header">
              <div className="ea-modal__title">Gestión de datos</div>
              <button className="ea-modal__close" onClick={() => setShowDataManagement(false)}>×</button>
            </div>
            <div className="ea-modal__content">
              <div className="ea-field">
                <span className="ea-label">Exportar datos</span>
                <div className="ea-card__hint" style={{ marginBottom: '8px' }}>
                  Descarga una copia de seguridad de todos tus datos locales
                </div>
                <button className="ea-btn ea-btn--primary" onClick={handleExportData}>
                  📥 Exportar a JSON
                </button>
              </div>

              <div className="ea-field">
                <span className="ea-label">Importar datos</span>
                <div className="ea-card__hint" style={{ marginBottom: '8px' }}>
                  Restaura datos desde un archivo de respaldo
                </div>
                <label className="ea-file">
                  <input 
                    className="ea-file__input" 
                    type="file" 
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportData(file);
                    }}
                  />
                  <span className="ea-btn ea-btn--primary">
                    📤 Seleccionar archivo JSON
                  </span>
                </label>
              </div>

              <div className="ea-field" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                <span className="ea-label" style={{ color: 'var(--danger)' }}>Zona de peligro</span>
                <div className="ea-card__hint" style={{ marginBottom: '8px' }}>
                  Elimina permanentemente todos los datos locales
                </div>
                <button 
                  className="ea-btn ea-btn--ghost" 
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={handleResetAllData}
                >
                  🗑️ Resetear todos los datos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}