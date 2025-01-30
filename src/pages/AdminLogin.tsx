import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Attempting login with email:", email);
      
      // First attempt authentication
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        throw new Error("Invalid email or password. Please try again.");
      }

      if (!data.user) {
        console.error("No user data returned after successful sign in");
        throw new Error("Authentication failed");
      }

      // After successful auth, check if user is an admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select()
        .eq('email', email)
        .maybeSingle();

      if (adminError) {
        console.error("Error checking admin status:", adminError);
        await supabase.auth.signOut();
        throw new Error('Error verifying admin status');
      }

      if (!adminUser) {
        console.error("No admin user found with email:", email);
        await supabase.auth.signOut();
        throw new Error('This email is not registered as an admin');
      }

      console.log("Login successful for user:", data.user.email);
      
      localStorage.setItem('adminAuthenticated', 'true');
      
      toast({
        title: "Success",
        description: "Successfully logged in as admin",
      });
      
      navigate('/admin/dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="absolute top-8 left-8 flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Home
        </Link>
        <img 
          src="https://hellohyderabad.org/wp-content/uploads/2023/07/Vasavi-College-of-Engineering.jpg" 
          alt="VCE Logo" 
          className="mx-auto h-20 w-auto object-contain" 
        />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Login
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;