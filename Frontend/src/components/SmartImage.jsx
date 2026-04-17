import { useEffect, useState } from "react";
import { resolveImageUrl } from "../lib/imageUrl";

const SmartImage = ({
  src,
  fallbackSrc = "/avatar.png",
  alt = "",
  className = "",
  ...props
}) => {
  const resolvedSrc = resolveImageUrl(src);
  const resolvedFallbackSrc = resolveImageUrl(fallbackSrc) || "/avatar.png";
  const [imageSrc, setImageSrc] = useState(resolvedSrc || resolvedFallbackSrc);

  useEffect(() => {
    setImageSrc(resolvedSrc || resolvedFallbackSrc);
  }, [resolvedSrc, resolvedFallbackSrc]);

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (imageSrc !== resolvedFallbackSrc) {
          setImageSrc(resolvedFallbackSrc);
        }
      }}
    />
  );
};

export default SmartImage;
