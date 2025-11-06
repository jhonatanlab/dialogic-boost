import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";
import { generateCheckinToken } from "@/hooks/useCheckinRecords";

const PublicCheckIn = () => {
  const { urlToken } = useParams();
  const navigate = useNavigate();
  const [checkinToken, setCheckinToken] = useState<string>("");

  useEffect(() => {
    const handleCheckin = async () => {
      if (!urlToken) {
        navigate("/");
        return;
      }

      try {
        // Get the checkin link details
        const { data: checkinLink, error: linkError } = await supabase
          .from("checkin_links")
          .select("*")
          .eq("url_token", urlToken)
          .maybeSingle();

        if (linkError || !checkinLink) {
          console.error("Link não encontrado:", linkError);
          navigate("/");
          return;
        }

        // Generate unique token for this check-in
        const token = generateCheckinToken();
        setCheckinToken(token);

        // Create checkin record with token
        const { error: recordError } = await supabase
          .from("checkin_records")
          .insert({
            checkin_link_id: checkinLink.id,
            user_id: checkinLink.user_id,
            status: "pending",
            token,
          });

        if (recordError) {
          console.error("Erro ao registrar check-in:", recordError);
          return;
        }

        // Redirect to WhatsApp with message including token
        const message = `Estou fazendo meu check-in! ✅\n\nOrigem: ${checkinLink.name}\nToken: ${token}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        
        // Small delay to show confirmation
        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 1500);

      } catch (error) {
        console.error("Erro durante check-in:", error);
        navigate("/");
      }
    };

    handleCheckin();
  }, [urlToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <Loader2 className="h-16 w-16 text-primary animate-spin absolute top-0 left-0 opacity-50" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Check-in Confirmado! ✅</h2>
        <p className="text-muted-foreground">
          Redirecionando para o WhatsApp...
        </p>
        {checkinToken && (
          <p className="text-sm text-muted-foreground font-mono">
            Token: {checkinToken}
          </p>
        )}
      </div>
    </div>
  );
};

export default PublicCheckIn;
