import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ... keep existing code (type definitions and interfaces)

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
      console.log('Starting download process for:', fileUrl);
      
      // Extract the file path from the storage URL
      const storageUrl = 'https://buzkoptlhfmfuaipqfmn.supabase.co/storage/v1/object/public/question-papers/';
      const filePath = fileUrl.replace(storageUrl, '');
      
      console.log('File path:', filePath);

      // Download the file directly
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('question-papers')
        .download(filePath);

      if (downloadError) {
        console.error('Download error:', downloadError);
        throw downloadError;
      }

      if (!fileData) {
        throw new Error('No file data received');
      }

      // Create a blob URL and trigger download
      const blob = new Blob([fileData], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filePath.split('/').pop() || 'download.pdf';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Success",
        description: "Download started successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download the file",
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
