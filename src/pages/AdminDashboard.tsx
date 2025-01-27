import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPapers: 0,
    totalDownloads: 0,
    branchWiseDownloads: [],
    monthlyActivity: []
  });
  const [papers, setPapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isAdmin = localStorage.getItem('adminAuthenticated');
    if (!isAdmin) {
      navigate('/admin/login');
    }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch papers count
      const { count: papersCount } = await supabase
        .from('papers')
        .select('*', { count: 'exact' });

      // Fetch papers with branch details
      const { data: papersData } = await supabase
        .from('papers')
        .select(`
          *,
          branches:branch_id(name),
          semesters:semester_id(number),
          exam_types:exam_type_id(name)
        `)
        .order('created_at', { ascending: false });

      // Set the dashboard data
      setStats({
        totalPapers: papersCount || 0,
        totalDownloads: 0, // This will be implemented when we add download tracking
        branchWiseDownloads: [], // This will be implemented when we add download tracking
        monthlyActivity: [] // This will be implemented when we add activity tracking
      });

      setPapers(papersData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

        {/* Papers Table */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Question Papers</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Paper Type</TableHead>
                  <TableHead>Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {papers.map((paper: any) => (
                  <TableRow key={paper.id}>
                    <TableCell>{paper.file_url.split('/').pop()}</TableCell>
                    <TableCell>{paper.branches?.name}</TableCell>
                    <TableCell>{paper.semesters?.number}</TableCell>
                    <TableCell>{paper.exam_types?.name}</TableCell>
                    <TableCell>-</TableCell>
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