import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { db, initializeSettings, autopurge } from "@/db/database";
import { processIncoming } from "@/features/ingest/processIncoming";
import { parseICSFile } from "@/features/calendar/icsParser";
import { downloadICS } from "@/features/calendar/icsExport";
import { requestNotificationPermission, checkForLeaksAndNotify } from "@/features/notifications/webNotifications";
import { PotentialEvent, Settings, CalendarEvent, RawRecord } from "@/core/types";
import { matchAgainstCalendar } from "@/core/matcher";
import { deriveStatus } from "@/core/stateMachine";
import { EventCard } from "@/components/EventCard";
import { SettingsModal } from "@/components/SettingsModal";
import { CalendarModal } from "@/components/CalendarModal";
import { DataManagementModal } from "@/components/DataManagementModal";
import { useInbox } from "@/hooks/use-inbox";
import { useNotificationListener } from "@/hooks/use-notification-listener";
import "../styles/home.css";

const formatErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type SerializedPotentialEvent = Omit<
  PotentialEvent,
  "detected_start" | "detected_end" | "created_at" | "updated_at"
> & {
  detected_start: string;
  detected_end?: string;
  created_at: string;
  updated_at: string;
};

type SerializedCalendarEvent = Omit<
  CalendarEvent,
  "start" | "end" | "imported_at"
> & {
  start: string;
  end?: string;
  imported_at: string;
};

type SerializedRawRecord = Omit<RawRecord, "created_at"> & {
  created_at: string;
};

type SerializedExportData = {
  potentialEvents?: SerializedPotentialEvent[];
  calendarEvents?: SerializedCalendarEvent[];
  rawRecords?: SerializedRawRecord[];
  settings?: Settings;
};

type SerializedExportFile = {
  version: string;
  exportDate: string;
  data: SerializedExportData;
};

