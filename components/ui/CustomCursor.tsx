import React, { useEffect, useState } from 'react';

const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.getAttribute('role') === 'button'
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <div
      id="custom-cursor"
      className="fixed pointer-events-none z-[9999] mix-blend-difference text-white transition-transform duration-75 ease-out flex items-center justify-center"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* 
         MINIMALIST DESIGN 
         Default: Tiny 4px Dot
         Hover: Expands to 20px Square Frame
      */}
      
      {/* The Core Dot (Always visible, shrinks slightly on hover) */}
      <div 
        className={`bg-white rounded-full transition-all duration-300 ${isHovering ? 'w-1 h-1' : 'w-1.5 h-1.5'}`}
      />

      {/* The Outer Frame (Only visible on hover) */}
      <div 
        className={`absolute border border-white transition-all duration-300 ease-out ${isHovering ? 'w-6 h-6 opacity-100 rotate-0' : 'w-0 h-0 opacity-0 rotate-45'}`}
      />
      
      {/* Optional: Tiny brackets effect when clicking */}
      {isClicking && (
         <div className="absolute w-8 h-8 border border-white/50 rounded-full animate-ping" />
      )}
    </div>
  );
};

export default CustomCursor;