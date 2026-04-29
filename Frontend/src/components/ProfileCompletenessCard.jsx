import { useMemo } from "react";

const checklistConfig = [
  {
    key: "profilePicture",
    label: "Add profile photo",
    section: "profile-header",
    weight: 10,
    completed: (user) => Boolean(user?.profilePicture),
  },
  {
    key: "headline",
    label: "Add professional headline",
    section: "profile-header",
    weight: 12,
    completed: (user) => Boolean(String(user?.headline || "").trim()),
  },
  {
    key: "about",
    label: "Add about summary",
    section: "profile-about",
    weight: 12,
    completed: (user) => Boolean(String(user?.about || "").trim()),
  },
  {
    key: "experience",
    label: "Add experience",
    section: "profile-experience",
    weight: 15,
    completed: (user) => Array.isArray(user?.experience) && user.experience.length > 0,
  },
  {
    key: "education",
    label: "Add education",
    section: "profile-education",
    weight: 12,
    completed: (user) => Array.isArray(user?.education) && user.education.length > 0,
  },
  {
    key: "skills",
    label: "Add skills",
    section: "profile-skills",
    weight: 15,
    completed: (user) => Array.isArray(user?.skills) && user.skills.length > 0,
  },
  {
    key: "location",
    label: "Add location",
    section: "profile-header",
    weight: 8,
    completed: (user) => Boolean(String(user?.location || "").trim()),
  },
  {
    key: "currentCompany",
    label: "Add current company",
    section: "profile-header",
    weight: 8,
    completed: (user) => Boolean(String(user?.currentCompany || "").trim()),
  },
  {
    key: "resume",
    label: "Upload resume",
    section: "profile-header",
    weight: 8,
    completed: (user) => Boolean(String(user?.resume || "").trim()),
  },
];

const ProfileCompletenessCard = ({ userData, onGoToSection }) => {
  const completeness = useMemo(() => {
    const totalWeight = checklistConfig.reduce((sum, item) => sum + item.weight, 0);
    const completedWeight = checklistConfig.reduce(
      (sum, item) => sum + (item.completed(userData) ? item.weight : 0),
      0,
    );

    const percent = Math.round((completedWeight / totalWeight) * 100);
    const missing = checklistConfig.filter((item) => !item.completed(userData));

    return { percent, missing };
  }, [userData]);

  return (
    <section className="mb-6 rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Profile Strength
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {completeness.percent}% complete
          </h2>
        </div>
        <div className="text-sm font-medium text-slate-600">
          {completeness.missing.length ? `${completeness.missing.length} improvements` : "All done"}
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
          style={{ width: `${completeness.percent}%` }}
        />
      </div>

      {completeness.missing.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {completeness.missing.slice(0, 6).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onGoToSection(item.section)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-emerald-700">
          Your profile is fully optimized. Keep posting and engaging to stay visible.
        </p>
      )}
    </section>
  );
};

export default ProfileCompletenessCard;
