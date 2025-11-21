
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-75 disabled:pointer-events-none';

  const variantClasses = {
    primary: 'bg-[#0054A6] text-white hover:bg-[#004a94] shadow-md focus:ring-[#0054A6] focus:ring-offset-[#FDF3E6]',
    secondary: 'bg-white text-[#0054A6] border border-[#0054A6] hover:bg-blue-50 focus:ring-[#0054A6] focus:ring-offset-[#FDF3E6]',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;