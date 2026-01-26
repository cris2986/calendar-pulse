import { Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PotentialEvent } from "@/core/types";

interface EventCardProps {
  event: PotentialEvent;
  onMarkCovered: (id: number) => void;
  onDiscard: (id: number) => void;
  onDownloadICS: (event: PotentialEvent) => void;
}

export function EventCard({
  event,
  onMarkCovered,
  onDiscard,
  onDownloadICS
}: EventCardProps) {
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
