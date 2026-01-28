import React from 'react';
import { Link } from 'react-router-dom';

interface FancyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  variant?: 'marquee' | 'shutter' | 'ghost' | 'solid';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

const FancyButton: React.FC<FancyButtonProps> = ({ 
  children, 
  onClick, 
  to, 
  variant = 'solid', 
  className = '',
  type = 'button',
  fullWidth = false
}) => {
  const baseClasses = `
    relative overflow-hidden font-jura uppercase tracking-widest text-sm font-bold 
    border border-black transition-all duration-300 group
    ${fullWidth ? 'w-full flex justify-center py-4' : 'px-8 py-3 inline-block'}
    ${className}
  `;

  const content = (
    <>
      {variant === 'shutter' && (
        <span className="absolute inset-0 bg-blue-900 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0" />
      )}
      
      {variant === 'marquee' && (
        <div className="absolute inset-0 bg-black text-white flex items-center overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="animate-marquee pl-4">
            {children} &nbsp; // &nbsp; {children} &nbsp; // &nbsp; {children} &nbsp; // &nbsp;
          </div>
        </div>
      )}

      <span className={`relative z-10 flex items-center gap-2 ${variant === 'shutter' ? 'group-hover:text-white transition-colors duration-300' : ''}`}>
        {children}
      </span>
    </>
  );

  const variantClasses = {
    marquee: 'bg-white text-black hover:bg-black hover:text-white',
    shutter: 'bg-white text-black',
    ghost: 'bg-transparent text-black hover:bg-black hover:text-white',
    solid: 'bg-black text-white hover:bg-blue-900 hover:border-blue-900'
  };

  const finalClass = `${baseClasses} ${variantClasses[variant]}`;

  if (to) {
    return (
      <Link to={to} className={finalClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={finalClass}>
      {content}
    </button>
  );
};

export default FancyButton;
