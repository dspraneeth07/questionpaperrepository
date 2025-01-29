import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ExamPapers = () => {
  const { branchCode, year, semester, examType } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [validPapers, setValidPapers] = useState<any[]>([]);

  const semesterNumber = parseInt(semester || '0', 10);
  if (isNaN(semesterNumber)) {
    console.error('Invalid semester number:', semester);
    toast({
      variant: "destructive",
      title: "Invalid Semester",
      description: "The semester number is invalid",
    });
    navigate('/');
    return null;
  }

  if (!branchCode || !examType) {
    console.error('Missing required parameters:', { branchCode, examType });
    toast({
      variant: "destructive",
      title: "Missing Parameters",
      description: "Required parameters are missing",
    });
    navigate('/');
    return null;
  }

  const { data: branch } = useQuery({
    queryKey: ['branch', branchCode],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('*')
          .eq('code', branchCode)
          .maybeSingle();
        
        if (error) throw error;
        
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
      } catch (error) {
        console.error('Error fetching branch:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch branch details. Please try again later.",
        });
        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: examTypeDetails } = useQuery({
    queryKey: ['examType', examType],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('exam_types')
          .select('*')
          .eq('code', examType)
          .maybeSingle();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching exam type:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch exam type details",
        });
        throw error;
      }
    },
  });

  const { data: papers, isLoading, refetch } = useQuery({
    queryKey: ['papers', branchCode, year, semesterNumber, examType],
    queryFn: async () => {
      try {
        const branchResult = await supabase
          .from('branches')
          .select('id')
          .eq('code', branchCode)
          .single();
        
        if (branchResult.error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Branch not found",
          });
          throw new Error('Branch not found');
        }

        const examTypeResult = await supabase
          .from('exam_types')
          .select('id')
          .eq('code', examType)
          .single();
        
        if (examTypeResult.error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Exam type not found",
          });
          throw new Error('Exam type not found');
        }

        const semesterResult = await supabase
          .from('semesters')
          .select('id')
          .eq('number', semesterNumber)
          .single();
        
        if (semesterResult.error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Semester not found",
          });
          throw new Error('Semester not found');
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
        
        if (error) throw error;
        return data;

      } catch (error) {
        console.error('Error fetching papers:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch papers",
        });
        throw error;
      }
    },
  });

  // Check which papers actually exist in storage and database
  useEffect(() => {
    const checkPapersExistence = async () => {
      if (!papers) return;
      
      const validPapersArray = [];
      
      for (const paper of papers) {
        const urlParts = paper.file_url.split('/');
        const filename = decodeURIComponent(urlParts[urlParts.length - 1]);
        
        try {
          // Check if file exists in storage
          const { data: fileExists } = await supabase
            .storage
            .from('question-papers')
            .list('', {
              search: filename
            });

          // Check if paper still exists in database
          const { data: paperExists } = await supabase
            .from('papers')
            .select('id')
            .eq('id', paper.id)
            .single();

          if (fileExists && fileExists.length > 0 && paperExists) {
            validPapersArray.push(paper);
          }
        } catch (error) {
          console.error('Error checking existence:', error);
        }
      }
      
      setValidPapers(validPapersArray);
    };

    checkPapersExistence();
  }, [papers]);

  const handleDownload = async (fileUrl: string) => {
    try {
      console.log('Starting download process for:', fileUrl);
      
      if (!fileUrl) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid file URL",
        });
        return;
      }

      const urlParts = fileUrl.split('/');
      const filename = decodeURIComponent(urlParts[urlParts.length - 1]);
      
      const { data: fileExists } = await supabase
        .storage
        .from('question-papers')
        .list('', {
          search: filename
        });

      if (!fileExists || fileExists.length === 0) {
        toast({
          variant: "destructive",
          title: "File Not Found",
          description: "The requested file is no longer available.",
        });
        return;
      }

      const { data, error } = await supabase
        .storage
        .from('question-papers')
        .download(filename);

      if (error) {
        console.error('Storage error:', error);
        toast({
          variant: "destructive",
          title: "Download failed",
          description: "The file could not be downloaded. Please try again later.",
        });
        return;
      }

      if (!data) {
        throw new Error('No file data received');
      }

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download file. Please try again later.",
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
        
        {validPapers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {validPapers.map((paper) => (
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
