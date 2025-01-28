import { Navbar } from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const ExamPapers = () => {
  const { branchCode, year, semester, examType } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: branch } = useQuery({
    queryKey: ['branch', branchCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('code', branchCode)
        .maybeSingle();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch branch details",
        });
        navigate('/');
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

  const { data: examTypeDetails } = useQuery({
    queryKey: ['examType', examType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .eq('code', examType)
        .maybeSingle();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch exam type details",
        });
        throw error;
      }
      return data;
    },
  });

  const { data: papers, isLoading } = useQuery({
    queryKey: ['papers', branchCode, year, semester, examType],
    queryFn: async () => {
      console.log('Fetching papers with params:', { branchCode, year, semester, examType });
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('branch_code', branchCode)
        .eq('year', year)
        .eq('semester', semester)
        .eq('exam_type', examType);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch papers",
        });
        throw error;
      }
      console.log('Fetched papers:', data);
      return data;
    },
  });

  const handleDownload = async (fileUrl: string) => {
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
            { label: `Semester ${semester}`, path: `/branch/${branchCode}/year/${year}/semester/${semester}` },
            { label: examTypeDetails?.name || examType || "", path: `/branch/${branchCode}/year/${year}/semester/${semester}/exam-type/${examType}` },
          ]}
        />
        
        <h2 className="text-2xl font-bold text-primary mb-6">Question Papers</h2>
        
        {isLoading ? (
          <div className="text-center py-8">Loading papers...</div>
        ) : papers && papers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers.map((paper) => (
              <Card key={paper.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{paper.subject}</h3>
                      <p className="text-sm text-gray-500">{paper.year}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(paper.file_url)}
                    className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                  >
                    <Download className="h-5 w-5 text-primary" />
                  </button>
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
    </div>
  );
};

export default ExamPapers;