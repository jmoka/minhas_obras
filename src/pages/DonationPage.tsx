import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSetting } from "@/integrations/supabase/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Copy, Check, MessageCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { showSuccess, showError } from "@/utils/toast";

const DonationPage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["donationSettings"],
    queryFn: async () => {
      const pixKey = await getSetting("pix_key");
      const adminWhatsApp = await getSetting("admin_whatsapp");
      return { pixKey, adminWhatsApp };
    },
  });

  const handleCopy = () => {
    if (settings?.pixKey) {
      navigator.clipboard.writeText(settings.pixKey);
      setCopied(true);
      showSuccess("Chave PIX copiada!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppClick = () => {
    if (!settings?.adminWhatsApp) {
      showError("O número de contato do administrador não está configurado.");
      return;
    }
    const message = "Olá! Acabei de fazer uma doação para a plataforma Minhas Artes e gostaria de enviar o comprovante para receber meu recibo.";
    const whatsappUrl = `https://wa.me/${settings.adminWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="space-y-12">
      <div className="text-center">
        <Heart className="h-16 w-16 mx-auto text-pink-500 mb-4 animate-pulse" />
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-orange-500 to-yellow-400">
          Apoie Nossa Comunidade
        </h1>
        <p className="mt-4 text-lg text-stone-600 max-w-2xl mx-auto">
          Sua doação é o combustível que mantém nossa galeria viva e pulsante. Com seu apoio, podemos continuar a oferecer um espaço para artistas exporem seus talentos, além de manter e aprimorar as ferramentas de IA que os auxiliam em sua jornada criativa.
        </p>
      </div>

      <Card className="shadow-xl border-2 border-pink-100">
        <CardHeader>
          <CardTitle className="text-2xl">Faça sua doação via PIX</CardTitle>
          <CardDescription>É rápido, seguro e nos ajuda imensamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : settings?.pixKey ? (
            <>
              <div>
                <label className="text-sm font-medium">Chave PIX</label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={settings.pixKey} className="font-mono" />
                  <Button onClick={handleCopy} variant="outline">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-2">{copied ? "Copiado!" : "Copiar"}</span>
                  </Button>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center space-y-4">
                <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  Passo Final: Envie o Comprovante
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Após efetuar a doação, por favor, clique no botão abaixo para enviar o comprovante via WhatsApp. Assim, poderemos registrar sua contribuição e enviar um recibo de agradecimento!
                </p>
                <Button 
                  onClick={handleWhatsAppClick}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold"
                  disabled={!settings.adminWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Enviar Comprovante por WhatsApp
                </Button>
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sistema de Doação Indisponível</AlertTitle>
              <AlertDescription>
                O administrador ainda não configurou uma chave PIX. Por favor, volte mais tarde.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationPage;