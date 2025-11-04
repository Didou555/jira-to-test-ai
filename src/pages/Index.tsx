import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { CheckCircle, Shield, Star, Zap, Loader2, AlertTriangle, Globe, List, ChevronDown, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatCard } from "@/components/StatCard";
import { TimelineStep } from "@/components/TimelineStep";
import { FolderTree } from "@/components/FolderTree";
import { SmartProgressBar } from "@/components/SmartProgressBar";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

// Allow overriding the backend base URL via Vite env var
// Example: set VITE_API_BASE_URL in .env to your n8n base URL
const API_BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL || "https://superambitious-cohen-roentgenologically.ngrok-free.dev";

// Dev-only diagnostic logging to confirm which backend URL is used
if ((import.meta as any)?.env?.DEV) {
  console.log("VITE_API_BASE_URL:", (import.meta as any).env?.VITE_API_BASE_URL);
  console.log("Effective API_BASE_URL:", API_BASE_URL);
}

interface StoryData {
  storyId: string;
  storyTitle: string;
}

interface AgentAnalysis {
  criticalityLevel: "HIGH" | "MEDIUM" | "LOW";
  securityRequired: boolean;
  performanceRequired: boolean;
  minTestCases: number;
}

interface TestCaseMetrics {
  generated: number;
  properlyFormatted: number;
  target: number;
  minimum: number;
  percentageOfTarget: number;
}

interface QualityMetrics {
  score: number;
  maxScore: number;
  breakdown: {
    structure: number;
    format: number;
    quantity: number;
    special: number;
    quality: number;
  };
  iterations: number;
}

interface AgentReasoning {
  thought: string;
  decision: string;
  impact?: string;
}

