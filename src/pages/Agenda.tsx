import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { AgendaToolbar, AgendaView } from "@/components/agenda/AgendaToolbar";
import { MonthView } from "@/components/agenda/MonthView";
import { WeekDayView } from "@/components/agenda/WeekDayView";
import { AppointmentFormDialog } from "@/components/agenda/AppointmentFormDialog";
import { Appointment, useAppointments } from "@/hooks/useAppointments";

export default function Agenda() {
  const [view, setView] = useState<AgendaView>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);

  const { rangeStart, rangeEnd, label } = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = addDays(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }), 1);
      return {
        rangeStart: start,
        rangeEnd: end,
        label: format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }),
      };
    }
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = addDays(start, 7);
      return {
        rangeStart: start,
        rangeEnd: end,
        label: `${format(start, "dd MMM", { locale: ptBR })} – ${format(addDays(start, 6), "dd MMM yyyy", { locale: ptBR })}`,
      };
    }
    const start = startOfDay(currentDate);
    const end = addDays(start, 1);
    return {
      rangeStart: start,
      rangeEnd: end,
      label: format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    };
  }, [view, currentDate]);

  const { data: appointments = [], isLoading } = useAppointments(rangeStart, rangeEnd);

  const handlePrev = () => {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subDays(d, 7));
    else setCurrentDate((d) => subDays(d, 1));
  };
  const handleNext = () => {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addDays(d, 7));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const openNew = (when?: Date) => {
    setEditing(null);
    setDefaultDate(when ?? new Date());
    setDialogOpen(true);
  };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setDefaultDate(undefined);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground mt-1">Gerencie seus agendamentos e reuniões</p>
          </div>
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        <AgendaToolbar
          view={view}
          onViewChange={setView}
          label={label}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={() => setCurrentDate(new Date())}
        />

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Carregando agenda...</div>
        ) : appointments.length === 0 && view === "month" ? (
          <div className="border rounded-lg bg-card">
            <MonthView
              currentDate={currentDate}
              appointments={[]}
              onSelectAppointment={openEdit}
              onSelectDay={(d) => openNew(d)}
            />
            <div className="flex flex-col items-center justify-center text-center py-12 px-6 border-t">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nenhum agendamento encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">Crie o primeiro!</p>
              <Button onClick={() => openNew()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        ) : view === "month" ? (
          <MonthView
            currentDate={currentDate}
            appointments={appointments}
            onSelectAppointment={openEdit}
            onSelectDay={(d) => openNew(d)}
          />
        ) : (
          <WeekDayView
            currentDate={currentDate}
            appointments={appointments}
            mode={view}
            onSelectAppointment={openEdit}
            onSelectSlot={(d) => openNew(d)}
          />
        )}
      </div>

      <AppointmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editing}
        defaultDate={defaultDate}
      />
    </DashboardLayout>
  );
}
