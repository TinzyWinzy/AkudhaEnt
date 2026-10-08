import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'akudha_staging';
if (!uri) throw Error('MONGODB_URI is required. Run this command through the deployment environment.');

try {
  await mongoose.connect(uri, { dbName, maxPoolSize: 2, serverSelectionTimeoutMS: 15_000 });
  const database = mongoose.connection.db;
  if (!database) throw Error('MongoDB connection did not expose a database.');
  const hello = await database.admin().command({ hello: 1 }) as { setName?: string };
  if (!hello.setName) throw Error('The managed MongoDB deployment is not a replica set; transactions are unavailable.');
  const session = await mongoose.startSession();
  const checkId = randomUUID();
  try {
    await session.withTransaction(async () => {
      const checks = database.collection('_akudha_connection_checks');
      await checks.insertOne({ checkId, checkedAt: new Date() }, { session });
      await checks.deleteOne({ checkId }, { session });
    });
  } finally {
    await session.endSession();
  }
  console.log(JSON.stringify({ connected: true, database: dbName, replicaSet: hello.setName, transactions: true }));
} finally {
  await mongoose.disconnect();
}
