import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      try {
        const { data, error } = await supabase
          .from('papers')
          .select(`
            *,
            branches:branch_id(name, code),
            semesters:semester_id(number)
          `)
          .or(`subject_name.ilike.%${query}%,branches.name.ilike.%${query}%`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Search error:', error);
          toast({
            title: "Error",
            description: "Failed to search papers",
            variant: "destructive",
          });
          return;
        }

        // You can handle the search results here
        console.log('Search results:', data);
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: "Error",
          description: "Failed to search papers",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <nav className="bg-primary w-full py-4 px-6 shadow-md">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-4">
          <img 
            src="https://www.facultyplus.com/wp-content/uploads/2021/09/Vasavi-College-logo.gif" 
            alt="VCE Logo" 
            className="h-16 w-16 object-contain bg-white rounded-full p-1"
          />
          <div className="text-white">
            <h1 className="text-xl font-bold">Vasavi College of Engineering</h1>
            <p className="text-sm">Question Paper Repository</p>
          </div>
        </Link>
        
        <div className="relative w-full md:w-96">
          <Input
            type="search"
            placeholder="Search papers..."
            className="w-full pl-10 pr-4 py-2 rounded-lg"
            value={searchQuery}
            onChange={handleSearch}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
      </div>
    </nav>
  );
};