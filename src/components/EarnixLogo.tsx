import earnixIcon from "@/assets/earnix-icon.png";

interface EarnixLogoProps {
  className?: string;
}

export const EarnixLogo = ({ className = "h-10" }: EarnixLogoProps) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <img src={earnixIcon} alt="Earnix" className="h-[70%] w-auto" />
    <span className="font-bold text-[1.6em] leading-none tracking-wide text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      earnix
    </span>
  </div>
);
