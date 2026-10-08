import mongoose from 'mongoose';
import { ensureProductLabelTemplates } from '../server/lib/labelTemplates.js';
import { ProductModel } from '../server/models/Inventory.js';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) throw Error('MONGODB_URI and MONGODB_DB are required. Run through the deployment environment.');

try {
  await mongoose.connect(uri, { dbName, maxPoolSize: 2, serverSelectionTimeoutMS: 15_000, autoIndex: false });
  await mongoose.connection.collection('labeltemplates').createIndex({ organizationId: 1, productId: 1, version: 1 }, { name: 'organizationId_1_productId_1_version_1', unique: true });
  await mongoose.connection.collection('labelprintjobs').createIndex({ organizationId: 1, createdAt: -1 }, { name: 'organizationId_1_createdAt_-1' });
  await mongoose.connection.collection('labelprintjobs').createIndex({ organizationId: 1, productId: 1, createdAt: -1 }, { name: 'organizationId_1_productId_1_createdAt_-1' });
  const products = await ProductModel.find({ active: true });
  const created = await ensureProductLabelTemplates(products, 'system-bootstrap');
  const approved = await mongoose.connection.collection('labeltemplates').countDocuments({ status: 'approved' });
  console.log(JSON.stringify({ database: dbName, products: products.length, created, approved }));
} finally {
  await mongoose.disconnect();
}
