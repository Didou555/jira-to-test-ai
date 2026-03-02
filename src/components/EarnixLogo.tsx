import earnixLogo from "@/assets/earnix-logo.svg";

interface EarnixLogoProps {
  className?: string;
}

export const EarnixLogo = ({ className = "h-10" }: EarnixLogoProps) => (
  <div className={`flex items-center justify-center ${className}`}>
    <img src={earnixLogo} alt="Earnix" className="h-full w-auto" />
  </div>
);
