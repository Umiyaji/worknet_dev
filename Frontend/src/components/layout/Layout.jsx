import Navbar from "./Navbar";
import { useLocation } from "react-router-dom";

const Layout = ({ children }) => {
	const location = useLocation();
	const isRecruiterRoute = location.pathname.startsWith("/recruiter");

	return (
		<div
			className={
				isRecruiterRoute
					? "min-h-screen bg-slate-100"
					: "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_22%),linear-gradient(180deg,_#f8fbff_0%,_#f7f8fc_52%,_#eef3f8_100%)]"
			}
		>
			<Navbar />
			<main
				className={
					isRecruiterRoute
						? "w-full p-0"
						: "relative mx-auto w-full max-w-7xl px-4 py-5 pb-16 md:px-5 md:py-6 lg:px-6"
				}
			>
				{!isRecruiterRoute ? (
					<>
						<div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 rounded-[40px] bg-white/65 blur-3xl" />
						<div className="pointer-events-none absolute right-0 top-20 -z-10 h-48 w-48 rounded-full bg-cyan-200/30 blur-3xl" />
					</>
				) : null}
				{children}
			</main>
		</div>
	);
};
export default Layout;
