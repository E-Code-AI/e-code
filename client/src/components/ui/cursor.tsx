import React, { useEffect, useRef } from 'react';

interface CursorProps {
  position: {
    lineNumber: number;
    column: number;
  };
  color: string;
  username: string;
  editorElement: HTMLElement | null;
  lineHeight: number;
  charWidth: number;
}

export const RemoteCursor: React.FC<CursorProps> = ({
  position,
  color,
  username,
  editorElement,
  lineHeight,
  charWidth,
}) => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    if (!editorElement || !cursorRef.current) return;
    
    const cursor = cursorRef.current;
    const { lineNumber, column } = position;
    
    // Position the cursor based on line and column
    const top = (lineNumber - 1) * lineHeight;
    const left = (column - 1) * charWidth;
    
    cursor.style.transform = `translate(${left}px, ${top}px)`;
  }, [position, editorElement, lineHeight, charWidth]);
  
  return (
    <div
      ref={cursorRef}
      className="absolute z-10 pointer-events-none"
      style={{ 
        top: 0,
        left: 0,
        transition: 'transform 0.1s ease-in-out'
      }}
    >
      <div 
        className="absolute w-[2px] h-[18px] animate-blink-slow"
        style={{ backgroundColor: color }}
      />
      <div 
        className="absolute px-1 py-0.5 text-[10px] rounded-sm whitespace-nowrap text-white"
        style={{ 
          backgroundColor: color,
          top: '-18px',
          left: '0',
        }}
      >
        {username}
      </div>
    </div>
  );
};