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

export function WeekDayView({ currentDate, appointments, mode, onSelectAppointment, onSelectSlot }: Props) {
  const days = useMemo(() => {
    if (mode === "day") return [currentDate];
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate, mode]);

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    [],
  );

  const today = new Date();

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div
        className="grid bg-muted/40 text-xs font-medium text-muted-foreground border-b"
        style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div />
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={d.toISOString()} className="px-2 py-2 text-center">
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

      {/* Grid */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))`,
            gridAutoRows: `${HOUR_PX}px`,
          }}
        >
          {hours.map((h, rowIdx) => (
            <>
              <div
                key={`hour-${h}`}
                className="text-[11px] text-muted-foreground border-b border-r pr-2 pt-0.5 text-right"
                style={{ gridRow: rowIdx + 1, gridColumn: 1 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
              {days.map((d, colIdx) => {
                const slotDate = new Date(d);
                slotDate.setHours(h, 0, 0, 0);
                return (
                  <button
                    type="button"
                    key={`${h}-${d.toISOString()}`}
                    onClick={() => onSelectSlot(slotDate)}
                    className="border-b border-r hover:bg-muted/30 transition-colors"
                    style={{ gridRow: rowIdx + 1, gridColumn: colIdx + 2 }}
                  />
                );
              })}
            </>
          ))}

          {/* Eventos posicionados */}
          {days.map((d, colIdx) =>
            appointments
              .filter((a) => isSameDay(new Date(a.scheduled_at), d))
              .map((a) => {
                const start = new Date(a.scheduled_at);
                const minutesFromStart = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                if (minutesFromStart < 0) return null;
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
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      gridColumn: colIdx + 2,
                      gridRow: `1 / span ${hours.length}`,
                      position: "relative",
                    }}
                  >
                    <div className="font-semibold truncate">{a.contact?.name || a.title}</div>
                    <div className="opacity-80 truncate">
                      {format(start, "HH:mm")} • {APPOINTMENT_TYPE_LABELS[a.type]}
                    </div>
                  </div>
                );
              }),
          )}
        </div>
      </div>
    </div>
  );
}
