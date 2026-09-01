import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  type: 'hire' | 'leave' | 'appointment' | 'birthday';
  title: string;
  date: string;
  description?: string;
}

const eventBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  hire: { label: '입사', variant: 'default' },
  leave: { label: '휴가', variant: 'secondary' },
  appointment: { label: '발령', variant: 'outline' },
  birthday: { label: '생일', variant: 'secondary' },
};

const eventDotColor: Record<string, string> = {
  hire: 'bg-accent-green',
  leave: 'bg-accent-amber',
  appointment: 'bg-accent-blue',
  birthday: 'bg-accent-purple',
};

interface RecentEventsProps {
  events: Event[];
}

export function RecentEvents({ events }: RecentEventsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 이벤트</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              등록된 이벤트가 없습니다.
            </p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 text-sm">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${eventDotColor[event.type] ?? 'bg-muted-foreground'}`} />
                <Badge variant={eventBadge[event.type]?.variant ?? 'outline'}>
                  {eventBadge[event.type]?.label ?? event.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {event.date}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
