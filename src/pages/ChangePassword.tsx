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
import { KeyRound, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { EarnixLogo } from "@/components/EarnixLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, signOut } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = translations[language].login;
  const tc = translations[language].changePassword;

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 12) return t.pwMin12;
    if (!/[A-Z]/.test(pw)) return t.pwUppercase;
    if (!/[a-z]/.test(pw)) return t.pwLowercase;
    if (!/[0-9]/.test(pw)) return t.pwDigit;
    if (!/[^A-Za-z0-9]/.test(pw)) return t.pwSpecial;
    return null;
  };

  const handleBack = async () => {
    await signOut();
    navigate("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: t.invalidPassword, description: tc.mismatch, variant: "destructive" });
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
      if (user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("user_id", user.id);
      }
      toast({ title: tc.success, description: tc.successDesc });
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
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <EarnixLogo className="h-10 mb-8" />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">{tc.title}</CardTitle>
          <CardDescription>{tc.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{tc.newPassword}</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.passwordPlaceholderSignUp} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t.passwordHint}</p>
            </div>
            <div className="space-y-2">
              <Label>{tc.confirmPassword}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={tc.confirmPlaceholder} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc.submit}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tc.back}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
