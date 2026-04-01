import { Link } from "react-router-dom";
import SignUpForm from "../../components/auth/SignUpForm";
import Footer from "../../components/layout/Footer";

const RecruiterSignUpPage = () => {
  return (
    <>
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-slate-100 via-white to-cyan-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-2 h-72 w-72 rounded-full bg-indigo-300/25 blur-3xl" />

        <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-5xl items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl md:grid-cols-[1.1fr_1fr]">
            <div className="relative hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-cyan-900 to-sky-900 p-10 text-slate-100 md:flex">
              <div>
                <img className="h-16 w-16 object-contain" src="/favicon-logo1.png" alt="Worknet" />
                <p className="mt-8 text-4xl font-semibold leading-tight">Hire faster with a focused recruiter workspace</p>
                <p className="mt-4 text-sm text-slate-300">
                  Create your company profile and start posting openings to reach the right candidates.
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-slate-200">
                Your company details help candidates discover and trust your brand.
              </div>
            </div>

            <div className="p-6 sm:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="md:hidden">
                  <img className="mx-auto h-14 w-14 object-contain" src="/favicon-logo1.png" alt="Worknet" />
                </div>

                <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Create recruiter account</h1>
                <p className="mt-2 text-sm text-slate-500">Build your team on Worknet with a dedicated recruiter profile.</p>

                <div className="mt-7">
                  <SignUpForm defaultRecruiter />
                </div>

                <div className="mt-7 rounded-xl bg-slate-100/80 p-4 text-center">
                  <p className="text-sm text-slate-600">Need a personal account instead?</p>
                  <Link
                    to="/signup"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-cyan-200 bg-white px-4 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                  >
                    Go to User Signup
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white px-4 pb-6 pt-2 sm:px-6 lg:px-8">
        <Footer />
      </div>
    </>
  );
};

export default RecruiterSignUpPage;
