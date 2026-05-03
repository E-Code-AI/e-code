import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function UserSettings() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate('/settings', { replace: true });
  }, [navigate]);
  return null;
}
