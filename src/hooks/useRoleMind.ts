
import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { RoleFormValues } from '@/components/roles/RoleForm';
import { supabase } from '@/lib/supabase';

interface RoleMindState {
  loading: boolean;
  error: Error | null;
}

export const useRoleMind = (roleId: string | null) => {
  const [state, setState] = useState<RoleMindState>({
    loading: true,
    error: null
  });
  const { toast } = useToast();

  const updateMindStatus = async (roleId: string, status: string, errorMessage?: string) => {
    if (!roleId) return;
    
    await supabase
      .from('roles')
      .update({
        mind_status: status,
        mind_error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId);
  };

  const initializeMind = async () => {
    if (!roleId) {
      setState({ loading: false, error: null });
      return;
    }

    try {
      await updateMindStatus(roleId, 'active');
      setState({ loading: false, error: null });
      toast({
        title: "Role Initialized",
        description: "Successfully initialized role",
      });
    } catch (error) {
      console.error('Error initializing role:', error);
      setState({ loading: false, error: error as Error });
      toast({
        title: "Error",
        description: "Failed to initialize role",
        variant: "destructive",
      });
    }
  };

  const refreshMind = async (updates: RoleFormValues) => {
    if (!roleId) return;

    setState(prev => ({ ...prev, loading: true }));
    try {
      await updateMindStatus(roleId, 'active');
      setState({ loading: false, error: null });
      toast({
        title: "Role Updated",
        description: "Successfully refreshed role",
      });
    } catch (error) {
      console.error('Error refreshing role:', error);
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      toast({
        title: "Error",
        description: "Failed to refresh role",
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
      await updateMindStatus(roleId, 'deleted');
      setState({ loading: false, error: null });
      toast({
        title: "Role Deleted",
        description: "Successfully deleted role",
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete role",
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
