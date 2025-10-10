import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  color: "success" | "destructive" | "secondary" | "primary" | "warning";
}

export const StatCard = ({ icon: Icon, label, value, color }: StatCardProps) => {
  const colorClasses = {
    success: "text-success",
    destructive: "text-destructive",
    secondary: "text-secondary",
    primary: "text-primary",
    warning: "text-warning"
  };

  return (
    <div className="bg-card p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
};
