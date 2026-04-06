import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

const PublicCheckIn = () => {
  const { urlToken } = useParams();
  const navigate = useNavigate();
  const [checkinToken, setCheckinToken] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCheckin = async () => {
      if (!urlToken) {
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("public-checkin", {
          body: { urlToken },
        });

        if (error || !data) {
          console.error("Erro no check-in:", error);
          setStatus("error");
          setErrorMsg("Link de check-in inválido ou expirado.");
          return;
        }

        setCheckinToken(data.token);
        setStatus("success");

        const { whatsappNumber, linkName, token } = data;

        if (!whatsappNumber) {
          setStatus("error");
          setErrorMsg("Número de WhatsApp não configurado para este check-in.");
          return;
        }

        const message = `Estou fazendo meu check-in! ✅\n\nOrigem: ${linkName}\nToken: ${token}`;
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 1500);
      } catch (err) {
        console.error("Erro durante check-in:", err);
        setStatus("error");
        setErrorMsg("Erro inesperado ao processar check-in.");
      }
    };

    handleCheckin();
  }, [urlToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold">Processando Check-in...</h2>
          </>
        )}
        {status === "success" && (
          <>
            <div className="flex justify-center">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <Loader2 className="h-16 w-16 text-primary animate-spin absolute top-0 left-0 opacity-50" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Check-in Confirmado! ✅</h2>
            <p className="text-muted-foreground">Redirecionando para o WhatsApp...</p>
            {checkinToken && (
              <p className="text-sm text-muted-foreground font-mono">Token: {checkinToken}</p>
            )}
          </>
        )}
        {status === "error" && (
          <>
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold">Erro no Check-in</h2>
            <p className="text-muted-foreground">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicCheckIn;
