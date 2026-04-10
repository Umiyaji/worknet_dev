import { Link, useLocation } from "react-router-dom";
import { BarChart3, BriefcaseBusiness, FileSpreadsheet, PlusCircle, Users } from "lucide-react";

const navItems = [
  { label: "Dashboard", to: "/recruiter/dashboard", icon: BarChart3 },
  { label: "My Jobs", to: "/recruiter/jobs", icon: BriefcaseBusiness },
  { label: "Post Job", to: "/recruiter/jobs/new", icon: PlusCircle },
  { label: "Applicants", to: "/recruiter/applicants", icon: Users },
  { label: "Automated Posting", to: "/recruiter/automated-jobs", icon: FileSpreadsheet },
];

const RecruiterShell = ({ title, subtitle, children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl bg-slate-900 p-4 text-slate-100 shadow-lg h-fit sticky top-24">
          <div className="mb-6 px-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recruiter</p>
            <h2 className="text-xl font-semibold">Hiring Console</h2>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = (() => {
                if (item.to === "/recruiter/jobs") {
                  return location.pathname === "/recruiter/jobs";
                }

                if (item.to === "/recruiter/jobs/new") {
                  return location.pathname === "/recruiter/jobs/new";
                }

                return (
                  location.pathname === item.to ||
                  (item.to !== "/recruiter/dashboard" && location.pathname.startsWith(item.to))
                );
              })();
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                    isActive ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-6">
          <header className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-500 mt-1">{subtitle}</p> : null}
          </header>
          {children}
        </section>
      </div>
    </div>
  );
};

export default RecruiterShell;
