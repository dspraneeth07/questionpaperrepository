import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BranchYears from "./pages/BranchYears";
import BranchSemesters from "./pages/BranchSemesters";
import ExamTypes from "./pages/ExamTypes";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ExamPapers from "./pages/ExamPapers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/branch/:branchCode" element={<BranchYears />} />
          <Route path="/branch/:branchCode/year/:year" element={<BranchSemesters />} />
          <Route path="/branch/:branchCode/year/:year/semester/:semester" element={<ExamTypes />} />
          <Route path="/branch/:branchCode/year/:year/semester/:semester/exam-type/:examType" element={<ExamPapers />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;