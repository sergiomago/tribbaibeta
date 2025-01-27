import { useState, useEffect } from 'react';
import { Mind } from 'llongterm';
import { roleMindService } from '@/services/llongterm/RoleMindService';
import { useToast } from './use-toast';
import { RoleFormValues } from '@/components/roles/RoleForm';

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

  const initializeMind = async () => {
    if (!roleId) {
      setState({ mind: null, loading: false, error: null });
      return;
    }

    try {
      // First try to get existing mind
      const existingMind = await roleMindService.getMindForRole(roleId);
      
      if (existingMind) {
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

      setState({ mind: newMind, loading: false, error: null });
      toast({
        title: "Mind Created",
        description: "Successfully initialized role's mind",
      });
    } catch (error) {
      console.error('Error initializing mind:', error);
      setState({ mind: null, loading: false, error: error as Error });
      toast({
        title: "Error",
        description: "Failed to initialize role's mind",
        variant: "destructive",
      });
    }
  };

  const refreshMind = async (updates: RoleFormValues) => {
    if (!roleId) return;

    setState(prev => ({ ...prev, loading: true }));
    try {
      // First, update the mind status
      await roleMindService.updateMindStatus(roleId, 'updating');

      // Kill the existing mind if it exists
      if (state.mind) {
        await state.mind.kill();
      }

      // Create a new mind with updated parameters
      const newMind = await roleMindService.createMindForRole(roleId, {
        specialism: updates.name,
        specialismDepth: 2,
        metadata: {
          roleId,
          updated: new Date().toISOString(),
          special_capabilities: updates.special_capabilities
        }
      });

      setState({ mind: newMind, loading: false, error: null });
      toast({
        title: "Mind Updated",
        description: "Successfully refreshed role's mind",
      });
    } catch (error) {
      console.error('Error refreshing mind:', error);
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      toast({
        title: "Error",
        description: "Failed to refresh role's mind",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (!isMounted) return;
      await initializeMind();
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [roleId]);

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