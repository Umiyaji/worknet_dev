import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";
import toast, { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./lib/axios";
import NotificationsPage from "./pages/NotificationsPage";
import NetworkPage from "./pages/NetworkPage";
import PostSharePage from "./pages/PostSharePage";
import ProfilePage from "./pages/ProfilePage";
import SuggestionsPage from "./pages/SuggestionsPage";
import PostCreateMobile from "./pages/PostCreateMobile";
import Resume from "./pages/Resume";
import Messages from "./pages/Messages";
import RecruiterSignUpPage from "./pages/auth/RecruiterSignUpPage";
import RecruiterDashboardPage from "./pages/RecruiterDashboardPage";
import RecruiterJobsPage from "./pages/RecruiterJobsPage";
import RecruiterJobFormPage from "./pages/RecruiterJobFormPage";
import RecruiterApplicantsPage from "./pages/RecruiterApplicantsPage";
import RecruiterApplicantDetailPage from "./pages/RecruiterApplicantDetailPage";
import RecruiterAutomatedJobPostingPage from "./pages/RecruiterAutomatedJobPostingPage";
import JobsListingPage from "./pages/JobsListingPage";
import JobDetailPage from "./pages/JobDetailPage";
import RecruiterProfilePage from "./pages/RecruiterProfilePage";
import MyApplicationsPage from "./pages/MyApplicationsPage";
import GlobalUploadProgressBar from "./components/GlobalUploadProgressBar";

const RecruiterRoute = ({ authUser, children }) => {
  if (!authUser) return <Navigate to="/login" />;
  if (authUser.role !== "recruiter") return <Navigate to="/" />;
  return children;
};

function App() {
  const { data: authUser, isLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        return res.data;
      } catch (err) {
        if (err.response?.status === 401) {
          console.log("Auth Check: 401 Unauthorized - User is not logged in.");
          return null;
        }
        toast.error(err.response?.data?.message || "Something went wrong");
        return null;
      }
    },
    retry: false,
  });

  if (isLoading) return null;

  return (
    <Layout>
      <GlobalUploadProgressBar />
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/signup/recruiter"
          element={!authUser ? <RecruiterSignUpPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/create-post"
          element={authUser ? <PostCreateMobile /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/notifications"
          element={
            authUser ? <NotificationsPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/Resume"
          element={authUser && authUser.role !== "recruiter" ? <Resume /> : <Navigate to={authUser ? "/" : "/login"} replace />}
        />
        <Route
          path="/resume/:username"
          element={authUser && authUser.role !== "recruiter" ? <Resume /> : <Navigate to={authUser ? "/" : "/login"} replace />}
        />

        <Route
          path="/messages"
          element={authUser ? <Messages /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/jobs"
          element={authUser ? <JobsListingPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/jobs/:jobId"
          element={authUser ? <JobDetailPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/applications"
          element={authUser ? <MyApplicationsPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/company/:username"
          element={authUser ? <RecruiterProfilePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/recruiter/dashboard"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterDashboardPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterJobsPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/new"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterJobFormPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/edit"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterJobFormPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/applicants"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterApplicantsPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/applicants/:applicationId"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterApplicantDetailPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/applicants"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterApplicantsPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/jobs/upload-excel"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterAutomatedJobPostingPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/recruiter/automated-jobs"
          element={
            <RecruiterRoute authUser={authUser}>
              <RecruiterAutomatedJobPostingPage />
            </RecruiterRoute>
          }
        />
        <Route
          path="/network"
          element={authUser ? <NetworkPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/post/:postId"
          element={authUser ? <PostSharePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/posts/:postId"
          element={authUser ? <PostSharePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/:username"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/suggestions"
          element={authUser ? <SuggestionsPage /> : <Navigate to="/login" replace />}
        />
      </Routes>
      <Toaster />
    </Layout>
  );
}

export default App;
