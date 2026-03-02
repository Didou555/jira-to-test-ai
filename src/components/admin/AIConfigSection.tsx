import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export const AIConfigSection = () => {
  const { toast } = useToast();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSystemPrompt(data.system_prompt || "");
        setModelId(data.model_id || "");
        setConfigId(data.id);
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from("ai_config")
          .update({ system_prompt: systemPrompt, model_id: modelId, updated_at: new Date().toISOString() })
          .eq("id", configId);
        if (error) throw error;
      }
      toast({ title: "Sauvegardé", description: "Configuration IA mise à jour." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration de l'Agent IA</CardTitle>
        <CardDescription>Modifiez le prompt système et le modèle utilisé par l'agent</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="modelId">Modèle Bedrock</Label>
          <Input
            id="modelId"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="anthropic.claude-sonnet-4-20250514-v1:0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="systemPrompt">Prompt Système</Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Instructions pour l'agent IA..."
            className="min-h-[200px]"
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer la configuration IA
        </Button>
      </CardContent>
    </Card>
  );
};
