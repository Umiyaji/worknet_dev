import Navbar from "./Navbar";
import { useLocation } from "react-router-dom";

const Layout = ({ children }) => {
	const location = useLocation();
	const isRecruiterRoute = location.pathname.startsWith("/recruiter");

	return (
		<div className={isRecruiterRoute ? "min-h-screen bg-slate-100" : "min-h-screen bg-base-100"}>
			<Navbar />
			<main
				className={
					isRecruiterRoute
						? "w-full p-0"
						: "max-w-7xl lg:mx-auto px-4 py-4 pb-14 md:mx-4 md:px-4 md:py-6"
				}
			>
				{children}
			</main>
		</div>
	);
};
export default Layout;
