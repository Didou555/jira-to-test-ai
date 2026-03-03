import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { EarnixLogo } from "@/components/EarnixLogo";

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = translations[language].login;

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 12) return t.pwMin12;
    if (!/[A-Z]/.test(pw)) return t.pwUppercase;
    if (!/[a-z]/.test(pw)) return t.pwLowercase;
    if (!/[0-9]/.test(pw)) return t.pwDigit;
    if (!/[^A-Za-z0-9]/.test(pw)) return t.pwSpecial;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: t.error, description: language === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.", variant: "destructive" });
      return;
    }
    const pwError = validatePassword(newPassword);
    if (pwError) {
      toast({ title: t.invalidPassword, description: pwError, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      // Mark password as changed
      if (user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("user_id", user.id);
      }
      toast({ title: language === "fr" ? "Mot de passe modifié" : "Password changed", description: language === "fr" ? "Votre mot de passe a été mis à jour." : "Your password has been updated." });
      navigate("/");
    } catch (error: any) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 left-4">
        <h1 className="text-lg font-bold text-foreground">QA Agent AI - POC</h1>
      </div>
      <EarnixLogo className="h-10 mb-8" />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {language === "fr" ? "Changement de mot de passe" : language === "ru" ? "Смена пароля" : "Change Password"}
          </CardTitle>
          <CardDescription>
            {language === "fr" ? "Vous devez changer votre mot de passe avant de continuer." : language === "ru" ? "Вы должны сменить пароль перед продолжением." : "You must change your password before continuing."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "fr" ? "Nouveau mot de passe" : "New password"}</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.passwordPlaceholderSignUp} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t.passwordHint}</p>
            </div>
            <div className="space-y-2">
              <Label>{language === "fr" ? "Confirmer le mot de passe" : "Confirm password"}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={language === "fr" ? "Confirmez le mot de passe" : "Confirm password"} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {language === "fr" ? "Valider" : language === "ru" ? "Подтвердить" : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
