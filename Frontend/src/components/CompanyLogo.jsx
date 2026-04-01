import { useEffect, useState } from "react";

const defaultLogo = "/worknet_logo_1.png";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const CompanyLogo = ({ src, name = "Company", className = "" }) => {
  const [imageSrc, setImageSrc] = useState(src || defaultLogo);

  useEffect(() => {
    setImageSrc(src || defaultLogo);
  }, [src]);

  if (!imageSrc) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-slate-200 font-semibold text-slate-700 ${className}`}
      >
        {getInitials(name) || "CO"}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={name}
      className={className}
      onError={() => setImageSrc(defaultLogo)}
    />
  );
};

export default CompanyLogo;
