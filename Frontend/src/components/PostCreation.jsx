import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { FileText, Image, Loader, Sparkles, Wand2, X } from "lucide-react";

const PostCreation = ({ user }) => {
	const [content, setContent] = useState("");
	const [image, setImage] = useState(null);
	const [imagePreview, setImagePreview] = useState(null);
	const [isAiModalOpen, setIsAiModalOpen] = useState(false);
	const [aiPrompt, setAiPrompt] = useState("");
	const [aiContextFile, setAiContextFile] = useState(null);
	const [aiDraft, setAiDraft] = useState("");

	const queryClient = useQueryClient();

	const { mutate: createPostMutation, isLoading } = useMutation({
		mutationFn: async (postData) => {
			// For FormData, axios will automatically set Content-Type with boundary
			// For JSON, explicitly set Content-Type
			const isFormData = postData instanceof FormData;
			const config = isFormData 
				? {} // Let axios handle Content-Type for FormData
				: { 
					headers: { "Content-Type": "application/json" } 
				};
			
			const res = await axiosInstance.post("/posts/create", postData, config);
			return res.data;
		},
		onSuccess: () => {
			resetForm();
			toast.success("Post created successfully");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (err) => {
			console.error("Post creation error:", err);
			const errorMessage = err?.response?.data?.message || err?.message || "Failed to create post";
			toast.error(errorMessage);
		},
	});

	const { mutate: generateAIDraft, isLoading: isGeneratingDraft } = useMutation({
		mutationFn: async () => {
			const trimmedPrompt = aiPrompt.trim();
			if (!trimmedPrompt) {
				throw new Error("Please describe what you want the AI to write");
			}

			const formData = new FormData();
			formData.append("prompt", trimmedPrompt);

			if (aiContextFile) {
				formData.append("contextFile", aiContextFile);
			}

			const res = await axiosInstance.post("/ai/generate-post-draft", formData);
			return res.data;
		},
		onSuccess: (data) => {
			setAiDraft(data.draft || "");
			toast.success("Draft generated");
		},
		onError: (err) => {
			const errorMessage = err?.response?.data?.message || err?.message || "Failed to generate draft";
			toast.error(errorMessage);
		},
	});

	const handlePostCreation = async () => {
		try {
			if (!user) {
				toast.error("You must be signed in to create a post");
				return;
			}

			const trimmed = content.trim();
			if (!trimmed && !image) {
				toast.error("Please add some text or an image before sharing");
				return;
			}

			let postData;
			if (image) {
				// Use FormData for image uploads
				const formData = new FormData();
				formData.append("content", trimmed);
				formData.append("image", image);
				postData = formData;
			} else {
				// Use JSON for text-only posts
				postData = { content: trimmed };
			}

			createPostMutation(postData);
		} catch (error) {
			console.error("Error in handlePostCreation:", error);
			toast.error("Something went wrong while creating the post");
		}
	};

	const closeAIModal = () => {
		setIsAiModalOpen(false);
		setAiDraft("");
		setAiPrompt("");
		setAiContextFile(null);
	};

	const handleGenerateDraft = () => {
		if (!user) {
			toast.error("You must be signed in to use AI drafting");
			return;
		}

		generateAIDraft();
	};

	const handleInsertDraft = () => {
		if (!aiDraft.trim()) {
			toast.error("Generate a draft first");
			return;
		}

		setContent(aiDraft);
		closeAIModal();
		toast.success("Draft inserted into your post");
	};

	const resetForm = () => {
		setContent("");
		setImage(null);
		setImagePreview(null);
	};

	const handleImageChange = (e) => {
		const file = e.target.files?.[0] ?? null;
		setImage(file);
		if (file) {
			readFileAsDataURL(file).then(setImagePreview).catch(() => {
				setImagePreview(null);
			});
		} else {
			setImagePreview(null);
		}
	};

	const readFileAsDataURL = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result);
			reader.onerror = () => reject(new Error("Failed to read file"));
			reader.readAsDataURL(file);
		});
	};

	return (
		<div className="bg-secondary rounded-lg shadow mb-2 md:mb-4 lg:mb-4 p-4">
			<div className="flex space-x-3">
				<img
					src={
						user?.role === "recruiter"
							? user?.companyLogo || user?.profilePicture || "/avatar.png"
							: user?.profilePicture || "/avatar.png"
					}
					alt={user?.name || "Profile"}
					className="size-10 rounded-full hidden md:block lg:block"
				/>
				<textarea
					placeholder="What's on your mind?"
					className="w-full p-2 rounded-lg bg-base-100 hover:bg-base-200 focus:bg-base-200 focus:outline-none resize-none transition-colors duration-200 h-[250px] md:h-[100px] lg:h-[100px]"
					value={content}
					onChange={(e) => setContent(e.target.value)}
				/>
			</div>

			{imagePreview && (
				<div className="mt-4">
					<img src={imagePreview} alt="Selected" className="w-full h-auto rounded-lg" />
				</div>
			)}

			<div className="flex justify-between items-center mt-2">
				<div className="flex space-x-4">
					<label className="flex items-center text-info hover:text-info-dark transition-colors duration-200 cursor-pointer">
						<Image size={20} className="mr-1" />
						<span>Photo</span>
						<input
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handleImageChange}
						/>
					</label>
					<button
						type="button"
						onClick={() => setIsAiModalOpen(true)}
						className="flex items-center rounded-lg bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={!user}
					>
						<Sparkles size={18} className="mr-2" />
						<span>AI Assist</span>
					</button>
				</div>

				<button
					className="bg-primary text-white rounded-lg px-3 py-[6px] md:px-4 md:py-2 lg:px-4 lg:py-2 hover:bg-primary-dark transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
					onClick={handlePostCreation}
					disabled={isLoading || !user || (!content.trim() && !image)}
					aria-busy={isLoading ? "true" : "false"}
				>
					{isLoading ? <Loader className="size-5 animate-spin" /> : "Share"}
				</button>
			</div>

			{isAiModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
					<div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
						<div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">AI writing helper</p>
								<h3 className="text-xl font-semibold text-slate-900">Generate a post draft from any prompt</h3>
							</div>
							<button
								type="button"
								onClick={closeAIModal}
								className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
							>
								<X size={20} />
							</button>
						</div>

						<div className="grid gap-6 overflow-y-auto px-6 py-5 md:grid-cols-[1.1fr_0.9fr]">
							<div className="min-w-0">
								<label className="mb-2 block text-sm font-medium text-slate-700">What should the AI write?</label>
								<textarea
									value={aiPrompt}
									onChange={(e) => setAiPrompt(e.target.value)}
									placeholder="Example: Write a short professional post announcing our new product launch. Use the uploaded context and keep the tone confident."
									className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
								/>

								<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
									<label className="flex cursor-pointer items-center justify-between gap-4">
										<div>
											<p className="text-sm font-medium text-slate-800">Optional context file</p>
											<p className="text-xs text-slate-500">Supports TXT, CSV, JSON, Markdown, PNG, JPG, and WEBP up to 5MB.</p>
										</div>
										<div className="inline-flex items-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
											<FileText size={16} className="mr-2" />
											<span>{aiContextFile ? "Change file" : "Choose file"}</span>
										</div>
										<input
											type="file"
											accept=".txt,.csv,.json,.md,.markdown,image/png,image/jpeg,image/jpg,image/webp"
											className="hidden"
											onChange={(e) => setAiContextFile(e.target.files?.[0] ?? null)}
										/>
									</label>

									{aiContextFile && (
										<div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
											<span className="truncate pr-3">{aiContextFile.name}</span>
											<button
												type="button"
												onClick={() => setAiContextFile(null)}
												className="text-slate-500 transition hover:text-red-500"
											>
												Remove
											</button>
										</div>
									)}
								</div>

								<div className="mt-5 flex flex-wrap gap-3">
									<button
										type="button"
										onClick={handleGenerateDraft}
										className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={isGeneratingDraft}
									>
										{isGeneratingDraft ? <Loader size={18} className="mr-2 animate-spin" /> : <Wand2 size={18} className="mr-2" />}
										Generate draft
									</button>
									<button
										type="button"
										onClick={closeAIModal}
										className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
									>
										Decline
									</button>
								</div>
							</div>

							<div className="flex min-h-0 flex-col rounded-3xl bg-slate-950 p-5 text-white">
								<p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Preview</p>
								<div className="min-h-[300px] max-h-[45vh] overflow-y-auto rounded-2xl bg-white/8 p-4 text-sm leading-7 text-slate-100">
									{aiDraft ? (
										<p className="whitespace-pre-wrap">{aiDraft}</p>
									) : (
										<p className="text-slate-400">
											Your generated draft will appear here. You can review it first and only insert it if it feels right.
										</p>
									)}
								</div>

								<div className="mt-4 flex flex-wrap gap-3">
									<button
										type="button"
										onClick={handleInsertDraft}
										className="rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={!aiDraft.trim()}
									>
										Insert into post
									</button>
									<button
										type="button"
										onClick={() => setAiDraft("")}
										className="rounded-xl border border-white/20 px-4 py-2.5 font-medium text-white transition hover:bg-white/10"
										disabled={!aiDraft.trim()}
									>
										Clear draft
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
export default PostCreation;
