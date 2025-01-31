import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm">
          Designed & Developed by{" "}
          <Link
            to="https://www.linkedin.com/in/kasireddy-manideep-reddy-a21960281/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors underline"
          >
            Kasireddy Manideep Reddy
          </Link>
          {" & "}
          <Link
            to="https://www.linkedin.com/in/dspraneeth"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors underline"
          >
            Dhadi Sai Praneeth Reddy
          </Link>
        </p>
      </div>
    </footer>
  );
};