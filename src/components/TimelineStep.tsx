import { CheckCircle } from "lucide-react";

interface TimelineStepProps {
  thought: string;
  decision: string;
  impact?: string;
}

export const TimelineStep = ({ thought, decision, impact }: TimelineStepProps) => {
  return (
    <div className="flex gap-3 mb-4 last:mb-0 animate-fade-in">
      <div className="flex-shrink-0 mt-1">
        <CheckCircle className="w-5 h-5 text-success" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-foreground">{thought}</p>
        <p className="text-sm text-muted-foreground mt-1">{decision}</p>
        {impact && (
          <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
            {impact}
          </span>
        )}
      </div>
    </div>
  );
};
