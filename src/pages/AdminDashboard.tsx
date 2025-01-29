import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define interfaces for our data types
interface Paper {
  id: number;
  branch_id: number;
  semester_id: number;
  exam_type_id: number;
  year: number;
  file_url: string;
  created_at?: string;
  branches?: { name: string };
  semesters?: { number: number };
  exam_types?: { name: string };
}

interface PapersByExamType {
  [key: string]: Paper[];
}

interface Stats {
  totalPapers: number;
  totalDownloads: number;
  branchWiseDownloads: any[];
  monthlyActivity: any[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalPapers: 0,
    totalDownloads: 0,
    branchWiseDownloads: [],
    monthlyActivity: []
  });
  const [papers, setPapers] = useState<PapersByExamType>({});
  const [isLoading, setIsLoading] = useState(true);
  const [uploadData, setUploadData] = useState({
    branch_id: "",
    semester_id: "",
    exam_type_id: "",
    year: new Date().getFullYear(),
  });
  const [editData, setEditData] = useState<Paper | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
    fetchMetadata();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }
  };

  const fetchMetadata = async () => {
    try {
      const [branchesRes, semestersRes, examTypesRes] = await Promise.all([
        supabase.from('branches').select('*'),
        supabase.from('semesters').select('*'),
        supabase.from('exam_types').select('*')
      ]);

      setBranches(branchesRes.data || []);
      setSemesters(semestersRes.data || []);
      setExamTypes(examTypesRes.data || []);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      toast({
        title: "Error",
        description: "Failed to fetch metadata",
        variant: "destructive",
      });
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { count: papersCount } = await supabase
        .from('papers')
        .select('*', { count: 'exact' });

      // Add logging to see what data we're getting
      console.log('Fetching papers data...');
      
      const { data: papersData, error: papersError } = await supabase
        .from('papers')
        .select(`
          *,
          branches:branch_id(name, code),
          semesters:semester_id(number),
          exam_types:exam_type_id(name, code)
        `)
        .order('created_at', { ascending: false });

      if (papersError) {
        console.error('Error fetching papers:', papersError);
        throw papersError;
      }

      // Log the retrieved data for debugging
      console.log('Retrieved papers data:', papersData);

      setStats({
        totalPapers: papersCount || 0,
        totalDownloads: 0,
        branchWiseDownloads: [],
        monthlyActivity: []
      });

      // Group papers by exam type with additional logging
      const groupedPapers = (papersData || []).reduce((acc, paper) => {
        const examType = paper.exam_types?.name || 'Unknown';
        if (!acc[examType]) {
          acc[examType] = [];
        }
        acc[examType].push(paper);
        console.log(`Adding paper to ${examType}:`, paper);
        return acc;
      }, {});

      console.log('Grouped papers:', groupedPapers);
      setPapers(groupedPapers);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sanitizeFileName = (fileName: string) => {
    // Remove square brackets and other special characters
    return fileName.replace(/[\[\]{}()*+?.,\\^$|#\s]/g, '_');
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !uploadData.branch_id || !uploadData.semester_id || !uploadData.exam_type_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to upload files",
          variant: "destructive",
        });
        navigate('/admin/login');
        return;
      }

      // Sanitize the filename
      const sanitizedFileName = sanitizeFileName(file.name);
      console.log('Uploading file:', sanitizedFileName);

      const { data: uploadData_, error: uploadError } = await supabase.storage
        .from('question-papers')
        .upload(sanitizedFileName, file, {
          upsert: true // This will overwrite if file exists
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('question-papers')
        .getPublicUrl(sanitizedFileName);

      console.log('File uploaded successfully, public URL:', publicUrl);

      const { error: dbError } = await supabase
        .from('papers')
        .insert({
          branch_id: parseInt(uploadData.branch_id),
          semester_id: parseInt(uploadData.semester_id),
          exam_type_id: parseInt(uploadData.exam_type_id),
          year: uploadData.year,
          file_url: publicUrl
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      toast({
        title: "Success",
        description: "Question paper uploaded successfully",
      });

      await fetchDashboardData();
      
      setFile(null);
      setUploadData({
        branch_id: "",
        semester_id: "",
        exam_type_id: "",
        year: new Date().getFullYear(),
      });
    } catch (error) {
      console.error('Error uploading paper:', error);
      toast({
        title: "Error",
        description: "Failed to upload question paper",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;

    try {
      setIsLoading(true);

      let fileUrl = editData.file_url;

      if (file) {
        // Upload new file if provided
        const fileName = sanitizeFileName(file.name);
        const { error: uploadError } = await supabase.storage
          .from('question-papers')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('question-papers')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('papers')
        .update({
          branch_id: editData.branch_id,
          semester_id: editData.semester_id,
          exam_type_id: editData.exam_type_id,
          year: editData.year,
          file_url: fileUrl
        })
        .eq('id', editData.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Question paper updated successfully",
      });

      setIsEditDialogOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating paper:', error);
      toast({
        title: "Error",
        description: "Failed to update question paper",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (paperId: number) => {
    if (!confirm('Are you sure you want to delete this question paper?')) return;

    try {
      setIsLoading(true);
      const { data: paper, error: fetchError } = await supabase
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (fetchError) {
        console.error('Error fetching paper:', fetchError);
        throw fetchError;
      }

      // Extract filename from the URL
      const fileUrl = new URL(paper.file_url);
      const filePath = decodeURIComponent(fileUrl.pathname.split('/question-papers/').pop() || '');

      if (!filePath) {
        throw new Error('Could not extract filename from URL');
      }

      console.log('Attempting to delete file:', filePath);

      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('question-papers')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        toast({
          title: "Warning",
          description: "Could not delete file from storage, but will remove database entry",
          variant: "destructive",
        });
      }

      // Delete the paper record from the database
      const { error: deleteError } = await supabase
        .from('papers')
        .delete()
        .eq('id', paperId);

      if (deleteError) {
        console.error('Database deletion error:', deleteError);
        throw deleteError;
      }

      toast({
        title: "Success",
        description: "Question paper deleted successfully",
      });

      // Update the local state to remove the deleted paper
      const updatedPapers: PapersByExamType = {};
      Object.entries(papers).forEach(([examType, papersList]) => {
        const filteredPapers = papersList.filter(p => p.id !== paperId);
        if (filteredPapers.length > 0) {
          updatedPapers[examType] = filteredPapers;
        }
      });
      setPapers(updatedPapers);

    } catch (error) {
      console.error('Error deleting paper:', error);
      toast({
        title: "Error",
        description: "Failed to delete question paper. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Upload Section */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">Upload Question Paper</h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={uploadData.branch_id}
                  onValueChange={(value) => setUploadData(prev => ({ ...prev, branch_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Select
                  value={uploadData.semester_id}
                  onValueChange={(value) => setUploadData(prev => ({ ...prev, semester_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id.toString()}>
                        {semester.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="examType">Exam Type</Label>
                <Select
                  value={uploadData.exam_type_id}
                  onValueChange={(value) => setUploadData(prev => ({ ...prev, exam_type_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Exam Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={uploadData.year}
                  onChange={(e) => setUploadData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  min={2000}
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Question Paper (PDF)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Uploading..." : "Upload Question Paper"}
            </Button>
          </form>
        </Card>

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-medium">Total Papers</h3>
            <p className="text-3xl font-bold mt-2">{stats.totalPapers}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-medium">Total Downloads</h3>
            <p className="text-3xl font-bold mt-2">{stats.totalDownloads}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-medium">Most Downloaded</h3>
            <p className="text-sm mt-2">Coming soon</p>
          </Card>
        </div>

        {/* Monthly Activity Chart */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">Monthly Activity</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="uploads" fill="#4f46e5" name="Uploads" />
                <Bar dataKey="downloads" fill="#10b981" name="Downloads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Papers Table - Now Grouped by Exam Type */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Question Papers</h3>
          {Object.entries(papers).map(([examType, papersList]) => (
            <div key={examType} className="mb-8">
              <h4 className="text-md font-medium mb-4">{examType}</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {papersList.map((paper: any) => (
                      <TableRow key={paper.id}>
                        <TableCell>{paper.file_url.split('/').pop()}</TableCell>
                        <TableCell>{paper.branches?.name}</TableCell>
                        <TableCell>{paper.semesters?.number}</TableCell>
                        <TableCell>{paper.year}</TableCell>
                        <TableCell className="space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setEditData(paper)}
                                className="hover:bg-gray-100"
                              >
                                <Pencil className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Question Paper</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleEdit} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-branch">Branch</Label>
                                  <Select
                                    value={editData?.branch_id.toString()}
                                    onValueChange={(value) => setEditData(prev => ({ ...prev, branch_id: parseInt(value) }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id.toString()}>
                                          {branch.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="edit-semester">Semester</Label>
                                  <Select
                                    value={editData?.semester_id.toString()}
                                    onValueChange={(value) => setEditData(prev => ({ ...prev, semester_id: parseInt(value) }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Semester" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {semesters.map((semester) => (
                                        <SelectItem key={semester.id} value={semester.id.toString()}>
                                          {semester.number}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="edit-year">Year</Label>
                                  <Input
                                    id="edit-year"
                                    type="number"
                                    value={editData?.year}
                                    onChange={(e) => setEditData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                    min={2000}
                                    max={new Date().getFullYear()}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="edit-file">New Question Paper (Optional)</Label>
                                  <Input
                                    id="edit-file"
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                  />
                                </div>

                                <Button type="submit" disabled={isLoading}>
                                  {isLoading ? "Updating..." : "Update Question Paper"}
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(paper.id)}
                            className="hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;