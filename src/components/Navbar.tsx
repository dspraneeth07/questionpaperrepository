import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Navbar = () => {
  return (
    <nav className="bg-primary w-full py-4 px-6 shadow-md">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/vce-logo.png" alt="VCE Logo" className="h-12" />
          <div className="text-white">
            <h1 className="text-xl font-bold">Vasavi College of Engineering</h1>
            <p className="text-sm">Question Paper Repository</p>
          </div>
        </Link>
        
        <div className="relative w-full md:w-96">
          <Input
            type="search"
            placeholder="Search papers..."
            className="w-full pl-10 pr-4 py-2 rounded-lg"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
      </div>
    </nav>
  );
};