import { useState, useEffect } from 'react';

interface OrderReviewProps {
  className?: string;
  children?: React.ReactNode;
}

export default function OrderReview({ className, children }: OrderReviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(false);
  }, []);
  
  if (isLoading) {
    return <div className={className}>Loading...</div>;
  }
  
  return (
    <div className={`orderreview undefined`}>
      <div className="orderreview-content">
        {children}
      </div>
    </div>
  );
}