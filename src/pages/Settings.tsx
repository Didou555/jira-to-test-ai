import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save, Eye, EyeOff, LogOut, ShieldCheck } from "lucide-react";
import { AIConfigSection } from "@/components/admin/AIConfigSection";
import { UserManagementSection } from "@/components/admin/UserManagementSection";

const Settings = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [qmetryApiToken, setQmetryApiToken] = useState("");
  const [awsAccessKeyId, setAwsAccessKeyId] = useState("");
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsSessionToken, setAwsSessionToken] = useState("");

  const [showJiraToken, setShowJiraToken] = useState(false);
  const [showQmetryToken, setShowQmetryToken] = useState(false);
  const [showAwsSecret, setShowAwsSecret] = useState(false);
  const [showAwsSession, setShowAwsSession] = useState(false);

  useEffect(() => {
    if (user) loadApiKeys();
  }, [user]);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setJiraBaseUrl(data.jira_base_url || "");
        setJiraEmail(data.jira_email || "");
        setJiraApiToken(data.jira_api_token || "");
        setQmetryApiToken(data.qmetry_api_token || "");
        setAwsAccessKeyId(data.aws_access_key_id || "");
        setAwsSecretAccessKey(data.aws_secret_access_key || "");
        setAwsRegion(data.aws_region || "us-east-1");
        setAwsSessionToken(data.aws_session_token || "");
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        jira_base_url: jiraBaseUrl || null,
        jira_email: jiraEmail || null,
        jira_api_token: jiraApiToken || null,
        qmetry_api_token: qmetryApiToken || null,
        aws_access_key_id: awsAccessKeyId || null,
        aws_secret_access_key: awsSecretAccessKey || null,
        aws_region: awsRegion || "us-east-1",
        aws_session_token: awsSessionToken || null,
      };
      const { error } = await supabase.from("user_api_keys").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Sauvegardé", description: "Vos clés API ont été enregistrées." });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const SecretInput = ({ value, onChange, show, onToggle, placeholder, id }: {
    value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string; id: string;
  }) => (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const MyKeysContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Jira</CardTitle>
          <CardDescription>Configuration de votre connexion Jira Atlassian</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jiraBaseUrl">URL de base Jira</Label>
            <Input id="jiraBaseUrl" value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} placeholder="company.atlassian.net" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jiraEmail">Email Jira</Label>
            <Input id="jiraEmail" type="email" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} placeholder="vous@entreprise.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jiraToken">Token API Jira</Label>
            <SecretInput id="jiraToken" value={jiraApiToken} onChange={setJiraApiToken} show={showJiraToken} onToggle={() => setShowJiraToken(!showJiraToken)} placeholder="Votre token API Jira" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QMetry</CardTitle>
          <CardDescription>Token d'accès à l'API QMetry</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qmetryToken">Token API QMetry</Label>
            <SecretInput id="qmetryToken" value={qmetryApiToken} onChange={setQmetryApiToken} show={showQmetryToken} onToggle={() => setShowQmetryToken(!showQmetryToken)} placeholder="Votre token QMetry" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AWS Bedrock</CardTitle>
          <CardDescription>Credentials AWS pour accéder à Bedrock (temporaires via SSO recommandé)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="awsAccessKey">Access Key ID</Label>
            <Input id="awsAccessKey" value={awsAccessKeyId} onChange={(e) => setAwsAccessKeyId(e.target.value)} placeholder="AKIA..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awsSecret">Secret Access Key</Label>
            <SecretInput id="awsSecret" value={awsSecretAccessKey} onChange={setAwsSecretAccessKey} show={showAwsSecret} onToggle={() => setShowAwsSecret(!showAwsSecret)} placeholder="Votre Secret Access Key" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awsRegion">Région AWS</Label>
            <Input id="awsRegion" value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} placeholder="us-east-1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awsSession">Session Token (optionnel - SSO)</Label>
            <SecretInput id="awsSession" value={awsSessionToken} onChange={setAwsSessionToken} show={showAwsSession} onToggle={() => setShowAwsSession(!showAwsSession)} placeholder="Token de session temporaire" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Enregistrer les paramètres
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="flex items-center gap-1 text-sm text-primary font-medium">
                <ShieldCheck className="h-4 w-4" /> Admin
              </span>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </Button>
          </div>
        </div>

        <h1 className="text-3xl font-bold">Paramètres</h1>

        {isAdmin ? (
          <Tabs defaultValue="mykeys">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mykeys">Mes Clés API</TabsTrigger>
              <TabsTrigger value="ai">Agent IA</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            </TabsList>
            <TabsContent value="mykeys" className="mt-6">{MyKeysContent}</TabsContent>
            <TabsContent value="ai" className="mt-6"><AIConfigSection /></TabsContent>
            <TabsContent value="users" className="mt-6"><UserManagementSection /></TabsContent>
          </Tabs>
        ) : (
          MyKeysContent
        )}
      </div>
    </div>
  );
};

export default Settings;
