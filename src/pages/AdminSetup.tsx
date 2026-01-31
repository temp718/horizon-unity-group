import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';

/**
 * Admin Setup Page
 * This page is used to create the initial admin user.
 * After creating the admin, you can delete this page or restrict access.
 */
export default function AdminSetup() {
  const [email, setEmail] = useState('johnwanderi202@gmail.com');
  const [password, setPassword] = useState('@6ix9ine');
  const [fullName, setFullName] = useState('Admin');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Sign up the admin user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // The trigger should have created the profile and role, but ensure admin role is set
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            role: 'admin',
          }, {
            onConflict: 'user_id'
          });

        if (roleError) throw roleError;

        toast({
          title: 'Admin created!',
          description: `Admin user created with email: ${email}`,
        });

        setEmail('');
        setPassword('');
        setFullName('');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create admin';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Setup</h1>
          <p className="text-muted-foreground mt-1">Create initial admin user</p>
        </div>

        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              required
            />
          </div>

          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Admin full name"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Admin
          </Button>
        </form>

        <div className="mt-8 p-4 bg-muted rounded-lg text-sm">
          <p className="text-muted-foreground">
            ⚠️ This page should be restricted or removed after creating the admin user.
          </p>
        </div>
      </div>
    </div>
  );
}
