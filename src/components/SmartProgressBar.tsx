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

      // Non-linear progression (10 minutes):
      // 0-60s (1st minute): 0% → 40% (0.667% per second)
      // 60-120s (2nd minute): 40% → 60% (0.333% per second)
      // 120-180s (3rd minute): 60% → 72% (0.2% per second)
      // 180-300s (4th-5th minutes): 72% → 82% (0.083% per second)
      // 300-600s (6th-10th minutes): 82% → 99% (0.057% per second)

      if (elapsedSeconds <= 60) {
        newProgress = (elapsedSeconds / 60) * 40;
      } else if (elapsedSeconds <= 120) {
        newProgress = 40 + ((elapsedSeconds - 60) / 60) * 20;
      } else if (elapsedSeconds <= 180) {
        newProgress = 60 + ((elapsedSeconds - 120) / 60) * 12;
      } else if (elapsedSeconds <= 300) {
        newProgress = 72 + ((elapsedSeconds - 180) / 120) * 10;
      } else if (elapsedSeconds <= 600) {
        newProgress = 82 + ((elapsedSeconds - 300) / 300) * 17;
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
      {progress >= 82 && progress < 100 && (
        <p className="text-xs text-muted-foreground italic">
          Almost there... Complex analysis in progress
        </p>
      )}
    </div>
  );
};
