const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const toPositiveInteger = (value, fallback) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getPagination = (query = {}, options = {}) => {
	const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
	const maxLimit = options.maxLimit || MAX_LIMIT;
	const limit = Math.min(toPositiveInteger(query.limit, defaultLimit), maxLimit);
	const page = toPositiveInteger(query.page, 1);
	const skip = (page - 1) * limit;

	return { page, limit, skip };
};

