import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) throw Error('MONGODB_URI and MONGODB_DB are required. Run through the deployment environment.');

const indexName = 'organizationId_1_gtin_1';

try {
  await mongoose.connect(uri, { dbName, maxPoolSize: 2, serverSelectionTimeoutMS: 15_000, autoIndex: false });
  const database = mongoose.connection.db;
  if (!database) throw Error('MongoDB connection did not expose a database.');

  const collection = database.collection('inventoryproducts');
  const normalized = await collection.updateMany({ gtin: null }, { $unset: { gtin: '' } });
  const indexes = await collection.indexes();
  const current = indexes.find(index => index.name === indexName);
  const partialGtin = current?.partialFilterExpression as { gtin?: { $type?: string } } | undefined;
  const isCurrent = current?.unique === true && partialGtin?.gtin?.$type === 'string';

  if (current && !isCurrent) await collection.dropIndex(indexName);
  if (!isCurrent) {
    await collection.createIndex(
      { organizationId: 1, gtin: 1 },
      { name: indexName, unique: true, partialFilterExpression: { gtin: { $type: 'string' } } },
    );
  }

  const remainingNulls = await collection.countDocuments({ gtin: null });
  console.log(JSON.stringify({ database: dbName, normalized: normalized.modifiedCount, index: indexName, partialUnique: true, remainingNulls }));
} finally {
  await mongoose.disconnect();
}
