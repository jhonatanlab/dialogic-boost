import { useState } from "react";
import { X, Mail, Phone, Instagram, Plus, Trash2, MessageCircle, Cake, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Contact } from "@/hooks/useContacts";
import { useContactNotes, useCreateContactNote, useDeleteContactNote } from "@/hooks/useContactNotes";
import { useTags, useAddTagToContact, useRemoveTagFromContact } from "@/hooks/useTags";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactDetailsProps {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
  onSendWhatsApp?: () => void;
}

export function ContactDetails({ contact, onClose, onEdit, onSendWhatsApp }: ContactDetailsProps) {
  const [newNote, setNewNote] = useState("");
  const { data: notes = [] } = useContactNotes(contact.id);
  const createNote = useCreateContactNote();
  const deleteNote = useDeleteContactNote();
  const { data: allTags = [] } = useTags();
  const addTag = useAddTagToContact();
  const removeTag = useRemoveTagFromContact();

  const contactTagIds = contact.tags?.map((t) => t.id) || [];
  const availableTags = allTags.filter((t) => !contactTagIds.includes(t.id));

  const handleAddNote = () => {
    if (newNote.trim()) {
      createNote.mutate({ contactId: contact.id, content: newNote });
      setNewNote("");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Detalhes do Contato</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Avatar className="h-24 w-24">
            <AvatarImage src={contact.avatar_url} />
            <AvatarFallback className="text-2xl">{getInitials(contact.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{contact.name}</h3>
            <p className="text-sm text-muted-foreground">
              Cadastrado em {format(new Date(contact.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onEdit} variant="outline" size="sm">
              Editar Contato
            </Button>
            {onSendWhatsApp && contact.phone && (
              <Button onClick={onSendWhatsApp} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações de Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.email}</span>
              </div>
            )}
            {contact.instagram && (
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.instagram}</span>
              </div>
            )}
            {contact.birthday && (
              <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{format(new Date(contact.birthday), "dd/MM/yyyy")}</span>
              </div>
            )}
            {!contact.phone && !contact.email && !contact.instagram && !contact.birthday && (
              <p className="text-sm text-muted-foreground">Nenhuma informação adicional</p>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Etiquetas</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                {availableTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhuma etiqueta disponível</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                        onClick={() => addTag.mutate({ contactId: contact.id, tagId: tag.id })}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            {contact.tags && contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag) => (
                  <Badge key={tag.id} className="text-white gap-1 pr-1" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag.mutate({ contactId: contact.id, tagId: tag.id })}
                      className="ml-0.5 hover:bg-black/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma etiqueta</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Adicionar nova nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button onClick={handleAddNote} size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nota
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{note.content}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => deleteNote.mutate({ noteId: note.id, contactId: contact.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma nota registrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
