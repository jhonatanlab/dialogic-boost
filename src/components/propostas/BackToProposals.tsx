import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function BackToProposals() {
  return (
    <Link
      to="/propostas"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar para Propostas
    </Link>
  );
}
