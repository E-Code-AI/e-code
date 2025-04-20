import React, { useEffect, useRef, useState } from 'react';

interface RemoteCursorProps {
  position: {
    lineNumber: number;
    column: number;
  };
  username: string;
  color: string;
  editorElement: HTMLElement | null;
  lineHeight: number;
  charWidth: number;
}

export function RemoteCursor({
  position,
  username,
  color,
  editorElement,
  lineHeight,
  charWidth,
}: RemoteCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  // Calculate cursor position based on line and column
  useEffect(() => {
    if (!editorElement || !cursorRef.current || !labelRef.current) return;
    
    // Calculate position
    const top = (position.lineNumber - 1) * lineHeight;
    const left = (position.column - 1) * charWidth;
    
    // Set cursor position
    cursorRef.current.style.transform = `translate(${left}px, ${top}px)`;
    labelRef.current.style.transform = `translate(${left}px, ${top - 22}px)`;
    
    // Start blinking animation
    setIsVisible(true);
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 500);
    
    return () => clearInterval(interval);
  }, [position, editorElement, lineHeight, charWidth]);
  
  if (!editorElement) return null;
  
  return (
    <>
      {/* Cursor */}
      <div
        ref={cursorRef}
        className="absolute z-10 pointer-events-none"
        style={{
          width: '2px',
          height: `${lineHeight}px`,
          backgroundColor: color,
          opacity: isVisible ? 1 : 0.3,
          transition: 'opacity 0.1s ease-in-out',
        }}
      />
      
      {/* Username label */}
      <div
        ref={labelRef}
        className="absolute z-10 pointer-events-none px-1.5 py-0.5 rounded-sm text-xs font-medium text-white whitespace-nowrap"
        style={{
          backgroundColor: color,
          maxWidth: '150px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {username}
      </div>
    </>
  );
}