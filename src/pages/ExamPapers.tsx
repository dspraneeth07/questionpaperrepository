import { Navbar } from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      const [branchResult, examTypeResult, semesterResult] = await Promise.all([
        supabase.from('branches').select('id').eq('code', branchCode).single(),
        supabase.from('exam_types').select('id').eq('code', examType).single(),
        supabase.from('semesters').select('id').eq('number', parseInt(semester || '0', 10)).single()
      ]);

      if (!branchResult.data || !examTypeResult.data || !semesterResult.data) {
        throw new Error('Could not find required references');
      }

      const { data, error } = await supabase
        .from('papers')
        .select(`
          *,
          branches(*),
          exam_types(*),
          semesters(*)
        `)
        .eq('branch_id', branchResult.data.id)
        .eq('exam_type_id', examTypeResult.data.id)
        .eq('semester_id', semesterResult.data.id)
        .eq('year', parseInt(year || '0', 10));
      
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

  const handleDownload = async (fileUrl: string) => {
    try {
      console.log('Starting download for URL:', fileUrl);
      
      // Extract just the filename from the full URL
      const fileName = fileUrl.split('/').pop();
      
      if (!fileName) {
        throw new Error('Invalid file URL');
      }

      console.log('Attempting to verify file existence:', fileName);
      
      // First, check if the file exists
      const { data: fileExists, error: existsError } = await supabase
        .storage
        .from('question-papers')
        .list('', {
          search: fileName
        });

      if (existsError || !fileExists || fileExists.length === 0) {
        console.error('File not found in storage:', fileName);
        throw new Error('File not found in storage');
      }

      console.log('File exists, creating signed URL');
      
      // Create a direct download URL using Supabase storage
      const { data: signedUrl, error: signedUrlError } = await supabase
        .storage
        .from('question-papers')
        .createSignedUrl(fileName, 60); // URL valid for 60 seconds

      if (signedUrlError || !signedUrl) {
        console.error('Error getting signed URL:', signedUrlError);
        throw new Error('Failed to generate download URL');
      }

      console.log('Generated signed URL:', signedUrl);

      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = signedUrl.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Download started successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download the file. Please try again.",
      });
    }
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
                      <h3 className="font-semibold text-lg text-gray-900">Paper {paper.id}</h3>
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