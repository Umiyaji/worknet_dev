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
		const conn = await mongoose.connect(process.env.MONGO_URI);
		await cleanupLegacyIndexes(conn.connection);
		console.log(`MongoDB connected: ${conn.connection.host}`);
	} catch (error) {
		console.error(`Error connecting to MongoDB: ${error.message}`);
		process.exit(1);
	}
};
