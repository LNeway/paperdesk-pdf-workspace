import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  labelVisible?: boolean;
  active?: boolean;
}

export function IconButton({
  label,
  icon,
  labelVisible = false,
  active,
  className = '',
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${labelVisible ? 'icon-button--with-label' : ''} ${className}`.trim()}
      aria-label={labelVisible ? undefined : label}
      aria-pressed={active === undefined ? undefined : active}
      title={label}
      {...buttonProps}
    >
      <span className="icon-button__icon" aria-hidden="true">
        {icon}
      </span>
      {labelVisible ? <span>{label}</span> : null}
    </button>
  );
}
