import mongoose from "mongoose";

const cleanupLegacyIndexes = async (connection) => {
	try {
		const jobsCollection = connection.collection("jobs");
		const indexes = await jobsCollection.indexes();

		// Legacy invalid index for two array fields caused:
		// "cannot index parallel arrays [targetCities] [targetColleges]"
		const legacyIndex = indexes.find((index) => {
			const keys = Object.keys(index.key || {});
			return keys.includes("targetColleges") && keys.includes("targetCities");
		});

		if (legacyIndex?.name) {
			await jobsCollection.dropIndex(legacyIndex.name);
			console.log(`Dropped legacy jobs index: ${legacyIndex.name}`);
		}
	} catch (error) {
		console.warn("Legacy index cleanup skipped:", error.message);
	}
};

export const connectDB = async () => {
	try {
		mongoose.set("bufferCommands", false);

		const conn = await mongoose.connect(process.env.MONGO_URI, {
			maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 50),
			minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 5),
			serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
			socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
			maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIME_MS || 60000),
			retryWrites: true,
		});
		await cleanupLegacyIndexes(conn.connection);
		console.log(`MongoDB connected: ${conn.connection.host}`);
	} catch (error) {
		console.error(`Error connecting to MongoDB: ${error.message}`);
		process.exit(1);
	}
};
