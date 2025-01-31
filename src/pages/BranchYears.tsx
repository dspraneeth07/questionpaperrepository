import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { Calendar, ChevronRight, ArrowLeft } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

const BranchYears = () => {
  const { branchCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: branch } = useQuery({
    queryKey: ['branch', branchCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('code', branchCode)
        .maybeSingle();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch branch details",
        });
        navigate('/');
        throw error;
      }

      if (!data) {
        toast({
          variant: "destructive",
          title: "Branch not found",
          description: "The requested branch does not exist",
        });
        navigate('/');
        return null;
      }

      return data;
    },
  });

  // Generate last 10 years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Breadcrumb
            items={[
              { label: "Home", path: "/" },
              { label: branch?.name || branchCode || "", path: `/branch/${branchCode}` },
            ]}
          />
        </div>
        
        <h2 className="text-2xl font-bold text-primary mb-6">Select Year</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {years.map((year) => (
            <Link to={`/branch/${branchCode}/year/${year}`} key={year}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{year}</h3>
                      <p className="text-sm text-gray-500">Academic Year</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BranchYears;