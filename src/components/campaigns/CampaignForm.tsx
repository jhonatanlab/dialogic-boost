import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContacts } from "@/hooks/useContacts";
import { useTags } from "@/hooks/useTags";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const campaignSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  message: z.string().min(1, "Mensagem é obrigatória").max(1000),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; message: string; contactIds: string[] }) => void;
}

export function CampaignForm({ open, onOpenChange, onSubmit }: CampaignFormProps) {
  const { data: contacts } = useContacts();
  const { data: tags } = useTags();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<"all" | "tags" | "individual">("all");

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      message: "",
    },
  });

  const handleSubmit = (data: CampaignFormData) => {
    let contactIds: string[] = [];

    if (selectionMode === "all") {
      contactIds = contacts?.map(c => c.id) || [];
    } else if (selectionMode === "tags") {
      // Filter contacts by selected tags
      const contactsWithTags = contacts?.filter(contact => 
        contact.tags?.some(tag => selectedTags.includes(tag.id))
      ) || [];
      contactIds = contactsWithTags.map(c => c.id);
    } else {
      contactIds = selectedContacts;
    }

    onSubmit({
      name: data.name,
      message: data.message,
      contactIds
    });
    form.reset();
    setSelectedContacts([]);
    setSelectedTags([]);
    setSelectionMode("all");
    onOpenChange(false);
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const getRecipientCount = () => {
    if (selectionMode === "all") return contacts?.length || 0;
    if (selectionMode === "tags") {
      const contactsWithTags = contacts?.filter(contact => 
        contact.tags?.some(tag => selectedTags.includes(tag.id))
      ) || [];
      return contactsWithTags.length;
    }
    return selectedContacts.length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Campanha</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Campanha</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Promoção Black Friday" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite a mensagem que será enviada..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label>Destinatários ({getRecipientCount()} contatos)</Label>
              <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="tags">Por Tags</TabsTrigger>
                  <TabsTrigger value="individual">Individual</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    A campanha será enviada para todos os {contacts?.length || 0} contatos.
                  </p>
                </TabsContent>

                <TabsContent value="tags" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Selecione as tags dos contatos que receberão a campanha:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags?.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        style={{
                          backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                          borderColor: tag.color,
                        }}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="individual" className="mt-4">
                  <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-3">
                    {contacts?.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={contact.id}
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={() => toggleContact(contact.id)}
                        />
                        <label
                          htmlFor={contact.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {contact.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Criar Campanha</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}