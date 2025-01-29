import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { Building2, ChevronRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Index = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching branches:', error);
        throw error;
      }
      return data;
    },
  });

  // Filter out CSE branches for separate handling
  const nonCSEBranches = branches?.filter(
    branch => !['CSE', 'CSE-AIML'].includes(branch.code)
  );

  // Check if we have any CSE branches
  const hasCSEBranches = branches?.some(
    branch => ['CSE', 'CSE-AIML'].includes(branch.code)
  );

  const handleSearchResults = (results: any[]) => {
    setSearchResults(results);
    setIsSearching(results.length > 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchResults={handleSearchResults} />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Breadcrumb items={[{ label: "Home", path: "/" }]} />
          <Link to="/admin/login">
            <Button variant="outline" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Admin Login
            </Button>
          </Link>
        </div>

        {isSearching ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-primary">Search Results</h2>
            {searchResults.length > 0 ? (
              <Card className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Download</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((paper) => (
                      <TableRow key={paper.id}>
                        <TableCell>{paper.subject_name || 'Unnamed'}</TableCell>
                        <TableCell>{paper.branches?.name}</TableCell>
                        <TableCell>{paper.semesters?.number}</TableCell>
                        <TableCell>{paper.year}</TableCell>
                        <TableCell>
                          <a 
                            href={paper.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Download
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card className="p-6">
                <p className="text-center text-gray-500">No results found</p>
              </Card>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-primary mb-6">Select Branch</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hasCSEBranches && (
                <Link to="/cse-branches">
                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">Computer Science Branches</h3>
                          <p className="text-sm text-gray-500">CSE & CSE-AIML</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                  </Card>
                </Link>
              )}
              
              {isLoading ? (
                [...Array(6)].map((_, i) => (
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
                ))
              ) : (
                nonCSEBranches?.map((branch) => (
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
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;