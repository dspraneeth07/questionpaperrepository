import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  items: Array<{
    label: string;
    path: string;
  }>;
}

export const Breadcrumb = ({ items }: BreadcrumbProps) => {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 py-4">
      {items.map((item, index) => (
        <div key={item.path} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
          {index === items.length - 1 ? (
            <span className="font-medium text-primary">{item.label}</span>
          ) : (
            <Link to={item.path} className="hover:text-accent transition-colors">
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
};