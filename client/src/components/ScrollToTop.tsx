import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Parse the hash from the location
    const hash = window.location.hash;
    
    if (hash) {
      // If there's a hash, scroll to that element
      const elementId = hash.replace('#', '');
      
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    } else {
      // No hash, scroll to top
      window.scrollTo({ 
        top: 0, 
        behavior: 'instant' // instant for page changes, smooth for in-page navigation
      });
    }
  }, [location]);

  // Also handle hash changes within the same page
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const elementId = hash.replace('#', '');
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Handle initial load with hash
    if (window.location.hash) {
      handleHashChange();
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return null;
}