import { Navbar } from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Footer } from "@/components/Footer";

const CSEPapers = () => {
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const { data: papers, isLoading } = useQuery({
    queryKey: ['cse-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('papers')
        .select(`
          *,
          branches:branch_id(name, code),
          semesters:semester_id(number),
          exam_types:exam_type_id(name, code)
        `)
        .or('branch_id.eq.1,branch_id.eq.2') // Assuming 1 is CSE and 2 is CSE-AIML
        .neq('exam_type_id', 1) // Exclude first internal
        .neq('exam_type_id', 2); // Exclude second internal
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <Breadcrumb
          items={[
            { label: "Home", path: "/" },
            { label: "CSE Papers", path: "/cse-papers" },
          ]}
        />

        <h1 className="text-2xl font-bold text-primary mb-6">Computer Science Papers</h1>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers?.map((paper) => (
              <Card
                key={paper.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedPaper(paper.file_url)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {paper.branches?.name} - Year {paper.year}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Semester {paper.semesters?.number} - {paper.exam_types?.name}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      <Dialog open={!!selectedPaper} onOpenChange={() => setSelectedPaper(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogTitle>View Paper</DialogTitle>
          <ScrollArea className="h-full w-full rounded-md">
            {selectedPaper && (
              <div style={{ height: '100%' }}>
                <Viewer
                  fileUrl={selectedPaper}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CSEPapers;
