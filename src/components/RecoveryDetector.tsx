import { useEffect } from 'react';

/**
 * RecoveryDetector - Detects password recovery mode BEFORE Supabase auto-login
 * 
 * This component must run first in the component tree to detect the recovery
 * hash parameter and store a flag before Supabase processes the authentication.
 */
const RecoveryDetector: React.FC = () => {
  useEffect(() => {
    // Check if URL contains recovery parameters
    const hash = window.location.hash;
    
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      // If this is a recovery link, set the flag in sessionStorage
      if (type === 'recovery' && accessToken) {
        sessionStorage.setItem('passwordRecoveryMode', 'true');
        
        // If we're not on /auth, redirect there immediately
        // This handles cases where Supabase redirects to root (/)
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth' + window.location.hash;
        }
        // Do NOT clear the hash - let Supabase process it
      }
    }
  }, []);

  // This component renders nothing
  return null;
};

export default RecoveryDetector;
