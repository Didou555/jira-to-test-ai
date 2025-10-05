import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { CheckCircle, Shield, Star, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/StatCard";
import { TimelineStep } from "@/components/TimelineStep";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "https://superambitious-cohen-roentgenologically.ngrok-free.dev";

interface StoryData {
  storyId: string;
  storyTitle: string;
}

interface AgentAnalysis {
  criticalityLevel: "HIGH" | "MEDIUM" | "LOW";
  totalTestCases: number;
  securityRequired: boolean;
}

interface QualityMetrics {
  score: number;
  iterations: number;
}

interface AgentReasoning {
  thought: string;
  decision: string;
  impact?: string;
}

const Index = () => {
  const [jiraUrl, setJiraUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [agentAnalysis, setAgentAnalysis] = useState<AgentAnalysis | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [agentReasoning, setAgentReasoning] = useState<AgentReasoning[]>([]);
  const [testPlan, setTestPlan] = useState<string | null>(null);
  const [testPlanId, setTestPlanId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [subtaskKey, setSubtaskKey] = useState("");
  const [subtaskUrl, setSubtaskUrl] = useState("");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!jiraUrl.trim()) {
      toast({
        title: "⚠️ URL requise",
        description: "Veuillez entrer une URL Jira valide",
        variant: "destructive",
      });
      return;
    }

    if (!jiraUrl.includes("atlassian.net/browse/")) {
      toast({
        title: "⚠️ URL invalide",
        description: "L'URL doit contenir 'atlassian.net/browse/'",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setStoryData(null);
    setTestPlan(null);
    setAgentReasoning([]);

    try {
      const response = await axios.post(`${API_BASE_URL}/webhook/generate-testplan`, {
        jiraUrl,
        action: "generate",
        userId: "demo-user",
      });

      setStoryData({
        storyId: response.data.storyId,
        storyTitle: response.data.storyTitle,
      });
      setAgentAnalysis(response.data.agentAnalysis);
      setQualityMetrics(response.data.qualityMetrics);
      setAgentReasoning(response.data.agentReasoning);
      setTestPlan(response.data.testPlan);
      setTestPlanId(response.data.testPlanId);

      setTimeout(() => {
        document.getElementById("testplan-card")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "❌ Erreur",
        description: "Erreur lors de la génération du test plan",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/webhook/approve-testplan`, {
        parentIssueKey: storyData?.storyId,
        storyTitle: storyData?.storyTitle,
        testPlan: testPlan,
        testPlanId: testPlanId,
        action: "approve",
      });

      setSubtaskKey(response.data.subtaskKey);
      setSubtaskUrl(response.data.subtaskUrl);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "❌ Erreur",
        description: "Erreur lors de la création de la sub-task",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCorrection = async () => {
    if (!feedbackText.trim()) {
      toast({
        title: "⚠️ Feedback requis",
        description: "Veuillez entrer votre feedback",
        variant: "destructive",
      });
      return;
    }

    setShowCorrectionModal(false);
    setIsGenerating(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/webhook/request-correction`, {
        testPlanId: testPlanId,
        originalTestPlan: testPlan,
        feedback: feedbackText,
        iteration: qualityMetrics?.iterations,
      });

      setTestPlan(response.data.testPlan);
      setTestPlanId(response.data.testPlanId);
      setQualityMetrics({
        ...qualityMetrics!,
        iterations: response.data.iteration,
      });
      setFeedbackText("");

      toast({
        title: "✅ Test plan régénéré",
        description: "Le test plan a été mis à jour avec vos améliorations",
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "❌ Erreur",
        description: "Erreur lors de la correction",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setJiraUrl("");
    setStoryData(null);
    setTestPlan(null);
    setAgentReasoning([]);
    setTestPlanId(null);
    setQualityMetrics(null);
    setAgentAnalysis(null);
    setShowSuccessModal(false);
    setSubtaskKey("");
    setSubtaskUrl("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getCriticalityBadgeColor = (level: string) => {
    switch (level) {
      case "HIGH":
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      case "MEDIUM":
        return "bg-warning/10 text-warning hover:bg-warning/20";
      default:
        return "bg-success/10 text-success hover:bg-success/20";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-primary">🤖 QA Agent IA - POC</h1>
          <Badge variant="outline" className="border-secondary text-secondary">
            Demo
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Card 1: Sélection de la Story */}
        <Card className="mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle>📋 Étape 1 : Sélectionner une Story Jira</CardTitle>
            <CardDescription>Collez l'URL complète de votre story Jira</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jiraUrl">
                URL de la Story Jira <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jiraUrl"
                type="url"
                placeholder="https://qaautomation-demo.atlassian.net/browse/KAN-5"
                value={jiraUrl}
                onChange={(e) => setJiraUrl(e.target.value)}
                className="h-12"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !jiraUrl.trim()}
              className="w-full h-12"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  L'agent IA analyse la story...
                </>
              ) : (
                "🤖 Générer le Test Plan avec l'Agent IA"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Raisonnement de l'Agent */}
        {agentReasoning.length > 0 && (
          <Card className="mb-6 border-2 border-primary bg-primary/5 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-primary">🧠 Raisonnement de l'Agent IA</CardTitle>
            </CardHeader>
            <CardContent>
              {agentReasoning.map((step, i) => (
                <TimelineStep
                  key={i}
                  thought={step.thought}
                  decision={step.decision}
                  impact={step.impact}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Card 3: Aperçu de la Story */}
        {storyData && agentAnalysis && qualityMetrics && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle>📖 Détails de la Story</CardTitle>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="border-primary text-primary">
                  {storyData.storyId}
                </Badge>
                <Badge className={getCriticalityBadgeColor(agentAnalysis.criticalityLevel)}>
                  Criticité: {agentAnalysis.criticalityLevel}
                </Badge>
                <Badge className="bg-success/10 text-success hover:bg-success/20">
                  {agentAnalysis.totalTestCases} test cases
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-xl font-semibold">{storyData.storyTitle}</h3>
              <div className="border-t my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  icon={Shield}
                  label="Sécurité"
                  value={agentAnalysis.securityRequired ? "Requise" : "Non requise"}
                  color={agentAnalysis.securityRequired ? "destructive" : "success"}
                />
                <StatCard
                  icon={Star}
                  label="Score Qualité"
                  value={`${qualityMetrics.score}/10`}
                  color="success"
                />
                <StatCard
                  icon={Zap}
                  label="Itérations"
                  value={qualityMetrics.iterations.toString()}
                  color="secondary"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 4: Test Plan Généré */}
        {testPlan && (
          <Card id="testplan-card" className="mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle>✨ Test Plan Généré par l'Agent IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-6 rounded-lg border max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
                <ReactMarkdown>{testPlan}</ReactMarkdown>
              </div>

              <div className="border-t my-8" />

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  size="lg"
                  className="bg-success hover:bg-success/90"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Création de la sub-task en cours...
                    </>
                  ) : (
                    "✅ Approuver & Créer Sub-task Jira"
                  )}
                </Button>
                <Button
                  onClick={() => setShowCorrectionModal(true)}
                  variant="outline"
                  size="lg"
                  className="border-warning text-warning hover:bg-warning/10"
                >
                  ✏️ Demander une Correction
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modal: Demande de Correction */}
      <Dialog open={showCorrectionModal} onOpenChange={setShowCorrectionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>💬 Quelle amélioration souhaitez-vous ?</DialogTitle>
            <DialogDescription>
              L'agent IA va analyser votre feedback et régénérer le test plan
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Exemple : Ajouter plus de tests de sécurité pour les cas d'injection SQL et XSS..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCorrectionModal(false);
                setFeedbackText("");
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleCorrection} disabled={!feedbackText.trim()}>
              🔄 Régénérer avec ces améliorations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Succès */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="w-16 h-16 text-success" />
            </div>
            <DialogTitle className="text-2xl">🎉 Sub-task Créée avec Succès !</DialogTitle>
            <DialogDescription>
              La sub-task {subtaskKey} a été créée dans Jira
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => window.open(subtaskUrl, "_blank")}
              size="lg"
              className="w-full"
            >
              🔗 Voir dans Jira
            </Button>
            <Button
              onClick={resetForm}
              variant="outline"
              size="lg"
              className="w-full"
            >
              ➕ Créer un Autre Test Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
