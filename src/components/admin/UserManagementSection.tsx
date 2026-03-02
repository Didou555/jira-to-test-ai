import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Eye, EyeOff, KeyRound, Save } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
}

export const UserManagementSection = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // API Keys form for selected user
  const [apiKeysUserId, setApiKeysUserId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState({
    jira_base_url: "",
    jira_email: "",
    jira_api_token: "",
    qmetry_api_token: "",
    aws_access_key_id: "",
    aws_secret_access_key: "",
    aws_region: "us-east-1",
    aws_session_token: "",
  });
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      setUsers(data || []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return;
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: { email: newEmail, password: newPassword, displayName: newDisplayName || undefined },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Utilisateur créé", description: `${newEmail} a été créé avec succès.` });
      setShowAddUser(false);
      setNewEmail("");
      setNewPassword("");
      setNewDisplayName("");
      // Reload users after a short delay (profile trigger)
      setTimeout(() => loadUsers(), 1500);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const openApiKeys = async (userId: string) => {
    setApiKeysUserId(userId);
    setShowApiKeys(userId);
    try {
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setApiKeys({
          jira_base_url: data.jira_base_url || "",
          jira_email: data.jira_email || "",
          jira_api_token: data.jira_api_token || "",
          qmetry_api_token: data.qmetry_api_token || "",
          aws_access_key_id: data.aws_access_key_id || "",
          aws_secret_access_key: data.aws_secret_access_key || "",
          aws_region: data.aws_region || "us-east-1",
          aws_session_token: data.aws_session_token || "",
        });
      } else {
        setApiKeys({
          jira_base_url: "", jira_email: "", jira_api_token: "", qmetry_api_token: "",
          aws_access_key_id: "", aws_secret_access_key: "", aws_region: "us-east-1", aws_session_token: "",
        });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveApiKeys = async () => {
    if (!apiKeysUserId) return;
    setIsSavingKeys(true);
    try {
      const payload = {
        user_id: apiKeysUserId,
        jira_base_url: apiKeys.jira_base_url || null,
        jira_email: apiKeys.jira_email || null,
        jira_api_token: apiKeys.jira_api_token || null,
        qmetry_api_token: apiKeys.qmetry_api_token || null,
        aws_access_key_id: apiKeys.aws_access_key_id || null,
        aws_secret_access_key: apiKeys.aws_secret_access_key || null,
        aws_region: apiKeys.aws_region || "us-east-1",
        aws_session_token: apiKeys.aws_session_token || null,
      };
      const { error } = await supabase.from("user_api_keys").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Sauvegardé", description: "Clés API mises à jour." });
      setShowApiKeys(null);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingKeys(false);
    }
  };

  const toggleSecret = (key: string) => setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));

  const SecretField = ({ label, field, placeholder }: { label: string; field: keyof typeof apiKeys; placeholder: string }) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={showSecrets[field] ? "text" : "password"}
          value={apiKeys[field]}
          onChange={(e) => setApiKeys((prev) => ({ ...prev, [field]: e.target.value }))}
          placeholder={placeholder}
        />
        <button type="button" onClick={() => toggleSecret(field)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {showSecrets[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestion des Utilisateurs</CardTitle>
              <CardDescription>Ajoutez des utilisateurs et gérez leurs clés API</CardDescription>
            </div>
            <Button onClick={() => setShowAddUser(true)}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter un utilisateur
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.display_name || u.username || "—"}</TableCell>
                  <TableCell>{u.username || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openApiKeys(u.user_id)}>
                      <KeyRound className="h-4 w-4 mr-1" /> Clés API
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>Créez un nouveau compte utilisateur</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom d'affichage</Label>
              <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="Jean Dupont" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@entreprise.com" />
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mot de passe" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>Annuler</Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys Dialog */}
      <Dialog open={!!showApiKeys} onOpenChange={() => setShowApiKeys(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clés API de l'utilisateur</DialogTitle>
            <DialogDescription>Configurez les clés API pour cet utilisateur</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Jira</h4>
            <div className="space-y-1">
              <Label>URL de base</Label>
              <Input value={apiKeys.jira_base_url} onChange={(e) => setApiKeys((p) => ({ ...p, jira_base_url: e.target.value }))} placeholder="company.atlassian.net" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={apiKeys.jira_email} onChange={(e) => setApiKeys((p) => ({ ...p, jira_email: e.target.value }))} placeholder="user@company.com" />
            </div>
            <SecretField label="Token API Jira" field="jira_api_token" placeholder="Token Jira" />

            <h4 className="font-semibold text-sm pt-2">QMetry</h4>
            <SecretField label="Token API QMetry" field="qmetry_api_token" placeholder="Token QMetry" />

            <h4 className="font-semibold text-sm pt-2">AWS Bedrock</h4>
            <div className="space-y-1">
              <Label>Access Key ID</Label>
              <Input value={apiKeys.aws_access_key_id} onChange={(e) => setApiKeys((p) => ({ ...p, aws_access_key_id: e.target.value }))} placeholder="AKIA..." />
            </div>
            <SecretField label="Secret Access Key" field="aws_secret_access_key" placeholder="Secret Key" />
            <div className="space-y-1">
              <Label>Région</Label>
              <Input value={apiKeys.aws_region} onChange={(e) => setApiKeys((p) => ({ ...p, aws_region: e.target.value }))} placeholder="eu-west-1" />
            </div>
            <SecretField label="Session Token" field="aws_session_token" placeholder="Token de session" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeys(null)}>Annuler</Button>
            <Button onClick={handleSaveApiKeys} disabled={isSavingKeys}>
              {isSavingKeys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
