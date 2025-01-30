import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ArrowLeft, Search } from "lucide-react";
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

interface Paper {
  id: number;
  branch_id: number;
  semester_id: number;
  year: number;
  file_url: string;
  created_at: string;
  subject_name: string | null;
  branches: { 
    name: string;
    code: string;
  };
  semesters: { 
    number: number;
  };
}

interface Stats {
  totalPapers: number;
  totalDownloads: number;
  branchWiseDownloads: any[];
  monthlyActivity: any[];
}

interface MonthlyActivity {
  month: string;
  uploads: number;
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
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadData, setUploadData] = useState({
    branch_id: "",
    semester_id: "",
    subject_name: "",
    year: new Date().getFullYear(),
    file_url: "", // New field for PDF URL
  });
  const [editData, setEditData] = useState<Paper | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);

  useEffect(() => {
    checkAuth();
    fetchDashboardData(); // Fetch fresh data when component mounts
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPapers(papers);
      return;
    }

    const filtered = papers.filter(paper => {
      const searchTerms = searchQuery.toLowerCase().split(" ");
      const paperString = `${paper.branches.name} ${paper.semesters.number} ${paper.subject_name} ${paper.year}`.toLowerCase();
      return searchTerms.every(term => paperString.includes(term));
    });

    setFilteredPapers(filtered);
  }, [searchQuery, papers]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }
  };

  const fetchMetadata = async () => {
    try {
      const [branchesRes, semestersRes] = await Promise.all([
        supabase.from('branches').select('*'),
        supabase.from('semesters').select('*'),
      ]);

      setBranches(branchesRes.data || []);
      setSemesters(semestersRes.data || []);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      toast({
        title: "Error",
        description: "Failed to fetch metadata",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadData.branch_id || !uploadData.semester_id || !uploadData.subject_name || !uploadData.file_url) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including the PDF URL",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(uploadData.file_url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
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

      // Get default exam type (End Semester)
      const { data: examType, error: examTypeError } = await supabase
        .from('exam_types')
        .select('id')
        .eq('code', 'END_SEM')
        .maybeSingle();

      if (examTypeError) {
        console.error('Error fetching exam type:', examTypeError);
        throw new Error('Failed to fetch exam type');
      }

      if (!examType) {
        console.error('No default exam type found');
        toast({
          title: "Error",
          description: "System configuration error: Default exam type not found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      const { error: dbError } = await supabase
        .from('papers')
        .insert({
          branch_id: parseInt(uploadData.branch_id),
          semester_id: parseInt(uploadData.semester_id),
          year: uploadData.year,
          file_url: uploadData.file_url,
          subject_name: uploadData.subject_name,
          exam_type_id: examType.id
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      setStats(prev => ({
        ...prev,
        totalPapers: prev.totalPapers + 1
      }));

      toast({
        title: "Success",
        description: "Question paper URL added successfully",
      });

      await fetchDashboardData();
      
      setUploadData({
        branch_id: "",
        semester_id: "",
        subject_name: "",
        year: new Date().getFullYear(),
        file_url: "",
      });
    } catch (error) {
      console.error('Error adding paper:', error);
      toast({
        title: "Error",
        description: "Failed to add question paper",
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

      const { error: updateError } = await supabase
        .from('papers')
        .update({
          branch_id: editData.branch_id,
          semester_id: editData.semester_id,
          year: editData.year,
          file_url: fileUrl,
          subject_name: editData.subject_name // Update subject name
        })
        .eq('id', editData.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Question paper updated successfully",
      });

      setIsEditDialogOpen(false);
      await fetchDashboardData();
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
      
      const { error: deleteError } = await supabase
        .from('papers')
        .delete()
        .eq('id', paperId);

      if (deleteError) {
        console.error('Error deleting paper:', deleteError);
        toast({
          title: "Error",
          description: "Failed to delete question paper. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Update local state immediately
      const updatedPapers = papers.filter(paper => paper.id !== paperId);
      setPapers(updatedPapers);
      setFilteredPapers(prevPapers => prevPapers.filter(paper => paper.id !== paperId));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalPapers: prev.totalPapers - 1
      }));

      toast({
        title: "Success",
        description: "Question paper deleted successfully",
      });

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

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Removed deleted_at filter temporarily
      const { data: papersData, error: papersError } = await supabase
        .from('papers')
        .select(`
          *,
          branches:branch_id(name, code),
          semesters:semester_id(number)
        `)
        .order('created_at', { ascending: false });

      if (papersError) {
        console.error('Error fetching papers:', papersError);
        throw papersError;
      }

      setPapers(papersData);
      setFilteredPapers(papersData);

      const monthlyActivity = generateMonthlyActivity(papersData);
      
      setStats({
        totalPapers: papersData.length,
        totalDownloads: 0,
        branchWiseDownloads: [],
        monthlyActivity
      });

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

  const generateMonthlyActivity = (papers: Paper[]): MonthlyActivity[] => {
    const now = new Date();
    const monthsAgo = new Date(now.setMonth(now.getMonth() - 11)); // Last 12 months
    
    const months: MonthlyActivity[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(monthsAgo.setMonth(monthsAgo.getMonth() + 1));
      months.push({
        month: date.toLocaleString('default', { month: 'short' }),
        uploads: 0
      });
    }

    papers.forEach(paper => {
      const paperDate = new Date(paper.created_at);
      const monthIndex = months.findIndex(m => 
        m.month === paperDate.toLocaleString('default', { month: 'short' })
      );
      if (monthIndex !== -1) {
        months[monthIndex].uploads++;
      }
    });

    return months;
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">Add Question Paper</h3>
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
                <Label htmlFor="subject">Subject Name</Label>
                <Input
                  id="subject"
                  value={uploadData.subject_name}
                  onChange={(e) => setUploadData(prev => ({ ...prev, subject_name: e.target.value }))}
                  placeholder="Enter subject name"
                />
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
              <Label htmlFor="file_url">PDF URL (Google Drive)</Label>
              <Input
                id="file_url"
                type="url"
                value={uploadData.file_url}
                onChange={(e) => setUploadData(prev => ({ ...prev, file_url: e.target.value }))}
                placeholder="Enter public PDF URL"
                required
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Question Paper"}
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
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search papers by branch, semester, subject or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
        </div>

        {/* Papers Table */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Question Papers</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPapers.map((paper: Paper) => (
                  <TableRow key={paper.id}>
                    <TableCell className="font-medium">{paper.subject_name || 'Unnamed'}</TableCell>
                    <TableCell>{paper.branches?.name}</TableCell>
                    <TableCell>{paper.semesters?.number}</TableCell>
                    <TableCell>{paper.year}</TableCell>
                    <TableCell className="space-x-2">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                              <Label htmlFor="edit-subject">Subject Name</Label>
                              <Input
                                id="edit-subject"
                                value={editData?.subject_name || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, subject_name: e.target.value }))}
                                placeholder="Enter subject name"
                              />
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
                              <Label htmlFor="edit-file">New Question Paper URL (Optional)</Label>
                              <Input
                                id="edit-file"
                                type="url"
                                value={editData?.file_url || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, file_url: e.target.value }))}
                                placeholder="Enter public PDF URL"
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
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;