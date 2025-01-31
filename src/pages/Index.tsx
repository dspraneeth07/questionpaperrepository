import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { Building2, ChevronRight, Lock, Eye, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

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

  const handleSearchResults = (results: any[]) => {
    setSearchResults(results);
    setIsSearching(results.length > 0);
  };

  const handleBackToHome = () => {
    setSearchResults([]);
    setIsSearching(false);
  };

  const convertToViewableURL = (url: string) => {
    try {
      const fileId = url.match(/\/d\/(.+?)\/view/)?.[1] || 
                     url.match(/id=(.+?)(&|$)/)?.[1];
      
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
      return url;
    } catch (error) {
      console.error('Error converting URL:', error);
      return url;
    }
  };

  const handleView = (fileUrl: string) => {
    if (isMobile) {
      toast({
        title: "Mobile Preview Disabled",
        description: "Please use desktop version to preview papers",
        variant: "destructive",
      });
      return;
    }
    const viewUrl = convertToViewableURL(fileUrl);
    setSelectedPaper(viewUrl);
    setIsDialogOpen(true);
  };

  const handleDownload = async (paperId: number, fileUrl: string) => {
    try {
      // Update download count using increment()
      const { error } = await supabase
        .from('papers')
        .update({ downloads: 1 })
        .eq('id', paperId)
        .select()
        .single();

      if (error) {
        console.error('Error updating download count:', error);
      }

      // Open download link
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Error handling download:', error);
    }
  };

  const nonCSEBranches = branches?.filter(
    branch => !['CSE', 'CSE-AIML'].includes(branch.code)
  );

  const hasCSEBranches = branches?.some(
    branch => ['CSE', 'CSE-AIML'].includes(branch.code)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar onSearchResults={handleSearchResults} />
      <main className="container mx-auto px-4 py-8 flex-grow">
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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-primary">Search Results</h2>
              <Button
                variant="outline"
                onClick={handleBackToHome}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to Home
              </Button>
            </div>
            {searchResults.length > 0 ? (
              <Card className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((paper) => (
                      <TableRow key={paper.id}>
                        <TableCell>{paper.subject_name || 'Unnamed'}</TableCell>
                        <TableCell>{paper.branches?.name}</TableCell>
                        <TableCell>{paper.semesters?.number}</TableCell>
                        <TableCell>{paper.year}</TableCell>
                        <TableCell>{paper.downloads || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!isMobile && (
                              <button
                                onClick={() => handleView(paper.file_url)}
                                className="text-primary hover:text-primary/80 transition-colors"
                                title="View Paper"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDownload(paper.id, paper.file_url)}
                              className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card className="p-6">
                <p className="text-center text-gray-500 mb-4">No results found</p>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleBackToHome}
                    className="flex items-center gap-2"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    Back to Home
                  </Button>
                </div>
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
      <Footer />

      {!isMobile && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedPaper(null);
          }
        }}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogTitle>View Paper</DialogTitle>
            <ScrollArea className="h-full">
              {selectedPaper && (
                <div className="w-full h-[calc(80vh-100px)]">
                  <iframe
                    src={selectedPaper}
                    className="w-full h-full border-0"
                    allow="autoplay"
                  />
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Index;