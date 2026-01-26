import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Calendar, AlertCircle, CheckCircle, Clock, Upload, Clipboard, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { db, initializeSettings, autopurge } from "@/db/database";
import { processIncoming } from "@/features/ingest/processIncoming";
import { parseICSFile } from "@/features/calendar/icsParser";
import { downloadICS } from "@/features/calendar/icsExport";
import { requestNotificationPermission, checkForLeaksAndNotify } from "@/features/notifications/webNotifications";
import { PotentialEvent, Settings } from "@/core/types";
import { matchAgainstCalendar } from "@/core/matcher";
import { deriveStatus } from "@/core/stateMachine";

export default function Landing() {
  const [events, setEvents] = useState<PotentialEvent[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    await initializeSettings();
    await autopurge();
    await loadEvents();
    await loadSettings();
    await requestNotificationPermission();
    
    // Check for leaks on load
    const allEvents = await db.potentialEvents.toArray();
    checkForLeaksAndNotify(allEvents);
  }

  async function loadEvents() {
    const allEvents = await db.potentialEvents
      .orderBy('detected_start')
      .toArray();
    setEvents(allEvents);
  }

  async function loadSettings() {
    const s = await db.settings.get(1);
    if (s) setSettings(s);
  }

  async function handlePaste() {
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

  async function handleClipboard() {
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

  async function handleICSUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const content = await file.text();
      const parsedEvents = await parseICSFile(content);
      
      // Save to database
      await db.calendarEvents.bulkAdd(parsedEvents);
      
      // Recalculate all event statuses
      await recalculateAllStatuses();
      
      toast.success(`${parsedEvents.length} eventos importados`);
      await loadEvents();
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

  async function handleMarkCovered(eventId: number) {
    await db.potentialEvents.update(eventId, {
      status: 'covered',
      updated_at: new Date()
    });
    toast.success("Marcado como cubierto");
    await loadEvents();
  }

  async function handleDiscard(eventId: number) {
    await db.potentialEvents.update(eventId, {
      status: 'discarded',
      updated_at: new Date()
    });
    toast.success("Descartado");
    await loadEvents();
  }

  async function handleDownloadICS(event: PotentialEvent) {
    downloadICS(event);
    toast.success("Archivo ICS descargado");
  }

  async function updateSettings(updates: Partial<Settings>) {
    await db.settings.update(1, updates);
    await loadSettings();
    await recalculateAllStatuses();
    await loadEvents();
    toast.success("Configuración actualizada");
  }

  const leaks = events.filter(e => e.status === 'leak');
  const pending = events.filter(e => e.status === 'pending');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"
    >
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Event Auditor</h1>
              <p className="text-sm text-muted-foreground">Auditor de compromisos no agendados</p>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configuración</DialogTitle>
                <DialogDescription>Ajusta el comportamiento del auditor</DialogDescription>
              </DialogHeader>
              
              {settings && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ventana de detección</Label>
                    <Select
                      value={String(settings.window_hours)}
                      onValueChange={(v) => updateSettings({ window_hours: Number(v) as 24 | 48 })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 horas</SelectItem>
                        <SelectItem value="48">48 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Retención de datos</Label>
                    <Select
                      value={String(settings.retention_days)}
                      onValueChange={(v) => updateSettings({ retention_days: Number(v) as 7 | 30 | 90 })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 días</SelectItem>
                        <SelectItem value="30">30 días</SelectItem>
                        <SelectItem value="90">90 días</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Notificaciones</Label>
                    <Switch
                      checked={settings.notifications_enabled}
                      onCheckedChange={(checked) => updateSettings({ notifications_enabled: checked })}
                    />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ingresar compromiso</CardTitle>
            <CardDescription>Pega o escribe texto con fecha/hora para detectar compromisos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ej: mañana a las 19:00 dentista&#10;lunes 10:30 reunión con equipo&#10;15/02 pago colegio"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            
            <div className="flex gap-2">
              <Button onClick={handlePaste} disabled={loading} className="flex-1">
                <Clipboard className="h-4 w-4 mr-2" />
                Procesar texto
              </Button>
              <Button onClick={handleClipboard} variant="outline">
                <Clipboard className="h-4 w-4 mr-2" />
                Pegar
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".ics"
                  onChange={handleICSUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={loading}
                />
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar ICS
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Tabs defaultValue="leaks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leaks" className="relative">
              Fugas
              {leaks.length > 0 && (
                <Badge variant="destructive" className="ml-2">{leaks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pendientes
              {pending.length > 0 && (
                <Badge variant="secondary" className="ml-2">{pending.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaks" className="space-y-4">
            {leaks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No hay compromisos sin agendar próximos</p>
                </CardContent>
              </Card>
            ) : (
              leaks.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onMarkCovered={handleMarkCovered}
                  onDiscard={handleDiscard}
                  onDownloadICS={handleDownloadICS}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pending.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p>No hay compromisos pendientes de verificar</p>
                </CardContent>
              </Card>
            ) : (
              pending.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onMarkCovered={handleMarkCovered}
                  onDiscard={handleDiscard}
                  onDownloadICS={handleDownloadICS}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}

function EventCard({
  event,
  onMarkCovered,
  onDiscard,
  onDownloadICS
}: {
  event: PotentialEvent;
  onMarkCovered: (id: number) => void;
  onDiscard: (id: number) => void;
  onDownloadICS: (event: PotentialEvent) => void;
}) {
  const dateStr = event.detected_start.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const timeStr = event.has_time
    ? event.detected_start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : 'Todo el día';

  return (
    <Card className={event.status === 'leak' ? 'border-red-500 border-2' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{event.summary}</CardTitle>
            <CardDescription className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{dateStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{timeStr}</span>
              </div>
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Badge variant={event.confidence === 'high' ? 'default' : event.confidence === 'medium' ? 'secondary' : 'outline'}>
              {event.confidence}
            </Badge>
            {event.status === 'leak' && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Fuga
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onMarkCovered(event.id!)}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Marcar cubierto
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDiscard(event.id!)}>
            Descartar
          </Button>
          <Button size="sm" onClick={() => onDownloadICS(event)}>
            <Calendar className="h-4 w-4 mr-2" />
            Descargar ICS
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}