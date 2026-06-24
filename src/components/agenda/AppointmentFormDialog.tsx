import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Appointment,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  AppointmentInput,
  useCreateAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
} from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { useResolvedAppointmentRules } from "@/hooks/useAppointmentRules";

const schema = z.object({
  title: z.string().min(1, "Nome do contato é obrigatório").max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
  date: z.date({ required_error: "Data é obrigatória" }),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duration_minutes: z.coerce.number().min(5).max(24 * 60).default(60),
  type: z.enum(["visita_tecnica", "reuniao", "ligacao", "outro"]),
  status: z.enum(["pending", "confirmed", "cancelled", "done"]).default("pending"),
  notes: z.string().max(2000).optional().or(z.literal("")),
  contact_id: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
}

export function AppointmentFormDialog({ open, onOpenChange, appointment, defaultDate }: Props) {
  const isEdit = !!appointment;
  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const del = useDeleteAppointment();
  const [contactSearch, setContactSearch] = useState("");
  const { data: contacts = [] } = useContacts(contactSearch);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const { data: resolvedRules } = useResolvedAppointmentRules();
  const fixedDurationEnabled = !!resolvedRules?.fixed_duration_enabled;
  const fixedDurationMinutes = resolvedRules?.fixed_duration_minutes ?? 60;


  const initialValues: FormValues = useMemo(() => {
    if (appointment) {
      const d = new Date(appointment.scheduled_at);
      return {
        title: appointment.title,
        phone: appointment.phone ?? "",
        date: d,
        time: format(d, "HH:mm"),
        duration_minutes: appointment.duration_minutes,
        type: appointment.type,
        status: appointment.status,
        notes: appointment.notes ?? "",
        contact_id: appointment.contact_id,
      };
    }
    const base = defaultDate ?? new Date();
    return {
      title: "",
      phone: "",
      date: base,
      time: format(base, "HH:mm"),
      duration_minutes: fixedDurationEnabled ? fixedDurationMinutes : 60,
      type: "reuniao",
      status: "pending",
      notes: "",
      contact_id: null,
    };
  }, [appointment, defaultDate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (open) form.reset(initialValues);
  }, [open, initialValues]);

  const onSubmit = async (values: FormValues) => {
    const [hh, mm] = values.time.split(":").map(Number);
    const dt = new Date(values.date);
    dt.setHours(hh, mm, 0, 0);

    const payload: AppointmentInput = {
      title: values.title,
      phone: values.phone || null,
      scheduled_at: dt.toISOString(),
      duration_minutes: values.duration_minutes,
      type: values.type,
      status: values.status,
      notes: values.notes || null,
      contact_id: values.contact_id || null,
    };

    if (isEdit && appointment) {
      await update.mutateAsync({ id: appointment.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!appointment) return;
    if (!confirm("Excluir este agendamento?")) return;
    await del.mutateAsync(appointment.id);
    onOpenChange(false);
  };

  const selectedContact = contacts.find((c) => c.id === form.watch("contact_id"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize as informações do agendamento" : "Crie um novo evento na agenda"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contato vinculado (opcional) */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contato vinculado (opcional)</FormLabel>
                  <Popover open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className={cn("justify-between font-normal", !field.value && "text-muted-foreground")}
                      >
                        {selectedContact ? selectedContact.name : "Buscar contato..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar por nome, telefone..."
                          value={contactSearch}
                          onValueChange={setContactSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum contato encontrado</CommandEmpty>
                          <CommandGroup>
                            {field.value && (
                              <CommandItem
                                value="__clear__"
                                onSelect={() => {
                                  field.onChange(null);
                                  setContactPickerOpen(false);
                                }}
                              >
                                <span className="text-muted-foreground">Limpar seleção</span>
                              </CommandItem>
                            )}
                            {contacts.slice(0, 30).map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.id}
                                onSelect={() => {
                                  field.onChange(c.id);
                                  // Autopreenche
                                  form.setValue("title", c.name);
                                  if (c.phone) form.setValue("phone", c.phone);
                                  setContactPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === c.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{c.name}</span>
                                  {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do contato *</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col sm:col-span-1">
                    <FormLabel>Data *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(d) => d && field.onChange(d)}
                          locale={ptBR}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} step={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(APPOINTMENT_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Detalhes do agendamento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-2">
              {isEdit && (
                <Button type="button" variant="outline" onClick={handleDelete} className="mr-auto text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {isEdit ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
