import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, Instagram, MoreVertical, Edit, Trash2, Tags } from "lucide-react";
import { ContactImportExport } from "@/components/contacts/ContactImportExport";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactDetails } from "@/components/contacts/ContactDetails";
import { TagsManager } from "@/components/contacts/TagsManager";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { describeContactSource } from "@/lib/contactSource";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, Contact } from "@/hooks/useContacts";

const Contacts = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const { data: contacts = [], isLoading } = useContacts(searchTerm);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const activeContact = selectedContact
    ? contacts.find((contact) => contact.id === selectedContact.id) ?? selectedContact
    : null;

  const handleCreateContact = (data: any) => {
    createContact.mutate(data);
  };

  const handleUpdateContact = (data: any) => {
    if (editingContact) {
      updateContact.mutate({ ...data, id: editingContact.id });
      setEditingContact(null);
    }
  };

  const handleDeleteContact = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este contato? O histórico relacionado também poderá ser removido.")) {
      deleteContact.mutate(id, {
        onSuccess: () => {
          if (selectedContact?.id === id) {
            setIsDetailsOpen(false);
            setSelectedContact(null);
          }
        },
      });
    }
  };

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailsOpen(true);
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus leads e clientes
            </p>
          </div>
          <div className="flex gap-2">
            <ContactImportExport contacts={contacts} />
            <Button variant="outline" onClick={() => setIsTagsOpen(true)}>
              <Tags className="h-4 w-4 mr-2" />
              Etiquetas
            </Button>
            <Button onClick={() => {
              setEditingContact(null);
              setIsFormOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Instagram</TableHead>
                <TableHead>Etiquetas</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm
                      ? "Nenhum contato encontrado com esse termo"
                      : "Nenhum contato cadastrado. Clique em 'Novo Contato' para começar."}
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(contact)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={contact.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{contact.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.instagram ? (
                        <div className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.instagram}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags && contact.tags.length > 0 ? (
                          contact.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              style={{ backgroundColor: tag.color }}
                              className="text-xs"
                            >
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {contact.tags && contact.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{contact.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(contact)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteContact(contact.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ContactForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={editingContact ? handleUpdateContact : handleCreateContact}
        contact={editingContact || undefined}
      />

      <TagsManager open={isTagsOpen} onOpenChange={setIsTagsOpen} />

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0" hideClose>
          {activeContact && (
            <ContactDetails
              contact={activeContact}
              onClose={() => setIsDetailsOpen(false)}
              onEdit={() => {
                handleEditClick(activeContact);
                setIsDetailsOpen(false);
              }}
              onSendWhatsApp={() => {
                setIsDetailsOpen(false);
                navigate(`/inbox?contactId=${activeContact.id}`);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default Contacts;
