import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios.js";
import { toast } from "react-hot-toast";
import { Check, Eye, EyeOff, Loader, X } from "lucide-react";
import GoogleLoginComp from "../googleLoginComp.jsx";

const companySizeOptions = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100";

const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const isValidUsername = (username) =>
  typeof username === "string" && /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_]{4,20}$/.test(username.trim());

const passwordChecks = (password) => [
  { label: "At least 8 characters", valid: password.length >= 8 },
  { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
  { label: "One lowercase letter", valid: /[a-z]/.test(password) },
  { label: "One number", valid: /\d/.test(password) },
  { label: "One special character", valid: /[^A-Za-z0-9]/.test(password) },
];

const SignUpForm = ({ defaultRecruiter = false }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [registerAsRecruiter, setRegisterAsRecruiter] = useState(defaultRecruiter);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companySize, setCompanySize] = useState(companySizeOptions[0]);
  const [industry, setIndustry] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [HRName, setHRName] = useState("");
  const [hiringContactEmail, setHiringContactEmail] = useState("");
  const otpInputRefs = useRef([]);

  const queryClient = useQueryClient();
  const usernameIsValid = isValidUsername(username);
  const passwordRules = passwordChecks(password);
  const otp = otpDigits.join("");

  useEffect(() => {
    if (!otpCountdown || isEmailVerified) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setOtpCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [otpCountdown, isEmailVerified]);

  const { mutate: signUpMutation, isPending } = useMutation({
    mutationFn: async (data) => {
      const res = await axiosInstance.post("/auth/signup", data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.role === "recruiter"
          ? "Recruiter account created successfully"
          : "Account created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Something went wrong");
    },
  });

  const { mutate: sendOtpMutation, isPending: isSendingOtp } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/auth/signup/send-otp", {
        email,
        name,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "OTP sent successfully");
      setOtpCountdown(data?.resendAvailableInSeconds || 60);
      setIsEmailVerified(false);
      setOtpDigits(["", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    },
  });

  const { mutate: verifyOtpMutation, isPending: isVerifyingOtp } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/auth/signup/verify-otp", {
        email,
        otp,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setIsEmailVerified(true);
      setOtpCountdown(0);
      toast.success(data?.message || "Email verified successfully");
    },
    onError: (err) => {
      setIsEmailVerified(false);
      toast.error(err.response?.data?.message || "Failed to verify OTP");
    },
  });

  const handleSignUp = (e) => {
    e.preventDefault();

    if (!usernameIsValid) {
      toast.error("Username must be 4-20 characters and include both letters and numbers");
      return;
    }

    if (!isStrongPassword(password)) {
      toast.error(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      );
      return;
    }

    if (!isEmailVerified) {
      toast.error("Please verify your email with OTP before signing up");
      return;
    }

      const payload = {
      name,
      username,
      email,
      password,
      role: registerAsRecruiter ? "recruiter" : "user",
    };

    if (registerAsRecruiter) {
      payload.companyName = companyName;
      payload.companyWebsite = companyWebsite;
      payload.companySize = companySize;
      payload.industry = industry;
      payload.companyLocation = companyLocation;
      payload.HRName = HRName;
      payload.hiringContactEmail = hiringContactEmail;
    }

    signUpMutation(payload);
  };

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <label htmlFor="signup-name" className="text-sm font-medium text-slate-700">
          Full Name
        </label>
        <input
          id="signup-name"
          type="text"
          placeholder="e.g. Priya Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="signup-username" className="text-sm font-medium text-slate-700">
          Username
        </label>
        <input
          id="signup-username"
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={fieldClassName}
          required
        />
        <div className={`flex items-center gap-2 text-xs ${username ? (usernameIsValid ? "text-emerald-700" : "text-slate-500") : "text-slate-500"}`}>
          {username && usernameIsValid ? <Check size={14} /> : <X size={14} />}
          <span>Username must be 4-20 characters and include both letters and numbers.</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setIsEmailVerified(false);
            setOtpDigits(["", "", "", ""]);
            setOtpCountdown(0);
          }}
          className={fieldClassName}
          required
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => sendOtpMutation()}
            disabled={!email.trim() || isSendingOtp || otpCountdown > 0}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {isSendingOtp ? "Sending OTP..." : otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : "Verify Email"}
          </button>
          {isEmailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              <Check size={14} />
              Email verified
            </span>
          ) : (
            <span className="text-xs text-slate-500">Send OTP and verify this email before signup.</span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            {otpDigits.map((digit, index) => (
              <input
                key={`otp-digit-${index}`}
                ref={(element) => {
                  otpInputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => {
                  const nextValue = e.target.value.replace(/\D/g, "").slice(-1);
                  const nextDigits = [...otpDigits];
                  nextDigits[index] = nextValue;
                  setOtpDigits(nextDigits);
                  setIsEmailVerified(false);

                  if (nextValue && index < otpDigits.length - 1) {
                    otpInputRefs.current[index + 1]?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
                    otpInputRefs.current[index - 1]?.focus();
                  }
                }}
                className="h-12 w-12 rounded-xl border border-slate-200 bg-white text-center text-lg font-semibold text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => verifyOtpMutation()}
            disabled={otp.trim().length !== 4 || isVerifyingOtp}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="signup-password" className="text-sm font-medium text-slate-700">
          Password
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${fieldClassName} pr-12`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500 hover:text-slate-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-2">
            {passwordRules.map((rule) => (
              <div key={rule.label} className={`flex items-center gap-2 text-xs ${rule.valid ? "text-emerald-700" : "text-slate-500"}`}>
                {rule.valid ? <Check size={14} /> : <X size={14} />}
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={registerAsRecruiter}
          onChange={(e) => setRegisterAsRecruiter(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>Register as Recruiter / Company</span>
      </label>

      {registerAsRecruiter && (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <h3 className="text-sm font-semibold text-emerald-900">Company Details</h3>

          <input
            type="text"
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={fieldClassName}
            required
          />
          <input
            type="url"
            placeholder="Company Website"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            className={fieldClassName}
          />
          <select
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            className={fieldClassName}
          >
            {companySizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={fieldClassName}
          />
          <input
            type="text"
            placeholder="Company Location"
            value={companyLocation}
            onChange={(e) => setCompanyLocation(e.target.value)}
            className={fieldClassName}
          />
          <input
            type="text"
            placeholder="HR Name (optional)"
            value={HRName}
            onChange={(e) => setHRName(e.target.value)}
            className={fieldClassName}
          />
          <input
            type="email"
            placeholder="Hiring Contact Email (optional)"
            value={hiringContactEmail}
            onChange={(e) => setHiringContactEmail(e.target.value)}
            className={fieldClassName}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !isEmailVerified}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <>
            <Loader className="size-5 animate-spin" />
            <span>Signing up...</span>
          </>
        ) : (
          "Agree & Join"
        )}
      </button>

      <div className="my-1 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Or continue with</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
        <GoogleLoginComp
          authRole={registerAsRecruiter ? "recruiter" : "user"}
          extraPayload={
            registerAsRecruiter
              ? {
                  companyName,
                  companyWebsite,
                  companySize,
                  industry,
                  companyLocation,
                  HRName,
                  hiringContactEmail,
                }
              : {}
          }
          onSuccessNavigateTo={registerAsRecruiter ? "/recruiter/dashboard" : "/"}
        />
      </div>
    </form>
  );
};

export default SignUpForm;
