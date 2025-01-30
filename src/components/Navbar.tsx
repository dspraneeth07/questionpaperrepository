import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NavbarProps {
  onSearchResults?: (results: any[]) => void;
}

export const Navbar = ({ onSearchResults }: NavbarProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (query: string) => {
    if (query.trim()) {
      setIsSearching(true);
      try {
        console.log('Starting search with query:', query);
        
        // First, get matching branch IDs
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .or(`name.ilike.%${query}%,code.ilike.%${query}%`);

        if (branchError) {
          console.error('Branch search error:', branchError);
          toast({
            variant: "destructive",
            title: "Search Error",
            description: "Failed to search branches. Please try again.",
          });
          setIsSearching(false);
          return;
        }

        const branchIds = branchData?.map(branch => branch.id) || [];
        console.log('Found matching branch IDs:', branchIds);

        // Create search conditions for papers
        const searchWords = query.toLowerCase().trim().split(/\s+/);
        const searchConditions = searchWords.map(word => `subject_name.ilike.%${word}%`);
        
        // Add branch condition if branches were found
        if (branchIds.length > 0) {
          searchConditions.push(`branch_id.in.(${branchIds.join(',')})`);
        }

        console.log('Search conditions:', searchConditions);

        // Search papers with all conditions
        const { data: papers, error: papersError } = await supabase
          .from('papers')
          .select(`
            *,
            branches:branch_id(name, code),
            semesters:semester_id(number)
          `)
          .or(searchConditions.join(','))
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (papersError) {
          console.error('Papers search error:', papersError);
          toast({
            variant: "destructive",
            title: "Search Error",
            description: "Failed to search papers. Please try again.",
          });
          setIsSearching(false);
          return;
        }

        console.log('Found papers:', papers);

        // Filter out invalid papers and validate URLs
        const validPapers = papers?.filter(paper => {
          try {
            new URL(paper.file_url);
            return true;
          } catch {
            console.warn('Invalid paper URL:', paper.file_url);
            return false;
          }
        });

        console.log('Valid papers after URL check:', validPapers);

        if (validPapers && validPapers.length === 0) {
          toast({
            title: "No Results",
            description: "No papers found matching your search.",
          });
        }

        if (onSearchResults) {
          onSearchResults(validPapers || []);
        }

      } catch (error) {
        console.error('Search error:', error);
        toast({
          variant: "destructive",
          title: "Search Error",
          description: "An unexpected error occurred. Please try again.",
        });
      } finally {
        setIsSearching(false);
      }
    } else if (onSearchResults) {
      onSearchResults([]);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Question Bank
          </Link>
          
          <div className="relative w-full max-w-sm mx-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search papers..."
              className="pl-10 w-full"
              onChange={(e) => handleSearch(e.target.value)}
              disabled={isSearching}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};