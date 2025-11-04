import { useEffect, useState } from "react";
import { Progress } from "./ui/progress";

interface SmartProgressBarProps {
  isActive: boolean;
  onComplete?: () => void;
  label?: string;
}

export const SmartProgressBar = ({ isActive, onComplete, label }: SmartProgressBarProps) => {
  const [progress, setProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setIsCompleting(false);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      let newProgress = 0;

      // Non-linear progression:
      // 0-60s (1st minute): 0% → 50% (0.833% per second)
      // 60-120s (2nd minute): 50% → 70% (0.333% per second)
      // 120-180s (3rd minute): 70% → 85% (0.25% per second)
      // 180-360s (4th-6th minutes): 85% → 100% (0.083% per second)

      if (elapsedSeconds <= 60) {
        newProgress = (elapsedSeconds / 60) * 50;
      } else if (elapsedSeconds <= 120) {
        newProgress = 50 + ((elapsedSeconds - 60) / 60) * 20;
      } else if (elapsedSeconds <= 180) {
        newProgress = 70 + ((elapsedSeconds - 120) / 60) * 15;
      } else if (elapsedSeconds <= 360) {
        newProgress = 85 + ((elapsedSeconds - 180) / 180) * 15;
      } else {
        newProgress = 99; // Cap at 99% until response arrives
      }

      setProgress(Math.min(newProgress, 99));
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [isActive]);

  // Handle completion (triggered externally when API responds)
  useEffect(() => {
    if (isCompleting) {
      setProgress(100);
      const timeout = setTimeout(() => {
        if (onComplete) onComplete();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isCompleting, onComplete]);

  // External trigger for completion
  useEffect(() => {
    if (!isActive && progress > 0 && progress < 100) {
      setIsCompleting(true);
    }
  }, [isActive, progress]);

  if (progress === 0 && !isActive) return null;

  return (
    <div className="w-full space-y-2 animate-fade-in">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">{label || "Processing..."}</span>
        <span className="text-muted-foreground font-mono">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      {progress >= 85 && progress < 100 && (
        <p className="text-xs text-muted-foreground italic">
          Almost there... Complex analysis in progress
        </p>
      )}
    </div>
  );
};
