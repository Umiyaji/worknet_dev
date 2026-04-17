import { Link } from "react-router-dom";
import { Home, UserPlus, Bell } from "lucide-react";
import SmartImage from "./SmartImage";

export default function Sidebar({ user }) {
	if (!user) return null;
	const isRecruiter = user?.role === "recruiter";
	const coverImage = isRecruiter
		? user?.companyBanner || user?.bannerImg || "/banner.png"
		: user?.bannerImg || "/banner.png";
	const avatarImage = isRecruiter
		? user?.companyLogo || user?.profilePicture || "/avatar.png"
		: user?.profilePicture || "/avatar.png";
	const displayName = isRecruiter
		? user?.companyName || user?.name || "User"
		: user?.name || "User";
	const subtitle = isRecruiter
		? user?.industry || "Recruiter"
		: user?.headline || "No headline set";

	return (
		<div className='bg-secondary rounded-lg shadow'>
			<div className='p-4 text-center'>
				<div
					className='h-16 rounded-t-lg bg-cover bg-center'
					style={{
						backgroundImage: `url("${coverImage}")`,
					}}
				/>

				<Link to={`/profile/${user?.username}`}>
					<SmartImage
						src={avatarImage}
						alt={displayName}
						className='w-20 h-20 rounded-full mx-auto mt-[-40px]'
					/>

					<h2 className='text-xl font-semibold mt-2'>
						{displayName}
					</h2>
				</Link>

				<p className='text-info'>
					{subtitle}
				</p>

				<p className='text-info text-xs'>
					{user?.connections?.length || 0} connections
				</p>
			</div>

			<div className='border-t border-base-100 p-4'>
				<nav>
					<ul className='space-y-2'>
						<li>
							<Link
								to='/'
								className='flex items-center py-2 px-4 rounded-md hover:bg-primary hover:text-white transition-colors'
							>
								<Home className='mr-2' size={20} /> Home
							</Link>
						</li>
						<li>
							<Link
								to='/network'
								className='flex items-center py-2 px-4 rounded-md hover:bg-primary hover:text-white transition-colors'
							>
								<UserPlus className='mr-2' size={20} /> My Network
							</Link>
						</li>
						<li>
							<Link
								to='/notifications'
								className='flex items-center py-2 px-4 rounded-md hover:bg-primary hover:text-white transition-colors'
							>
								<Bell className='mr-2' size={20} /> Notifications
							</Link>
						</li>
					</ul>
				</nav>
			</div>

			<div className='border-t border-base-100 p-4'>
				<Link to={`/profile/${user?.username}`} className='text-sm font-semibold'>
					Visit your profile
				</Link>
			</div>
		</div>
	);
}
