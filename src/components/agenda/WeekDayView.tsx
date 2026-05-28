import { useMemo } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Appointment, APPOINTMENT_TYPE_LABELS, getStatusClasses } from "@/hooks/useAppointments";

interface Props {
  currentDate: Date;
  appointments: Appointment[];
  mode: "week" | "day";
  onSelectAppointment: (a: Appointment) => void;
  onSelectSlot: (d: Date) => void;
}

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 56;
const TOTAL_HOURS = END_HOUR - START_HOUR + 1;
const COLUMN_HEIGHT = TOTAL_HOURS * HOUR_PX;

export function WeekDayView({ currentDate, appointments, mode, onSelectAppointment, onSelectSlot }: Props) {
  const days = useMemo(() => {
    if (mode === "day") return [currentDate];
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate, mode]);

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i),
    [],
  );

  const today = new Date();

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex bg-muted/40 text-xs font-medium text-muted-foreground border-b">
        <div className="w-[60px] shrink-0" />
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={d.toISOString()} className="flex-1 px-2 py-2 text-center min-w-0">
              <div className="uppercase">{format(d, "EEE", { locale: ptBR })}</div>
              <div
                className={cn(
                  "mt-0.5 text-base font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {format(d, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Body com scroll */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
        <div className="flex">
          {/* Coluna de horas */}
          <div className="w-[60px] shrink-0">
            {hours.map((h) => (
              <div
                key={h}
                className="text-[11px] text-muted-foreground border-b border-r pr-2 pt-0.5 text-right"
                style={{ height: HOUR_PX }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Colunas de dias */}
          {days.map((d) => {
            const dayAppts = appointments.filter((a) => isSameDay(new Date(a.scheduled_at), d));
            return (
              <div
                key={d.toISOString()}
                className="flex-1 relative border-r min-w-0"
                style={{ height: COLUMN_HEIGHT }}
              >
                {/* Slots clicáveis por hora */}
                {hours.map((h) => {
                  const slot = new Date(d);
                  slot.setHours(h, 0, 0, 0);
                  return (
                    <button
                      type="button"
                      key={h}
                      onClick={() => onSelectSlot(slot)}
                      className="w-full block border-b hover:bg-muted/30 transition-colors"
                      style={{ height: HOUR_PX }}
                      aria-label={`Criar agendamento às ${h}:00`}
                    />
                  );
                })}

                {/* Eventos sobrepostos */}
                {dayAppts.map((a) => {
                  const start = new Date(a.scheduled_at);
                  const minutesFromStart = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                  if (minutesFromStart < 0 || start.getHours() > END_HOUR) return null;
                  const top = (minutesFromStart / 60) * HOUR_PX;
                  const height = Math.max(24, (a.duration_minutes / 60) * HOUR_PX - 2);

                  return (
                    <div
                      key={a.id}
                      onClick={() => onSelectAppointment(a)}
                      className={cn(
                        "absolute left-1 right-1 rounded-md border px-2 py-1 text-xs cursor-pointer hover:shadow-md transition-shadow overflow-hidden",
                        getStatusClasses(a.status),
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="font-semibold truncate">{a.contact?.name || a.title}</div>
                      <div className="opacity-80 truncate">
                        {format(start, "HH:mm")} • {APPOINTMENT_TYPE_LABELS[a.type]}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
