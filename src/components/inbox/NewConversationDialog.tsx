import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Loader2, MessageSquare, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

interface ContactResult {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export function NewConversationDialog({ open, onOpenChange, onConversationCreated }: NewConversationDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [contacts, setContacts] = useState<ContactResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setContacts([]);
      setShowCreateForm(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchContacts(searchTerm.trim());
      } else {
        setContacts([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchContacts = async (term: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, email")
        .or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
        .order("name")
        .limit(20);
      if (error) throw error;
      setContacts(data || []);
    } catch {
      toast.error("Erro ao buscar contatos");
    } finally {
      setIsSearching(false);
    }
  };

  const openConversationForContact = async (contactId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      // Check if conversation already exists
      let query = supabase
        .from("conversations")
        .select("id")
        .eq("contact_id", contactId);

      if (profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        onConversationCreated(existing.id);
        onOpenChange(false);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          contact_id: contactId,
          channel: "whatsapp",
          status: "open",
          company_id: profile?.company_id || null,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique constraint — conversation was created concurrently
          const { data: retry } = await supabase
            .from("conversations")
            .select("id")
            .eq("contact_id", contactId)
            .eq("company_id", profile?.company_id || "")
            .single();
          if (retry) {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            onConversationCreated(retry.id);
            onOpenChange(false);
            return;
          }
        }
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onConversationCreated(newConv.id);
      onOpenChange(false);
      toast.success("Conversa iniciada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao abrir conversa");
    }
  };

  const handleCreateContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      const { data: contact, error } = await supabase
        .from("contacts")
        .insert({
          user_id: user.id,
          name: newName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim() || null,
          company_id: profile?.company_id || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato criado!");
      await openConversationForContact(contact.id);
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.error("Já existe um contato com esse telefone");
      } else {
        toast.error("Erro ao criar contato");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Nova Conversa
          </DialogTitle>
        </DialogHeader>

        {!showCreateForm ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato por nome, telefone ou email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            <ScrollArea className="max-h-[300px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : contacts.length > 0 ? (
                <div className="space-y-1">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => openConversationForContact(contact.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {contact.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phone || contact.email || "Sem telefone"}
                        </p>
                      </div>
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              ) : searchTerm.length >= 2 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhum contato encontrado</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Digite para buscar um contato</p>
                </div>
              )}
            </ScrollArea>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Criar novo contato
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome do contato"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone (WhatsApp) *</Label>
              <Input
                placeholder="5511999999999"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateForm(false)}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateContact}
                disabled={isCreating || !newName.trim() || !newPhone.trim()}
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar e iniciar conversa
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
