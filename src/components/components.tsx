import React, { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};

interface InstallButtonProps {
  children: ReactNode;
}

export const InstallButton: React.FC<InstallButtonProps> = ({ children }) => {
  return <button className="install-button">{children}</button>;
};

interface ComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
}) => {
  return (
    <div className={className}>
      <select
        value={value}
        // @ts-ignore
        onChange={e => onValueChange(e.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

interface ClipboardButtonProps {
  text: string;
  tooltipCopy: string;
  tooltipCopied: string;
}

export const ClipboardButton: React.FC<ClipboardButtonProps> = ({
  text,
  tooltipCopy,
  tooltipCopied,
}) => {
  return <button title={tooltipCopy}>{'SectionText4'}</button>;
};

interface TooltipContentProps {
  children: ReactNode;
}

export const TooltipContent: React.FC<TooltipContentProps> = ({ children }) => {
  return <div className="tooltip">{children}</div>;
};

// Mock toast function
export const toast = (options: any) => {
  console.log('Toast:', options);
};
