import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Eye } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const ExamPapers = () => {
  const { branchCode, year, semester } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // Function to convert Google Drive sharing URL to direct view URL
  const convertToDirectDownloadURL = (url: string) => {
    const fileId = url.match(/\/d\/(.+?)\/view/)?.[1];
    if (fileId) {
      // For viewing, use the export=view parameter
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url;
  };

  const { data: branch } = useQuery({
    queryKey: ['branch', branchCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('code', branchCode)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching branch:', error);
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

  const { data: papers, isLoading } = useQuery({
    queryKey: ['papers', branchCode, year, semester],
    queryFn: async () => {
      try {
        console.log('Fetching papers with params:', { branchCode, year, semester });
        
        const { data: branchData } = await supabase
          .from('branches')
          .select('id')
          .eq('code', branchCode)
          .single();

        if (!branchData) {
          console.error('Branch not found:', branchCode);
          return [];
        }

        const { data: semesterData } = await supabase
          .from('semesters')
          .select('id')
          .eq('number', parseInt(semester || '0'))
          .single();

        if (!semesterData) {
          console.error('Semester not found:', semester);
          return [];
        }

        const { data: papersData, error: papersError } = await supabase
          .from('papers')
          .select(`
            *,
            branches(name, code),
            exam_types(name, code),
            semesters(number)
          `)
          .eq('branch_id', branchData.id)
          .eq('semester_id', semesterData.id)
          .eq('year', parseInt(year || '0'));

        if (papersError) {
          console.error('Error fetching papers:', papersError);
          throw papersError;
        }

        console.log('Found papers:', papersData);
        return papersData;

      } catch (error) {
        console.error('Error in papers query:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch papers",
        });
        return [];
      }
    },
  });

  const handleView = (fileUrl: string) => {
    const directUrl = convertToDirectDownloadURL(fileUrl);
    setSelectedPaper(directUrl);
    setIsDialogOpen(true);
  };

  const handleDownload = (fileUrl: string) => {
    // For download, use the original URL since it will trigger the browser's download dialog
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Home", path: "/" },
            { label: branch?.name || branchCode || "", path: `/branch/${branchCode}` },
            { label: year || "", path: `/branch/${branchCode}/year/${year}` },
            { label: `Semester ${semester}`, path: `/branch/${branchCode}/year/${year}/semester/${semester}/papers` },
          ]}
        />
        
        <h2 className="text-2xl font-bold text-primary mb-6">Question Papers</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
              <Card key={index} className="p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-200 rounded-lg" />
                  <div>
                    <div className="h-5 w-40 bg-gray-200 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded mt-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : papers && papers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers.map((paper) => (
              <Card key={paper.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {paper.subject_name || 'Unnamed Paper'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {paper.exam_types?.name} - {paper.year}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(paper.file_url)}
                      className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                      title="View PDF"
                    >
                      <Eye className="h-5 w-5 text-primary" />
                    </button>
                    <button
                      onClick={() => handleDownload(paper.file_url)}
                      className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                      title="Download PDF"
                    >
                      <Download className="h-5 w-5 text-primary" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No question papers found for this selection.
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogTitle>View Paper</DialogTitle>
          <ScrollArea className="h-full">
            {selectedPaper && (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <div style={{ height: '100%' }}>
                  <Viewer
                    fileUrl={selectedPaper}
                    plugins={[defaultLayoutPluginInstance]}
                  />
                </div>
              </Worker>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamPapers;
