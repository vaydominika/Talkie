import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
const styles = cva("inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-primary text-primary-foreground", outline: "border bg-background hover:bg-muted", ghost: "hover:bg-muted" } }, defaultVariants: { variant: "default" } });
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof styles> { asChild?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, asChild, ...props }, ref) => { const Component = asChild ? Slot : "button"; return <Component ref={ref} className={cn(styles({ variant }), className)} {...props} />; }); Button.displayName = "Button";
