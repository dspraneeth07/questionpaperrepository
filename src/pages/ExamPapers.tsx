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

  // Validate URL parameters
  const semesterNumber = parseInt(semester || '0', 10);
  if (isNaN(semesterNumber)) {
    console.error('Invalid semester number:', semester);
    navigate('/');
    return null;
  }

  if (!branchCode || !examType) {
    console.error('Missing required parameters:', { branchCode, examType });
    navigate('/');
    return null;
  }

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
    queryKey: ['papers', branchCode, year, semesterNumber, examType],
    queryFn: async () => {
      try {
        // Fetch references sequentially to handle errors better
        const branchResult = await supabase
          .from('branches')
          .select('id')
          .eq('code', branchCode)
          .single();
        
        if (branchResult.error) throw new Error('Branch not found');

        const examTypeResult = await supabase
          .from('exam_types')
          .select('id')
          .eq('code', examType)
          .single();
        
        if (examTypeResult.error) throw new Error('Exam type not found');

        const semesterResult = await supabase
          .from('semesters')
          .select('id')
          .eq('number', semesterNumber)
          .single();
        
        if (semesterResult.error) throw new Error('Semester not found');

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

  const handleDownload = async (fileUrl: string) => {
    try {
      console.log('Starting download process for:', fileUrl);
      
      const urlParts = fileUrl.split('/');
      const filename = decodeURIComponent(urlParts[urlParts.length - 1]);

      console.log('Attempting to download file:', filename);

      try {
        const response = await fetch(fileUrl);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
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
          return;
        }
      } catch (fetchError) {
        console.error('Direct download failed, trying Supabase storage:', fetchError);
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
          description: "Unable to download the file. Please try again later or contact support.",
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
        description: error instanceof Error ? error.message : "Failed to download file",
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
        
        {papers && papers.length > 0 ? (
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