import React from "react";
import styles from "./Button.module.css";
import type { ButtonVariant, ButtonSize } from "./Button.logic";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | "outline"; // Adding 'outline' as it was in original
  size?: ButtonSize;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  ...props
}) => {
  const variantClasses: Record<string, string> = {
    primary: styles.buttonPrimary,
    outline: styles.buttonOutline,
    danger: styles.buttonDanger,
    ghost: styles.buttonGhost,
  };

  const sizeClasses: Record<string, string> = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
  };

  return (
    <button
      className={`${styles.button} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
