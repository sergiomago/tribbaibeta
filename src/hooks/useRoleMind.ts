import { useState, useEffect } from 'react';
import { Mind } from 'llongterm';
import { roleMindService } from '@/services/llongterm/RoleMindService';
import { useToast } from './use-toast';

interface RoleMindState {
  mind: Mind | null;
  loading: boolean;
  error: Error | null;
}

export const useRoleMind = (roleId: string | null) => {
  const [state, setState] = useState<RoleMindState>({
    mind: null,
    loading: true,
    error: null
  });
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const initializeMind = async () => {
      if (!roleId) {
        setState({ mind: null, loading: false, error: null });
        return;
      }

      try {
        // First try to get existing mind
        const existingMind = await roleMindService.getMindForRole(roleId);
        
        if (existingMind && isMounted) {
          setState({ mind: existingMind, loading: false, error: null });
          return;
        }

        // If no existing mind, create a new one
        const newMind = await roleMindService.createMindForRole(roleId, {
          specialism: "AI Assistant",
          specialismDepth: 2,
          metadata: {
            roleId,
            created: new Date().toISOString()
          }
        });

        if (isMounted) {
          setState({ mind: newMind, loading: false, error: null });
          toast({
            title: "Mind Created",
            description: "Successfully initialized role's mind",
          });
        }
      } catch (error) {
        console.error('Error initializing mind:', error);
        if (isMounted) {
          setState({ mind: null, loading: false, error: error as Error });
          toast({
            title: "Error",
            description: "Failed to initialize role's mind",
            variant: "destructive",
          });
        }
      }
    };

    initializeMind();

    return () => {
      isMounted = false;
    };
  }, [roleId, toast]);

  const refreshMind = async () => {
    setState(prev => ({ ...prev, loading: true }));
    await initializeMind();
  };

  const deleteMind = async () => {
    if (!roleId) return;

    try {
      await roleMindService.deleteMindForRole(roleId);
      setState({ mind: null, loading: false, error: null });
      toast({
        title: "Mind Deleted",
        description: "Successfully deleted role's mind",
      });
    } catch (error) {
      console.error('Error deleting mind:', error);
      toast({
        title: "Error",
        description: "Failed to delete role's mind",
        variant: "destructive",
      });
    }
  };

  return {
    ...state,
    refreshMind,
    deleteMind
  };
};