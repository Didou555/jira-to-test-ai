import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { EarnixLogo } from "@/components/EarnixLogo";

const Settings = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = translations[language].settings;
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

  useEffect(() => { if (user) loadApiKeys(); }, [user]);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        method: "GET",
      });
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
      toast({ title: t.error, description: error.message, variant: "destructive" });
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
        jira_base_url: jiraBaseUrl || null, jira_email: jiraEmail || null, jira_api_token: jiraApiToken || null,
        qmetry_api_token: qmetryApiToken || null,
        aws_access_key_id: awsAccessKeyId || null, aws_secret_access_key: awsSecretAccessKey || null,
        aws_region: awsRegion || "us-east-1", aws_session_token: awsSessionToken || null,
      };
      const { error } = await supabase.functions.invoke("manage-api-keys", {
        body: payload,
      });
      if (error) throw error;
      toast({ title: t.saved, description: t.savedDesc });
    } catch (error: any) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => { await signOut(); navigate("/login"); };

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
          <CardTitle>{t.jira}</CardTitle>
          <CardDescription>{t.jiraDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="jiraBaseUrl">{t.jiraBaseUrl}</Label><Input id="jiraBaseUrl" value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} placeholder={t.jiraBaseUrlPlaceholder} /></div>
          <div className="space-y-2"><Label htmlFor="jiraEmail">{t.jiraEmail}</Label><Input id="jiraEmail" type="email" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} placeholder={t.jiraEmailPlaceholder} /></div>
          <div className="space-y-2"><Label htmlFor="jiraToken">{t.jiraToken}</Label><SecretInput id="jiraToken" value={jiraApiToken} onChange={setJiraApiToken} show={showJiraToken} onToggle={() => setShowJiraToken(!showJiraToken)} placeholder={t.jiraTokenPlaceholder} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t.qmetry}</CardTitle><CardDescription>{t.qmetryDesc}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="qmetryToken">{t.qmetryToken}</Label><SecretInput id="qmetryToken" value={qmetryApiToken} onChange={setQmetryApiToken} show={showQmetryToken} onToggle={() => setShowQmetryToken(!showQmetryToken)} placeholder={t.qmetryTokenPlaceholder} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t.aws}</CardTitle><CardDescription>{t.awsDesc}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="awsAccessKey">{t.awsAccessKey}</Label><Input id="awsAccessKey" value={awsAccessKeyId} onChange={(e) => setAwsAccessKeyId(e.target.value)} placeholder={t.awsAccessKeyPlaceholder} /></div>
          <div className="space-y-2"><Label htmlFor="awsSecret">{t.awsSecret}</Label><SecretInput id="awsSecret" value={awsSecretAccessKey} onChange={setAwsSecretAccessKey} show={showAwsSecret} onToggle={() => setShowAwsSecret(!showAwsSecret)} placeholder={t.awsSecretPlaceholder} /></div>
          <div className="space-y-2"><Label htmlFor="awsRegion">{t.awsRegion}</Label><Input id="awsRegion" value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} placeholder="us-east-1" /></div>
          <div className="space-y-2"><Label htmlFor="awsSession">{t.awsSession}</Label><SecretInput id="awsSession" value={awsSessionToken} onChange={setAwsSessionToken} show={showAwsSession} onToggle={() => setShowAwsSession(!showAwsSession)} placeholder={t.awsSessionPlaceholder} /></div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        {t.save}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-foreground">QA Agent AI - POC</h1>
          <EarnixLogo className="h-10" />
          <div className="w-[140px]" /> {/* spacer to center logo */}
        </div>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.back}
          </Button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isAdmin && (
              <span className="flex items-center gap-1 text-sm text-primary font-medium">
                <ShieldCheck className="h-4 w-4" /> Admin
              </span>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> {t.logout}
            </Button>
          </div>
        </div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        {isAdmin ? (
          <Tabs defaultValue="mykeys">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mykeys">{t.myKeys}</TabsTrigger>
              <TabsTrigger value="ai">{t.aiAgent}</TabsTrigger>
              <TabsTrigger value="users">{t.users}</TabsTrigger>
            </TabsList>
            <TabsContent value="mykeys" className="mt-6">{MyKeysContent}</TabsContent>
            <TabsContent value="ai" className="mt-6"><AIConfigSection /></TabsContent>
            <TabsContent value="users" className="mt-6"><UserManagementSection /></TabsContent>
          </Tabs>
        ) : MyKeysContent}
      </div>
    </div>
  );
};

export default Settings;
