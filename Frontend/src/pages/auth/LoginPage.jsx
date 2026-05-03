import { Link } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";
import Footer from "../../components/layout/Footer";
import GoogleLoginComp from "../../components/GoogleLoginComp.jsx";

const LoginPage = () => {
  return (
    <>
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-slate-100 via-white to-cyan-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-indigo-300/25 blur-3xl" />

        <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-5xl items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl md:grid-cols-[1.1fr_1fr]">
            <div className="relative hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-10 text-slate-100 md:flex">
              <div>
                <img className="h-16 w-16 object-contain" src="/favicon-logo1.png" alt="Worknet" />
                <p className="mt-8 text-4xl font-semibold leading-tight">Welcome back to your Worknet community</p>
                <p className="mt-4 text-sm text-slate-300">
                  Connect with opportunities, people, and updates that move your career forward.
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-slate-200">
                Secure sign-in with email/password or Google
              </div>
            </div>

            <div className="p-6 sm:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="md:hidden">
                  <img className="mx-auto h-14 w-14 object-contain" src="/favicon-logo1.png" alt="Worknet" />
                </div>

                <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Sign in</h1>
                <p className="mt-2 text-sm text-slate-500">Use your Worknet account to continue.</p>

                <div className="mt-7">
                  <LoginForm />
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Or continue with</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <GoogleLoginComp />
                </div>

                <div className="mt-7 rounded-xl bg-slate-100/80 p-4 text-center">
                  <p className="text-sm text-slate-600">New to Worknet?</p>
                  <Link
                    to="/signup"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-cyan-200 bg-white px-4 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                  >
                    Create account
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

export default LoginPage;
