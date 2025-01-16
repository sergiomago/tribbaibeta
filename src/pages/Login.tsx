import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        navigate("/chats");
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
          duration: 3000,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#7234f3',
                    brandAccent: '#594edf',
                    inputText: 'white',
                    inputBackground: 'transparent',
                    inputBorder: 'lightgray',
                  },
                },
              },
              className: {
                input: 'dark:text-white',
                label: 'dark:text-white',
                button: 'dark:text-white',
              },
            }}
            providers={["google"]}
            redirectTo={window.location.origin}
          />
        </CardContent>
      </Card>
    </div>
  );
}