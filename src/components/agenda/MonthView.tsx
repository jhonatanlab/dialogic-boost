import { useMemo } from "react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Appointment, APPOINTMENT_TYPE_LABELS, getStatusClasses } from "@/hooks/useAppointments";

interface Props {
  currentDate: Date;
  appointments: Appointment[];
  onSelectAppointment: (a: Appointment) => void;
  onSelectDay: (d: Date) => void;
}

export function MonthView({ currentDate, appointments, onSelectAppointment, onSelectDay }: Props) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    const arr: Date[] = [];
    let d = start;
    while (d <= end) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [currentDate]);

  const today = new Date();

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => (
          <div key={w} className="px-2 py-2 text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          const dayAppts = appointments.filter((a) => isSameDay(new Date(a.scheduled_at), day));

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "min-h-[110px] border-r border-b last:border-r-0 p-1.5 text-left flex flex-col gap-1 hover:bg-muted/30 transition-colors",
                !inMonth && "bg-muted/10 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "self-end text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d", { locale: ptBR })}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayAppts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAppointment(a);
                    }}
                    className={cn(
                      "text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate cursor-pointer",
                      getStatusClasses(a.status),
                    )}
                    title={`${a.title} • ${APPOINTMENT_TYPE_LABELS[a.type]} • ${format(new Date(a.scheduled_at), "HH:mm")}`}
                  >
                    <span className="font-semibold">{format(new Date(a.scheduled_at), "HH:mm")}</span>{" "}
                    {a.contact?.name || a.title}
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div className="text-[11px] text-muted-foreground px-1.5">+{dayAppts.length - 3} mais</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
