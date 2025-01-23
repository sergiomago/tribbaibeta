import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Session, User, AuthError, AuthApiError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error);
        handleAuthError(error);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event);
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        navigate("/login");
      } else if (event === 'INITIAL_SESSION') {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getErrorMessage = (error: AuthError) => {
    if (error instanceof AuthApiError) {
      switch (error.status) {
        case 400:
          if (error.message.includes('Invalid login credentials')) {
            return 'Invalid email or password. Please check your credentials and try again.';
          }
          if (error.message.includes('Email not confirmed')) {
            return 'Please verify your email address before signing in.';
          }
          if (error.message.includes('refresh_token_not_found')) {
            return 'Your session has expired. Please sign in again.';
          }
          break;
        case 422:
          return 'Invalid email format. Please enter a valid email address.';
        case 429:
          return 'Too many login attempts. Please try again later.';
      }
    }
    return error.message;
  };

  const handleAuthError = (error: any) => {
    console.error("Auth error:", error);
    
    // Check for refresh token errors and session expiration
    if (error.message?.includes('refresh_token_not_found') || 
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('JWT expired')) {
      setSession(null);
      setUser(null);
      navigate("/login");
      toast({
        title: "Session expired",
        description: "Please sign in again",
        variant: "destructive",
      });
      return;
    }

    // Handle other auth errors
    toast({
      title: "Authentication error",
      description: getErrorMessage(error),
      variant: "destructive",
    });
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate("/chats");
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      navigate("/login");
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login");
      toast({
        title: "Signed out",
        description: "Successfully signed out.",
      });
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}