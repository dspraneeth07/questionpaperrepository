import { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";

const CSEPapers = () => {
  const { toast } = useToast();
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const { data: papers, isLoading } = useQuery({
    queryKey: ['cse-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('papers')
        .select(`
          *,
          branches:branch_id(name, code),
          exam_types:exam_type_id(name, code),
          semesters:semester_id(number)
        `)
        .or('code.eq.cse,code.eq.cse-aiml', { foreignTable: 'branches' })
        .neq('code', 'first-internal')
        .neq('code', 'second-internal');

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch papers",
        });
        throw error;
      }

      return data;
    },
  });

  const handleViewPaper = (fileUrl: string) => {
    setSelectedPaper(fileUrl);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Home", path: "/" },
            { label: "CSE Papers", path: "/cse-papers" },
          ]}
        />
        
        <h2 className="text-2xl font-bold text-primary mb-6">Computer Science Papers</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers?.map((paper) => (
              <Card key={paper.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {paper.branches?.name} - Semester {paper.semesters?.number}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {paper.exam_types?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleViewPaper(paper.file_url)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="View paper"
                  >
                    <Eye className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogTitle className="sr-only">View PDF Document</DialogTitle>
            {selectedPaper && (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <ScrollArea className="h-full">
                  <div style={{ height: '100%' }}>
                    <Viewer
                      fileUrl={selectedPaper}
                      plugins={[defaultLayoutPluginInstance]}
                    />
                  </div>
                </ScrollArea>
              </Worker>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default CSEPapers;