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
import { Alert, AlertDescription } from "@/components/ui/alert";

const ExamPapers = () => {
  const { branchCode, year, semester } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // Function to convert Google Drive URL to appropriate format
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
    setPdfError(null);
    const viewUrl = convertToViewableURL(fileUrl);
    console.log('Opening document at URL:', viewUrl);
    setSelectedPaper(viewUrl);
    setIsDialogOpen(true);
  };

  const handleDownload = (fileUrl: string) => {
    const fileId = fileUrl.match(/\/d\/(.+?)\/view/)?.[1] || 
                   fileUrl.match(/id=(.+?)(&|$)/)?.[1];
    
    if (fileId) {
      window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
    } else {
      window.open(fileUrl, '_blank');
    }
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

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setPdfError(null);
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
      </main>
    </div>
  );
};

export default ExamPapers;
