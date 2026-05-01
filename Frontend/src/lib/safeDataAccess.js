/**
 * 🛡️ SAFE DATA ACCESS UTILITIES
 * 
 * Purpose: Prevent runtime errors like "reduce is not a function"
 * Use these helpers throughout your app for API response handling
 */

/**
 * Ensures value is always an array
 * @param {any} value - The value to check
 * @returns {Array} - Returns array or empty array if not an array
 * 
 * Examples:
 *   toArray(undefined) → []
 *   toArray(null) → []
 *   toArray("string") → []
 *   toArray({}) → []
 *   toArray([1,2,3]) → [1,2,3]
 */
export const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
};

/**
 * Safely access nested API response properties
 * @param {Object} response - API response object
 * @param {string} path - Dot notation path (e.g., "data.conversations")
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} - The value at path or defaultValue
 * 
 * Examples:
 *   safeGet(response, "data", []) → returns response.data or []
 *   safeGet(response, "data.conversations", []) → returns nested value or []
 */
export const safeGet = (obj, path, defaultValue = null) => {
  if (!obj || typeof obj !== "object") return defaultValue;

  const keys = path.split(".");
  let result = obj;

  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }

  return result;
};

/**
 * Safely reduce an array with error handling
 * @param {any} array - The value to reduce (should be array)
 * @param {Function} callback - Reduce callback function
 * @param {*} initialValue - Initial value for reduce
 * @returns {*} - Result of reduce or initialValue if not an array
 * 
 * Examples:
 *   safeReduce(conversations, (total, conv) => total + conv.unreadCount, 0)
 *   // Returns 0 if conversations is not an array
 */
export const safeReduce = (array, callback, initialValue) => {
  if (!Array.isArray(array)) {
    return initialValue;
  }
  return array.reduce(callback, initialValue);
};

/**
 * Safe filter with type checking
 * @param {any} array - The value to filter
 * @param {Function} callback - Filter callback function
 * @returns {Array} - Filtered array or empty array if not an array
 */
export const safeFilter = (array, callback) => {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.filter(callback);
};

/**
 * Safe map with type checking
 * @param {any} array - The value to map
 * @param {Function} callback - Map callback function
 * @returns {Array} - Mapped array or empty array if not an array
 */
export const safeMap = (array, callback) => {
  if (!Array.isArray(array)) {
    return [];
  }
  return array.map(callback);
};

/**
 * Parse API response with proper structure handling
 * @param {Object} response - Full API response from axios
 * @param {string} dataPath - Path to actual data (e.g., "data", "data.items")
 * @returns {Array} - Guaranteed to be an array
 * 
 * Examples:
 *   parseApiResponse(response, "data") → handles response.data structure
 *   parseApiResponse(response, "data.conversations") → handles nested structure
 */
export const parseApiResponse = (response, dataPath = "data") => {
  const data = safeGet(response, dataPath, []);
  return toArray(data);
};

/**
 * Validate data structure before using
 * Useful for debugging API response issues
 * @param {*} data - Data to validate
 * @param {string} expectedType - Expected type ("array", "object", "string", etc)
 * @param {string} context - Context for error message (e.g., "conversations")
 * @returns {boolean} - True if valid
 */
export const validateData = (data, expectedType, context = "data") => {
  const actualType = Array.isArray(data) ? "array" : typeof data;
  
  if (actualType !== expectedType) {
    console.warn(
      `⚠️ Data validation failed for "${context}": Expected ${expectedType}, got ${actualType}`,
      { data }
    );
    return false;
  }
  return true;
};

export default {
  toArray,
  safeGet,
  safeReduce,
  safeFilter,
  safeMap,
  parseApiResponse,
  validateData,
};
