import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const roleFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  alias: z.string().optional(),
  tag: z.string().optional(),
  description: z.string().optional(),
  instructions: z.string().min(1, "Instructions are required"),
  model: z.enum(["gpt-4o", "gpt-4o-mini"]),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

const Index = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      alias: "",
      tag: "",
      description: "",
      instructions: "",
      model: "gpt-4o-mini",
    },
  });

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createRole = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      setIsCreating(true);
      try {
        // Create OpenAI Assistant via Edge Function
        const { data: assistantData, error: assistantError } = await supabase.functions.invoke(
          "create-assistant",
          {
            body: JSON.stringify(values),
          }
        );

        if (assistantError) throw assistantError;

        // Store role in database
        const { data, error } = await supabase.from("roles").insert({
          ...values,
          user_id: user.id,
          assistant_id: assistantData.assistant_id,
        });

        if (error) throw error;
        return data;
      } finally {
        setIsCreating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create role: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: RoleFormValues) => {
    createRole.mutate(values);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Role Creation Form */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Create New Role</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alias (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter alias" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tag" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter role description"
                        className="h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter role instructions"
                        className="h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gpt-4o-mini">GPT-4 Mini</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Role"
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Roles List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your Roles</h2>
          {isLoadingRoles ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : roles?.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No roles created yet. Create your first role using the form.
            </p>
          ) : (
            <div className="grid gap-4">
              {roles?.map((role) => (
                <div
                  key={role.id}
                  className="rounded-lg border p-4 hover:bg-accent transition-colors"
                >
                  <h3 className="font-semibold">{role.name}</h3>
                  {role.alias && (
                    <p className="text-sm text-muted-foreground">
                      Alias: {role.alias}
                    </p>
                  )}
                  {role.tag && (
                    <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full mt-2">
                      {role.tag}
                    </span>
                  )}
                  {role.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Model: {role.model}
                    </span>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;