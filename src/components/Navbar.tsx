import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NavbarProps {
  onSearchResults?: (results: any[]) => void;
}

export const Navbar = ({ onSearchResults }: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleSearch = async (query: string) => {
    if (query.trim()) {
      try {
        console.log('Searching for:', query);
        
        // First, get matching branch IDs
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .ilike('name', `%${query}%`);

        if (branchError) {
          console.error('Branch search error:', branchError);
          return;
        }

        const branchIds = branchData?.map(branch => branch.id) || [];
        console.log('Matching branch IDs:', branchIds);

        // Build search conditions
        const searchConditions = [];
        
        // Split query into words and create conditions for each word
        const words = query.toLowerCase().split(' ');
        words.forEach(word => {
          if (word.trim()) {
            searchConditions.push(`subject_name.ilike.%${word}%`);
          }
        });

        // Add full query match condition
        searchConditions.push(`subject_name.ilike.%${query}%`);
        
        // Add branch ID condition if any branches matched
        if (branchIds.length > 0) {
          searchConditions.push(`branch_id.in.(${branchIds.join(',')})`);
        }

        console.log('Search conditions:', searchConditions);

        // Then search papers with constructed conditions
        const { data, error } = await supabase
          .from('papers')
          .select(`
            *,
            branches:branch_id(name, code),
            semesters:semester_id(number)
          `)
          .or(searchConditions.join(','))
          .is('deleted_at', null)
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

        console.log('Search results before filtering:', data);

        // For Google Drive URLs, we don't need to verify file existence
        // Just check if the URL is valid
        const validPapers = data?.filter(paper => {
          try {
            const url = new URL(paper.file_url);
            // Check if it's a Google Drive URL
            return url.hostname.includes('drive.google.com') || url.hostname.includes('docs.google.com');
          } catch (error) {
            console.error('Invalid URL:', error);
            return false;
          }
        });

        console.log('Final valid papers:', validPapers);

        if (onSearchResults) {
          onSearchResults(validPapers || []);
        }
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: "Error",
          description: "Failed to search papers",
          variant: "destructive",
        });
      }
    } else if (onSearchResults) {
      onSearchResults([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  return (
    <nav className="bg-primary w-full py-3 px-6 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        {/* Left - Logo */}
        <Link to="/" className="flex-shrink-0">
          <img 
            src="https://www.graduatesengine.com/assets/uploads/listingsThumbnail/ge/vasavi-college-of-engineering.gif" 
            alt="VCE Logo" 
            className="h-28 w-28 object-contain bg-white rounded-full p-1"
          />
        </Link>

        {/* Center - Text Content */}
        <div className="flex-grow text-center text-white space-y-1 mx-4">
          <h1 className="text-2xl font-bold tracking-wide">
            VASAVI COLLEGE OF ENGINEERING
            <span className="text-sm font-normal block">
              (AUTONOMOUS)
            </span>
          </h1>
          <p className="text-xs font-light">
            IBRAHIMBAGH, HYDERABAD, 500031
          </p>
          <h2 className="text-lg font-semibold mt-2">
            Dr. Sarvepalli Radhakrishnan Learning Resources Centre
          </h2>
          <p className="text-base font-medium text-accent">
            Question Paper Repository
          </p>
        </div>

        {/* Right - Search Bar */}
        <div className="relative w-64 flex-shrink-0">
          <Input
            type="search"
            placeholder="Search papers..."
            className="w-full pl-10 pr-4 py-2 rounded-lg"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
      </div>
    </nav>
  );
};