export default function Landing() {
  // Debug mode toggle (can be controlled via URL param or state)
  const [debugMode, setDebugMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true';
  });

  const { events, leaks, pending, allEvents } = useInbox(debugMode);
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

  // Callback para procesar notificaciones de WhatsApp
  const handleWhatsAppNotification = useCallback(async (data: { packageName: string; title: string; text: string; timestamp: number }) => {
    console.log('[NotificationListener] Processing WhatsApp message:', data.text);
    const result = await processIncoming(data.text, 'notification');
    if (result.success) {
      toast.success(`Mensaje de ${data.title} procesado automáticamente`);
    }
  }, []);

  // Notification listener for Android (reads WhatsApp notifications)
  const {
    isNative,
    isPermissionGranted: notifPermissionGranted,
    isListening: notifListening,
    requestPermission: requestNotifPermission,
    startListening: startNotifListening,
    checkPermission: checkNotifPermission,
  } = useNotificationListener({
    onNotification: handleWhatsAppNotification,
    autoStart: true,
  });

  const loadCalendarEvents = useCallback(async () => {
    try {
      const evs = await db.calendarEvents.orderBy('start').toArray();
      setCalendarEvents(evs);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const s = await db.settings.get(1);
      if (s) setSettings(s);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  const initializeApp = useCallback(async () => {
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
  }, [loadCalendarEvents, loadSettings]);

  useEffect(() => {
    initializeApp().catch((error) => {
      console.error('Failed to initialize app:', error);
      toast.error(
        'Error al inicializar la aplicación: ' + formatErrorMessage(error)
      );
    });

    // Handle Web Share Target API
    const handleShareTarget = async () => {
      const params = new URLSearchParams(window.location.search);
      const sharedText = params.get('text') || params.get('title');
      
      if (sharedText) {
        setInputText(sharedText);
        toast.success("Texto recibido desde compartir");
        
        // Clear the URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleShareTarget();
  }, [initializeApp]);

  useEffect(() => {
    if (debugMode) {
      updateDebugStats();
    }
  }, [debugMode, events]);

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
      console.error("Failed to save settings:", error);
      toast.error(
        "Error al guardar configuración: " + formatErrorMessage(error)
      );
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
      console.error("Failed to clear calendar events:", error);
      toast.error(
        "Error al limpiar calendario: " + formatErrorMessage(error)
      );
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
      console.error("Clipboard read failed:", error);
      toast.error(
        "No se pudo acceder al portapapeles: " + formatErrorMessage(error)
      );
    }
  }

  async function handlePasteAndProcess() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setInputText(text);
        setLoading(true);
        const result = await processIncoming(text, 'paste');
        
        if (result.success) {
          toast.success("Compromiso procesado desde portapapeles");
          setInputText("");
          
          if (debugMode) {
            await updateDebugStats();
          }
        } else {
          toast.error("Error al procesar: " + result.error);
        }
        setLoading(false);
      } else {
        toast.error("El portapapeles está vacío");
      }
    } catch (error) {
      console.error("Clipboard read failed:", error);
      toast.error(
        "No se pudo acceder al portapapeles: " + formatErrorMessage(error)
      );
      setLoading(false);
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
      console.error("ICS import failed:", error);
      toast.error("Error al importar ICS: " + formatErrorMessage(error));
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
      console.error("Failed to reset local data:", error);
      toast.error("Error al resetear datos: " + formatErrorMessage(error));
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
      console.error("Failed to export data:", error);
      toast.error("Error al exportar datos: " + formatErrorMessage(error));
    }
  }

  async function handleImportData(file: File) {
    try {
      const content = await file.text();
      const importData = JSON.parse(content) as SerializedExportFile;

      if (!importData.version || !importData.data) {
        throw new Error("Formato de archivo inválido");
      }

      // Clear existing data
      await db.potentialEvents.clear();
      await db.rawRecords.clear();
      await db.calendarEvents.clear();

      // Import data
      const potentialEvents = importData.data.potentialEvents ?? [];
      if (potentialEvents.length > 0) {
        await db.potentialEvents.bulkAdd(
          potentialEvents.map((event) => ({
            ...event,
            detected_start: new Date(event.detected_start),
            detected_end: event.detected_end
              ? new Date(event.detected_end)
              : undefined,
            created_at: new Date(event.created_at),
            updated_at: new Date(event.updated_at),
          }))
        );
      }

      const calendarEventsPayload = importData.data.calendarEvents ?? [];
      if (calendarEventsPayload.length > 0) {
        await db.calendarEvents.bulkAdd(
          calendarEventsPayload.map((event) => ({
            ...event,
            start: new Date(event.start),
            end: event.end ? new Date(event.end) : undefined,
            imported_at: new Date(event.imported_at),
          }))
        );
      }

      const rawRecordsPayload = importData.data.rawRecords ?? [];
      if (rawRecordsPayload.length > 0) {
        await db.rawRecords.bulkAdd(
          rawRecordsPayload.map((record) => ({
            ...record,
            created_at: new Date(record.created_at),
          }))
        );
      }

      if (importData.data.settings) {
        await db.settings.put({ ...importData.data.settings, id: 1 });
      }

      await loadSettings();
      await loadCalendarEvents();

      toast.success(
        `Datos importados: ${importData.data.potentialEvents?.length || 0} eventos`
      );
    } catch (error) {
      console.error("Failed to import data:", error);
      toast.error("Error al importar datos: " + formatErrorMessage(error));
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

      <main className="ea-content ea-content--desktop-grid">
        <div className="ea-column-left">
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
              <button className="ea-btn ea-btn--primary" onClick={handlePasteAndProcess} type="button" disabled={loading}>
                📋 Pegar y Procesar
              </button>
            </div>
          </section>
        </div>

        <div className="ea-column-right">
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
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && settings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onUpdateSetting={updateSetting}
          isNative={isNative}
          notifPermissionGranted={notifPermissionGranted}
          notifListening={notifListening}
          requestNotifPermission={requestNotifPermission}
          startNotifListening={startNotifListening}
          checkNotifPermission={checkNotifPermission}
        />
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarModal
          calendarEvents={calendarEvents}
          onClose={() => setShowCalendar(false)}
          onClearCalendar={handleClearCalendar}
        />
      )}

      {/* Data Management Modal */}
      {showDataManagement && (
        <DataManagementModal
          onClose={() => setShowDataManagement(false)}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onResetAllData={handleResetAllData}
        />
      )}
    </div>
  );
}