const Index = () => {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  
  const [jiraUrl, setJiraUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const [existingTestPlan, setExistingTestPlan] = useState<any>(null);
  const [updateMode, setUpdateMode] = useState(false);
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [agentAnalysis, setAgentAnalysis] = useState<AgentAnalysis | null>(null);
  const [testCaseMetrics, setTestCaseMetrics] = useState<TestCaseMetrics | null>(null);
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
  
  // Qmetry Export States
  const [showTestCaseList, setShowTestCaseList] = useState(false);
  const [testCaseList, setTestCaseList] = useState<any[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [testCasesWithDetails, setTestCasesWithDetails] = useState<any[]>([]);
  const [qmetryFolders, setQmetryFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedQmetryFolder, setSelectedQmetryFolder] = useState<{id: string, name: string} | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  // Progress bar states
  const [showGenerateProgress, setShowGenerateProgress] = useState(false);
  const [showCorrectionProgress, setShowCorrectionProgress] = useState(false);
  const [showDetailsProgress, setShowDetailsProgress] = useState(false);

  const { toast } = useToast();

  const getLanguageName = (lang: Language) => {
    const names = { fr: "Français", en: "English", ru: "Русский" };
    return names[lang];
  };

  const handleGenerate = async () => {
    if (!jiraUrl.trim()) {
      toast({
        title: t.toasts.urlRequired,
        description: t.toasts.urlRequiredDesc,
        variant: "destructive",
      });
      return;
    }

    if (!jiraUrl.includes("atlassian.net/browse/")) {
      toast({
        title: t.toasts.urlInvalid,
        description: t.toasts.urlInvalidDesc,
        variant: "destructive",
      });
      return;
    }

    setIsCheckingExisting(true);
    setIsGenerating(false);
    setStoryData(null);
    setTestPlan(null);
    setAgentReasoning([]);
    setExistingTestPlan(null);
    setUpdateMode(false);

    try {
      const issueKey = jiraUrl.split('/').pop();
      
      const checkResponse = await axios.post(`${API_BASE_URL}/webhook/check-existing-testplan`, {
        issueKey: issueKey,
      });

      if (checkResponse.data.exists) {
        setExistingTestPlan({
          subtaskKey: checkResponse.data.subtaskKey,
          subtaskUrl: checkResponse.data.subtaskUrl,
          summary: checkResponse.data.summary,
          created: checkResponse.data.created,
          currentTestPlan: checkResponse.data.testPlanContent,
        });
        setIsCheckingExisting(false);
        return;
      }

      setIsCheckingExisting(false);
      await generateTestPlan(false);
    } catch (error) {
      console.error("Erreur:", error);
      setIsCheckingExisting(false);
      await generateTestPlan(false);
    }
  };

  const handleUpdateExisting = async () => {
    setUpdateMode(true);
    await generateTestPlan(true);
  };

  const handleCreateNew = async () => {
    setUpdateMode(false);
    await generateTestPlan(false);
  };

  const generateTestPlan = async (isUpdate: boolean) => {
    setIsGenerating(true);
    setShowGenerateProgress(true);

    try {
      const requestBody: any = {
        jiraUrl,
        action: "generate",
        userId: "demo-user",
      };

      if (isUpdate && existingTestPlan) {
        requestBody.updateMode = true;
        requestBody.existingTestPlan = existingTestPlan.currentTestPlan;
        requestBody.existingSubtaskKey = existingTestPlan.subtaskKey;
      }

      const response = await axios.post(`${API_BASE_URL}/webhook/generate-testplan`, requestBody, {
        timeout: 360000 // 6 minutes timeout for AI generation
      });

      setStoryData({
        storyId: response.data.storyId,
        storyTitle: response.data.storyTitle,
      });
      setAgentAnalysis(response.data.agentAnalysis);
      setTestCaseMetrics(response.data.testCaseMetrics);
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
        title: t.toasts.errorGenerate,
        description: t.toasts.errorGenerateDesc,
        variant: "destructive",
      });
    } finally {
      setShowGenerateProgress(false);
      // Wait 1 second before clearing loading state (shows 100% completion)
      setTimeout(() => {
        setIsGenerating(false);
      }, 1000);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);

    try {
      if (updateMode && existingTestPlan) {
        await axios.post(`${API_BASE_URL}/webhook/update-testplan`, {
          subtaskKey: existingTestPlan.subtaskKey,
          storyTitle: storyData?.storyTitle,
          testPlan: testPlan,
          testPlanId: testPlanId,
          action: "update",
        });

        toast({
          title: t.toasts.testPlanUpdated,
          description: t.toasts.testPlanUpdatedDesc,
        });

        setSubtaskKey(existingTestPlan.subtaskKey);
        setSubtaskUrl(existingTestPlan.subtaskUrl);
      } else {
        const response = await axios.post(`${API_BASE_URL}/webhook/approve-testplan`, {
          parentIssueKey: storyData?.storyId,
          storyTitle: storyData?.storyTitle,
          testPlan: testPlan,
          testPlanId: testPlanId,
          action: "approve",
        });

        setSubtaskKey(response.data.subtaskKey);
        setSubtaskUrl(response.data.subtaskUrl);
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: t.toasts.errorApprove,
        description: t.toasts.errorApproveDesc,
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCorrection = async () => {
    if (!feedbackText.trim()) {
      toast({
        title: t.toasts.feedbackRequired,
        description: t.toasts.feedbackRequiredDesc,
        variant: "destructive",
      });
      return;
    }

    setShowCorrectionModal(false);
    setIsGenerating(true);
    setShowCorrectionProgress(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/webhook/request-correction`, {
        testPlanId: testPlanId,
        originalTestPlan: testPlan,
        feedback: feedbackText,
        iteration: qualityMetrics?.iterations,
      }, {
        timeout: 360000 // 6 minutes timeout for AI regeneration
      });

      setTestPlan(response.data.testPlan);
      setTestPlanId(response.data.testPlanId);
      setQualityMetrics({
        ...qualityMetrics!,
        iterations: response.data.iteration,
      });
      setFeedbackText("");

      toast({
        title: t.toasts.testPlanRegenerated,
        description: t.toasts.testPlanRegeneratedDesc,
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: t.toasts.errorCorrection,
        description: t.toasts.errorCorrectionDesc,
        variant: "destructive",
      });
    } finally {
      setShowCorrectionProgress(false);
      // Wait 1 second before clearing loading state (shows 100% completion)
      setTimeout(() => {
        setIsGenerating(false);
      }, 1000);
    }
  };

  const resetForm = () => {
    setJiraUrl("");
    setStoryData(null);
    setTestPlan(null);
    setAgentReasoning([]);
    setTestPlanId(null);
    setTestCaseMetrics(null);
    setQualityMetrics(null);
    setAgentAnalysis(null);
    setExistingTestPlan(null);
    setUpdateMode(false);
    setShowSuccessModal(false);
    setSubtaskKey("");
    setSubtaskUrl("");
    setShowTestCaseList(false);
    setTestCaseList([]);
    setSelectedTestCases([]);
    setTestCasesWithDetails([]);
    setQmetryFolders([]);
    setSelectedFolderId(null);
    setSelectedQmetryFolder(null);
    setIsLoadingFolders(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Qmetry Export Functions
  const handleShowTestCases = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/webhook/parse-test-cases`, {
        testPlan: testPlan,
      });

      setTestCaseList(response.data.testCases || []);
      setShowTestCaseList(true);

      toast({
        title: t.toasts.testCasesParsed,
        description: t.toasts.testCasesParsedDesc.replace("{count}", String(response.data.testCases?.length || 0)),
      });
    } catch (error) {
      console.error("Error parsing test cases:", error);
      toast({
        title: t.toasts.errorParsing,
        description: t.toasts.errorParsingDesc,
        variant: "destructive",
      });
    }
  };

  const handleSelectAllTestCases = () => {
    if (selectedTestCases.length === testCaseList.length) {
      setSelectedTestCases([]);
    } else {
      setSelectedTestCases(testCaseList.map((tc: any) => tc.id));
    }
  };

  const handleToggleTestCase = (testCaseId: string) => {
    setSelectedTestCases((prev) =>
      prev.includes(testCaseId) ? prev.filter((id) => id !== testCaseId) : [...prev, testCaseId]
    );
  };

  const handleGenerateDetails = async () => {
    if (selectedTestCases.length === 0) {
      toast({
        title: t.toasts.selectTestCases,
        description: t.toasts.selectTestCasesDesc,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDetails(true);
    setShowDetailsProgress(true);

    try {
      const selectedTCs = testCaseList.filter((tc: any) => selectedTestCases.includes(tc.id));

      const response = await axios.post(`${API_BASE_URL}/webhook/generate-test-case-details`, {
        selectedTestCases: selectedTCs,
        storyContext: {
          storyId: storyData?.storyId,
          storyTitle: storyData?.storyTitle,
          description: "Context from story",
        },
      }, {
        timeout: 360000 // 6 minutes timeout for test case details
      });

      setTestCasesWithDetails(response.data.testCasesWithDetails || []);

      toast({
        title: t.toasts.testCasesGenerated,
        description: t.toasts.testCasesGeneratedDesc.replace("{count}", String(response.data.testCasesWithDetails?.length || 0)),
      });

      setTimeout(() => {
        document.getElementById("detailed-test-cases")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (error) {
      console.error("Error generating details:", error);
      toast({
        title: t.toasts.errorGeneratingDetails,
        description: t.toasts.errorGeneratingDetailsDesc,
        variant: "destructive",
      });
    } finally {
      setShowDetailsProgress(false);
      // Wait 1 second before clearing loading state (shows 100% completion)
      setTimeout(() => {
        setIsGeneratingDetails(false);
      }, 1000);
    }
  };

  const handleLoadQmetryFolders = async () => {
    setIsLoadingFolders(true);
    
    try {
      toast({
        title: "Loading folders",
        description: "Fetching QMetry folders...",
      });

      // Simple GET request vers le flow n8n
      const response = await axios.get(
        `${API_BASE_URL}/webhook/get-qmetry-folders`,
        {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          },
          timeout: 30000 // 30 secondes timeout
        }
      );

      if (!response.data.folders || !Array.isArray(response.data.folders)) {
        throw new Error("Invalid response format from server");
      }

      const folders = response.data.folders;
      console.log('✅ Folders received:', folders);

      // Afficher les dossiers
      setQmetryFolders(folders);
      setShowFolderModal(true);
      
      toast({
        title: "Folders loaded",
        description: `${folders.length} folder(s) available`,
      });

    } catch (error) {
      console.error('Error loading QMetry folders:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load QMetry folders",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleExportToQmetry = async () => {
    if (!selectedFolderId) {
      toast({
        title: t.toasts.errorExporting,
        description: "Please select a folder first",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/webhook/export-to-qmetry`, {
        testCasesWithDetails: testCasesWithDetails,
        selectedFolderId: selectedFolderId,
      });

      toast({
        title: t.toasts.exportSuccess,
        description: t.toasts.exportSuccessDesc.replace("{count}", String(testCasesWithDetails.length)),
      });

      // Reset Qmetry export states
      setShowTestCaseList(false);
      setTestCaseList([]);
      setSelectedTestCases([]);
      setTestCasesWithDetails([]);
      setSelectedFolderId(null);
    } catch (error) {
      console.error("Error exporting to Qmetry:", error);
      toast({
        title: t.toasts.errorExporting,
        description: t.toasts.errorExportingDesc,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "P0":
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      case "P1":
        return "bg-warning/10 text-warning hover:bg-warning/20";
      default:
        return "bg-primary/10 text-primary hover:bg-primary/20";
    }
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
          <h1 className="text-xl font-bold text-primary">{t.header.title}</h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-secondary text-secondary">
              {t.header.demo}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  {getLanguageName(language)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage("fr")}>
                  🇫🇷 Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")}>
                  🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("ru")}>
                  🇷🇺 Русский
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Card 1: Sélection de la Story */}
        <Card className="mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle>{t.step1.title}</CardTitle>
            <CardDescription>{t.step1.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jiraUrl">
                {t.step1.label} <span className="text-destructive">{t.step1.required}</span>
              </Label>
              <Input
                id="jiraUrl"
                type="url"
                placeholder={t.step1.placeholder}
                value={jiraUrl}
                onChange={(e) => setJiraUrl(e.target.value)}
                className="h-12"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isCheckingExisting || !jiraUrl.trim()}
              className="w-full h-12"
              size="lg"
            >
              {isCheckingExisting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.step1.checking}
                </>
              ) : isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.step1.analyzing}
                </>
              ) : (
                t.step1.generateButton
              )}
            </Button>

            {/* Progress Bar for AI Generation */}
            {showGenerateProgress && (
              <div className="mt-4">
                <SmartProgressBar
                  isActive={showGenerateProgress}
                  label={t.step1.analyzing}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 1.5 : Détection de Test Plan Existant */}
        {existingTestPlan && (
          <Card className="mb-6 border-2 border-warning bg-warning/5 animate-fade-in">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t.existingPlan.title}
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    {t.existingPlan.description}
                  </p>
                  <div className="bg-card rounded-lg p-4 mb-4 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="border-primary text-primary">
                        {existingTestPlan.subtaskKey}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t.existingPlan.createdOn} {new Date(existingTestPlan.created).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{existingTestPlan.summary}</p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {t.existingPlan.question}
                  </p>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleUpdateExisting}
                      className="bg-warning hover:bg-warning/90 text-warning-foreground flex-1"
                      disabled={isGenerating}
                    >
                      {t.existingPlan.update}
                    </Button>
                    <Button
                      onClick={handleCreateNew}
                      variant="outline"
                      className="border-warning text-warning hover:bg-warning/10 flex-1"
                      disabled={isGenerating}
                    >
                      {t.existingPlan.createNew}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 2: AI Agent Analysis */}
        {storyData && agentAnalysis && testCaseMetrics && qualityMetrics && (
          <Card className="mb-6 border-2 border-primary bg-primary/5 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-primary">{t.reasoning.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm">
                  <strong>{t.reasoning.storyAnalyzed}:</strong> {storyData.storyId}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-warning" />
                <span className="text-sm">
                  <strong>{t.reasoning.criticalityDetected}:</strong> {agentAnalysis.criticalityLevel}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm">
                  <strong>{t.reasoning.testCasesGenerated}:</strong> {testCaseMetrics.generated} ({t.reasoning.target}: {testCaseMetrics.target})
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-success" />
                <span className="text-sm">
                  <strong>{t.reasoning.qualityScore}:</strong> {qualityMetrics.score}/{qualityMetrics.maxScore}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                <span className="text-sm">
                  <strong>{t.reasoning.securityTests}:</strong> {agentAnalysis.securityRequired ? `${t.reasoning.required} (${t.reasoning.owasp})` : t.reasoning.notRequired}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                <span className="text-sm">
                  <strong>{t.reasoning.performanceTests}:</strong> {agentAnalysis.performanceRequired ? t.reasoning.required : t.reasoning.notRequired}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 3: Aperçu de la Story */}
        {storyData && agentAnalysis && testCaseMetrics && qualityMetrics && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle>{t.storyDetails.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="border-primary text-primary">
                  {storyData.storyId}
                </Badge>
                <Badge className={getCriticalityBadgeColor(agentAnalysis.criticalityLevel)}>
                  {t.storyDetails.criticality}: {agentAnalysis.criticalityLevel}
                </Badge>
                <Badge className="bg-success/10 text-success hover:bg-success/20">
                  {testCaseMetrics.generated} {t.storyDetails.testCases}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-xl font-semibold">{storyData.storyTitle}</h3>
              <div className="border-t my-4" />
              
              {/* Test Case Metrics */}
              <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                <h4 className="font-semibold text-sm">{t.storyDetails.testCoverage}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.storyDetails.generated}:</span>
                    <span className="font-medium">{testCaseMetrics.generated} {t.storyDetails.testCases}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.storyDetails.properlyFormatted}:</span>
                    <span className="font-medium">{testCaseMetrics.properlyFormatted}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.storyDetails.target}:</span>
                    <span className="font-medium">{testCaseMetrics.generated} / {testCaseMetrics.target}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.storyDetails.progress}:</span>
                      <span className="font-medium">{testCaseMetrics.percentageOfTarget}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          testCaseMetrics.percentageOfTarget >= 90 ? 'bg-success' :
                          testCaseMetrics.percentageOfTarget >= 70 ? 'bg-warning' : 'bg-destructive'
                        }`}
                        style={{ width: `${Math.min(testCaseMetrics.percentageOfTarget, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  icon={Shield}
                  label={t.storyDetails.security}
                  value={agentAnalysis.securityRequired ? t.storyDetails.required : t.storyDetails.notRequired}
                  color={agentAnalysis.securityRequired ? "destructive" : "success"}
                />
                <StatCard
                  icon={Star}
                  label={t.storyDetails.qualityScore}
                  value={`${qualityMetrics.score}/${qualityMetrics.maxScore}`}
                  color={qualityMetrics.score >= 9.0 ? "success" : qualityMetrics.score >= 7.0 ? "warning" : "destructive"}
                />
                <StatCard
                  icon={Zap}
                  label={t.storyDetails.iterations}
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
              <CardTitle>
                {updateMode ? t.testPlan.titleUpdated : t.testPlan.titleGenerated}
              </CardTitle>
              {updateMode && existingTestPlan && (
                <Badge className="bg-warning/10 text-warning hover:bg-warning/20 mt-2 w-fit">
                  {t.testPlan.updateMode} {existingTestPlan.subtaskKey}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-6 rounded-lg border max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
                <ReactMarkdown>{testPlan}</ReactMarkdown>
              </div>

              <div className="border-t my-8" />

              {/* Bouton Afficher Test Cases */}
              <div className="flex justify-center mb-4">
                <Button
                  onClick={handleShowTestCases}
                  variant="outline"
                  size="lg"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <List className="mr-2 h-5 w-5" />
                  {t.qmetryExport.showTestCasesButton}
                </Button>
              </div>

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
                      {updateMode ? t.testPlan.updating : t.testPlan.approving}
                    </>
                  ) : (
                    updateMode ? t.testPlan.updateButton : t.testPlan.approveButton
                  )}
                </Button>
                <Button
                  onClick={() => setShowCorrectionModal(true)}
                  variant="outline"
                  size="lg"
                  className="border-warning text-warning hover:bg-warning/10"
                >
                  {t.testPlan.correctionButton}
                </Button>
              </div>

              {/* Progress Bar for AI Regeneration */}
              {showCorrectionProgress && (
                <div className="mt-4 pt-4 border-t">
                  <SmartProgressBar
                    isActive={showCorrectionProgress}
                    label={t.testPlan.regenerating || "Regenerating test plan..."}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 5: Liste des Test Cases avec Checkboxes */}
        {showTestCaseList && testCaseList.length > 0 && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {t.qmetryExport.listTitle}{" "}
                  <Badge variant="outline" className="ml-2">
                    {testCaseList.length}
                  </Badge>
                </CardTitle>
                <Button
                  onClick={handleSelectAllTestCases}
                  variant="outline"
                  size="sm"
                >
                  {selectedTestCases.length === testCaseList.length
                    ? t.qmetryExport.deselectAll
                    : t.qmetryExport.selectAll}
                </Button>
              </div>
              <CardDescription>{t.qmetryExport.listDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  {t.qmetryExport.selectedCount
                    .replace("{count}", String(selectedTestCases.length))
                    .replace("{total}", String(testCaseList.length))}
                </p>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {testCaseList.map((testCase: any) => (
                  <div
                    key={testCase.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={testCase.id}
                      checked={selectedTestCases.includes(testCase.id)}
                      onCheckedChange={() => handleToggleTestCase(testCase.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={testCase.id}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {testCase.id}: {testCase.title}
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Badge className={getPriorityBadgeColor(testCase.priority)}>
                          {testCase.priority}
                        </Badge>
                        {testCase.category && (
                          <Badge variant="outline">{testCase.category}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t my-6" />

              <div className="flex justify-center">
                <Button
                  onClick={handleGenerateDetails}
                  disabled={selectedTestCases.length === 0 || isGeneratingDetails}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  {isGeneratingDetails ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t.qmetryExport.generating}
                    </>
                  ) : (
                    <>
                      <Star className="mr-2 h-5 w-5" />
                      {t.qmetryExport.generateDetailsButton}
                    </>
                  )}
                </Button>
              </div>

              {/* Progress Bar for Test Case Details Generation */}
              {showDetailsProgress && (
                <div className="mt-6">
                  <SmartProgressBar
                    isActive={showDetailsProgress}
                    label={t.qmetryExport.generating || "Generating detailed test cases..."}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 6: Test Cases Détaillés */}
        {testCasesWithDetails.length > 0 && (
          <Card id="detailed-test-cases" className="mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle>{t.qmetryExport.detailsTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {testCasesWithDetails.map((testCase: any, index: number) => (
                  <AccordionItem
                    key={testCase.id || index}
                    value={`item-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Badge className={getPriorityBadgeColor(testCase.priority)}>
                          {testCase.priority}
                        </Badge>
                        <span className="font-semibold">
                          {testCase.id}: {testCase.title}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      {/* Description */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2">
                          {t.qmetryExport.description}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {testCase.description}
                        </p>
                      </div>

                      {/* Preconditions */}
                      {testCase.preconditions && testCase.preconditions.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">
                            {t.qmetryExport.preconditions}
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {testCase.preconditions.map((precondition: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground">
                                {precondition}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Test Steps */}
                      {testCase.testSteps && testCase.testSteps.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">
                            {t.qmetryExport.testSteps}
                          </h4>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="text-left p-2 font-semibold">
                                    {t.qmetryExport.step}
                                  </th>
                                  <th className="text-left p-2 font-semibold">
                                    {t.qmetryExport.action}
                                  </th>
                                  <th className="text-left p-2 font-semibold">
                                    {t.qmetryExport.expectedResult}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {testCase.testSteps.map((step: any, i: number) => (
                                  <tr key={i} className="border-t">
                                    <td className="p-2">{step.step}</td>
                                    <td className="p-2 text-muted-foreground">
                                      {step.action}
                                    </td>
                                    <td className="p-2 text-muted-foreground">
                                      {step.expectedResult}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="flex gap-4 text-sm">
                        {testCase.estimatedTime && (
                          <div>
                            <span className="font-semibold">{t.qmetryExport.estimatedTime}:</span>{" "}
                            <span className="text-muted-foreground">{testCase.estimatedTime}</span>
                          </div>
                        )}
                        {testCase.labels && testCase.labels.length > 0 && (
                          <div className="flex gap-2">
                            <span className="font-semibold">{t.qmetryExport.labels}:</span>
                            {testCase.labels.map((label: string, i: number) => (
                              <Badge key={i} variant="outline">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="border-t my-6" />

              {/* Section Sélection Dossier et Export */}
              <div className="space-y-4">
                {!selectedFolderId ? (
                  <div className="flex justify-center">
                    <Button
                      onClick={handleLoadQmetryFolders}
                      size="lg"
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                      disabled={isLoadingFolders}
                    >
                      {isLoadingFolders ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          <FolderOpen className="mr-2 h-5 w-5" />
                          {t.qmetryExport.selectFolderButton}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 p-3 bg-success/10 border border-success rounded-lg">
                      <FolderOpen className="h-5 w-5 text-success" />
                      <span className="font-semibold text-success">
                        {t.qmetryExport.selectedFolder}:{" "}
                        {selectedQmetryFolder?.name || qmetryFolders.find((f) => f.id === selectedFolderId)?.name || "Selected"}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        onClick={handleExportToQmetry}
                        disabled={isExporting}
                        size="lg"
                        className="bg-success hover:bg-success/90"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {t.qmetryExport.exporting}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            {t.qmetryExport.exportButton}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modal: Demande de Correction */}
      <Dialog open={showCorrectionModal} onOpenChange={setShowCorrectionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.correctionModal.title}</DialogTitle>
            <DialogDescription>
              {t.correctionModal.helper}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t.correctionModal.placeholder}
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
              {t.correctionModal.cancel}
            </Button>
            <Button onClick={handleCorrection} disabled={!feedbackText.trim()}>
              {t.correctionModal.regenerate}
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
            <DialogTitle className="text-2xl">{t.successModal.title}</DialogTitle>
            <DialogDescription>
              {t.successModal.description.replace('{key}', subtaskKey)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => window.open(subtaskUrl, "_blank")}
              size="lg"
              className="w-full"
            >
              {t.successModal.viewInJira}
            </Button>
            <Button
              onClick={resetForm}
              variant="outline"
              size="lg"
              className="w-full"
            >
              {t.successModal.createAnother}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Sélection Dossier Qmetry */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.qmetryExport.folderModalTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <RadioGroup
              value={selectedFolderId?.toString()}
              onValueChange={(value) => {
                const folderId = Number(value);
                // Fonction récursive pour trouver le dossier dans l'arbre
                const findFolder = (folders: any[], id: number): any => {
                  for (const folder of folders) {
                    if (folder.id === id) return folder;
                    if (folder.children) {
                      const found = findFolder(folder.children, id);
                      if (found) return found;
                    }
                  }
                  return null;
                };
                
                const folder = findFolder(qmetryFolders, folderId);
                setSelectedFolderId(folderId);
                if (folder) {
                  setSelectedQmetryFolder({ id: folder.id.toString(), name: folder.name });
                }
              }}
            >
              <FolderTree
                folders={qmetryFolders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={(folderId, folderName) => {
                  setSelectedFolderId(folderId);
                  setSelectedQmetryFolder({ id: folderId.toString(), name: folderName });
                }}
              />
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowFolderModal(false);
                if (selectedQmetryFolder) {
                  toast({
                    title: "Folder selected",
                    description: selectedQmetryFolder.name,
                  });
                }
              }}
              disabled={!selectedFolderId}
              className="w-full"
            >
              {t.qmetryExport.confirmFolder}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
