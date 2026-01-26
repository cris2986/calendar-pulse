import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, initializeSettings, autopurge } from "@/db/database";
import { processIncoming } from "@/features/ingest/processIncoming";
import { parseICSFile } from "@/features/calendar/icsParser";
import { downloadICS } from "@/features/calendar/icsExport";
import { requestNotificationPermission, checkForLeaksAndNotify } from "@/features/notifications/webNotifications";
import { PotentialEvent, Settings } from "@/core/types";
import { matchAgainstCalendar } from "@/core/matcher";
import { deriveStatus } from "@/core/stateMachine";
import "../styles/home.css";

export default function Landing() {
  const [events, setEvents] = useState<PotentialEvent[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [icsFile, setIcsFile] = useState<File | null>(null);

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

  async function loadSettings() {
    try {
      const s = await db.settings.get(1);
      if (s) setSettings(s);
    } catch (error) {
      console.error('Failed to load settings:', error);
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
          <button className="ea-iconbtn" aria-label="Calendario" type="button">
            📅
          </button>
          <button className="ea-iconbtn" aria-label="Ajustes" type="button">
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
          <div className="ea-empty">
            <div className="ea-empty__icon">✅</div>
            <div className="ea-empty__text">
              {leaks.length === 0 && pending.length === 0 
                ? "No hay compromisos sin agendar próximos" 
                : `${leaks.length} fugas y ${pending.length} pendientes detectados`}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}