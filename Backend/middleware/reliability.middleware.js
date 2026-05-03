const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 300);
const AUTH_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const AUTH_MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX || 25);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 60 * 1000);
const rateBuckets = new Map();
const authRateBuckets = new Map();

const clientKey = (req) =>
	req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

const cleanupBuckets = () => {
	const now = Date.now();
	for (const [key, bucket] of rateBuckets.entries()) {
		if (bucket.resetAt <= now) {
			rateBuckets.delete(key);
		}
	}
};

export const requestTimeout = (req, res, next) => {
	res.setTimeout(REQUEST_TIMEOUT_MS, () => {
		if (!res.headersSent) {
			res.status(503).json({ message: "Request timed out" });
		}
	});
	next();
};

export const basicSecurityHeaders = (_req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-XSS-Protection", "0");
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
	res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
	res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	const isUploadsPath = _req.path.startsWith("/uploads/");

	// Allow embedding uploaded assets (e.g., resume PDFs) in the frontend viewer.
	if (!isUploadsPath) {
		res.setHeader("X-Frame-Options", "DENY");
		res.setHeader(
			"Content-Security-Policy",
			"default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' https:; connect-src 'self' https: wss:; font-src 'self' data: https:; upgrade-insecure-requests"
		);
	}

	res.setHeader("Referrer-Policy", "no-referrer");
	if (process.env.NODE_ENV === "production") {
		res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
	}
	next();
};

const sanitizeKey = (key) => {
	if (typeof key !== "string") {
		return key;
	}
	if (key.startsWith("$")) {
		return key.replace(/^\$+/, "");
	}
	if (key.includes(".")) {
		return key.replace(/\./g, "");
	}
	return key;
};

const sanitizeObjectInPlace = (target) => {
	if (!target || typeof target !== "object") {
		return target;
	}

	if (Array.isArray(target)) {
		for (let i = 0; i < target.length; i += 1) {
			const value = target[i];
			if (value && typeof value === "object") {
				sanitizeObjectInPlace(value);
			}
		}
		return target;
	}

	for (const [rawKey, rawValue] of Object.entries(target)) {
		const sanitizedKey = sanitizeKey(rawKey);
		const value = rawValue;

		if (sanitizedKey !== rawKey) {
			delete target[rawKey];
			target[sanitizedKey] = value;
		}

		if (value && typeof value === "object") {
			sanitizeObjectInPlace(value);
		}
	}

	return target;
};

export const sanitizeRequest = (req, _res, next) => {
	if (req.body && typeof req.body === "object") {
		sanitizeObjectInPlace(req.body);
	}
	if (req.query && typeof req.query === "object") {
		sanitizeObjectInPlace(req.query);
	}
	if (req.params && typeof req.params === "object") {
		sanitizeObjectInPlace(req.params);
	}
	next();
};

export const rateLimit = (req, res, next) => {
	if (req.path === "/health") {
		return next();
	}

	const now = Date.now();
	const key = clientKey(req);
	const bucket = rateBuckets.get(key);

	if (!bucket || bucket.resetAt <= now) {
		rateBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
		if (rateBuckets.size > 10000) {
			cleanupBuckets();
		}
		return next();
	}

	bucket.count += 1;
	if (bucket.count > MAX_REQUESTS) {
		res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
		return res.status(429).json({ message: "Too many requests. Please try again shortly." });
	}

	return next();
};

export const authRateLimit = (req, res, next) => {
	const now = Date.now();
	const key = clientKey(req);
	const bucket = authRateBuckets.get(key);

	if (!bucket || bucket.resetAt <= now) {
		authRateBuckets.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
		if (authRateBuckets.size > 10000) {
			const cleanupNow = Date.now();
			for (const [bucketKey, current] of authRateBuckets.entries()) {
				if (current.resetAt <= cleanupNow) {
					authRateBuckets.delete(bucketKey);
				}
			}
		}
		return next();
	}

	bucket.count += 1;
	if (bucket.count > AUTH_MAX_REQUESTS) {
		res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
		return res.status(429).json({ message: "Too many auth attempts. Please try again later." });
	}

	return next();
};
