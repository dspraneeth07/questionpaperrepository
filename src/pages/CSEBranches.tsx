import { Navbar } from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { Building2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CSEBranches = () => {
  const { data: branches, isLoading } = useQuery({
    queryKey: ['cse-branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .or('code.eq.CSE,code.eq.CSE-AIML') // Only fetch CSE and CSE-AIML
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Home", path: "/" },
            { label: "Computer Science Branches", path: "/cse-branches" },
          ]}
        />

        <h2 className="text-2xl font-bold text-primary mb-6">Select Branch</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-200 rounded-lg" />
                    <div>
                      <div className="h-5 w-40 bg-gray-200 rounded" />
                      <div className="h-4 w-20 bg-gray-200 rounded mt-2" />
                    </div>
                  </div>
                  <div className="h-5 w-5 bg-gray-200 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches?.map((branch) => (
              <Link to={`/branch/${branch.code}`} key={branch.id}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{branch.name}</h3>
                        <p className="text-sm text-gray-500">{branch.code}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CSEBranches;