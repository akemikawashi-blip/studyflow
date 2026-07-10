import { cn } from "@/lib/utils";

export type ProgressRingProps = {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { pixels: 96, stroke: 8, text: "text-xl" },
  md: { pixels: 132, stroke: 10, text: "text-3xl" },
  lg: { pixels: 172, stroke: 12, text: "text-4xl" },
};

export function ProgressRing({ value, label = "Complete", size = "md", className }: ProgressRingProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const config = sizes[size];
  const radius = (config.pixels - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: config.pixels, height: config.pixels }}
      aria-label={`${normalizedValue}% ${label}`}
      role="img"
    >
      <svg className="-rotate-90" height={config.pixels} width={config.pixels} aria-hidden="true">
        <circle
          className="stroke-surface-container-highest"
          cx={config.pixels / 2}
          cy={config.pixels / 2}
          fill="none"
          r={radius}
          strokeWidth={config.stroke}
        />
        <circle
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
          cx={config.pixels / 2}
          cy={config.pixels / 2}
          fill="none"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={config.stroke}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <strong className={cn("font-semibold tracking-tight", config.text)}>{normalizedValue}%</strong>
        <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
