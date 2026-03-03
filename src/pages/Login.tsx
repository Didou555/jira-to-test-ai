import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { EarnixLogo } from "@/components/EarnixLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
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
    setIsLoading(true);
    try {
      if (isSignUp) {
        const pwError = validatePassword(password);
        if (pwError) {
          toast({ title: t.invalidPassword, description: pwError, variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast({ title: t.accountCreated, description: t.accountCreatedDesc });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/");
      }
    } catch (error: any) {
      toast({ title: t.error, description: error.message || t.genericError, variant: "destructive" });
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
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription>{isSignUp ? t.signUpDesc : t.signInDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignUp ? t.passwordPlaceholderSignUp : t.passwordPlaceholderSignIn} required autoComplete={isSignUp ? "new-password" : "current-password"} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isSignUp && <p className="text-xs text-muted-foreground">{t.passwordHint}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? t.signUp : t.signIn}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-primary hover:underline">
              {isSignUp ? t.switchToSignIn : t.switchToSignUp}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
