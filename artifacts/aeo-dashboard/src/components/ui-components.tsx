import React, { useId } from 'react';
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// --- Card ---
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border-2 border-border bg-transparent hover:bg-slate-50 hover:border-slate-300 text-slate-700",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      destructive: "bg-destructive text-destructive-foreground shadow-md shadow-destructive/25 hover:bg-destructive/90 hover:-translate-y-0.5",
      success: "bg-success text-success-foreground shadow-md shadow-success/25 hover:bg-success/90 hover:-translate-y-0.5"
    };
    
    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg"
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 ease-out active:translate-y-0",
          "disabled:opacity-50 disabled:pointer-events-none disabled:transform-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// --- Input ---
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, id, ...props }, ref) => {
    const defaultId = useId(); // Generates a unique ID like :r0:
    const inputId = id || defaultId; // Use the passed ID, or fallback to the generated one

    return (
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground transition-all duration-200",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// --- Badge ---
export function Badge({ children, variant = "default", className }: { children: React.ReactNode, variant?: "default"|"secondary"|"success"|"warning"|"destructive"|"idle", className?: string }) {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    secondary: "bg-slate-100 text-slate-600 border-slate-200",
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    destructive: "bg-red-100 text-red-800 border-red-200",
    idle: "bg-slate-100 text-slate-600 border-slate-200"
  };
  
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", variants[variant], className)}>
      {children}
    </span>
  );
}

// --- Page Header ---
export function PageHeader({ title, description, children }: { title: string, description?: string, children?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl sm:text-4xl text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-slate-500 text-lg">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}
