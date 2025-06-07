import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContainer component that ensures all pages use a consistent layout
 * and utilize 98% of the available space.
 */
export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`w-full h-full p-4 ${className}`}>
      <div className="w-[98%] h-full mx-auto bg-white rounded-lg shadow-sm">
        <div className="h-full p-6">
          {children}
        </div>
      </div>
    </div>
  );
}