import { createDecipheriv, createHash, scryptSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
const backupFile = process.env.BACKUP_FILE;
const passphrase = process.env.BACKUP_ENCRYPTION_KEY;
const stagingDatabase = process.env.MONGODB_DB;
const targetPrefix = process.env.RESTORE_TARGET_PREFIX;
if (!uri || !backupFile || !passphrase || !stagingDatabase || !targetPrefix) throw Error('MONGODB_URI, MONGODB_DB, BACKUP_FILE, BACKUP_ENCRYPTION_KEY and RESTORE_TARGET_PREFIX are required.');
if (stagingDatabase === 'akudha_production') throw Error('Restore drills cannot run in the production database.');
if (process.env.ALLOW_RESTORE_DRILL !== 'true' || !/^_restore_drill_[a-z0-9_-]+__$/i.test(targetPrefix)) throw Error('Restore is restricted to explicitly authorized _restore_drill_*__ staging collections.');

interface Envelope { format: string; version: number; salt: string; iv: string; tag: string; payloadSha256: string; ciphertext: string }
interface BackupCollection { name: string; documents: mongoose.mongo.BSON.Document[]; indexes: Array<{ name?: string; key: mongoose.mongo.BSON.Document; [key: string]: unknown }> }
interface BackupPayload { format: string; version: number; sourceDatabase: string; collections: BackupCollection[] }

let restored = false;
let cleanupVerified = false;
try {
  const envelope = JSON.parse(await readFile(backupFile, 'utf8')) as Envelope;
  if (envelope.format !== 'akudha-encrypted-backup' || envelope.version !== 1) throw Error('Unsupported backup format.');
  const key = scryptSync(passphrase, Buffer.from(envelope.salt, 'base64'), 32);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const compressed = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
  const serialized = gunzipSync(compressed).toString('utf8');
  if (createHash('sha256').update(serialized).digest('hex') !== envelope.payloadSha256) throw Error('Backup integrity check failed.');
  const payload = mongoose.mongo.BSON.EJSON.parse(serialized) as BackupPayload;
  if (payload.format !== 'akudha-mongodb-backup' || payload.version !== 1) throw Error('Unsupported backup payload.');

  await mongoose.connect(uri, { dbName: stagingDatabase, maxPoolSize: 2, serverSelectionTimeoutMS: 15_000, autoIndex: false });
  const database = mongoose.connection.db;
  if (!database) throw Error('MongoDB connection did not expose a database.');
  const verified: Array<{ name: string; documents: number }> = [];
  for (const item of payload.collections) {
    const targetName = `${targetPrefix}${item.name}`;
    const collection = database.collection(targetName);
    await collection.deleteMany({});
    if (item.documents.length > 0) await collection.insertMany(item.documents);
    for (const index of item.indexes.filter(index => index.name !== '_id_')) {
      const { key: indexKey, name, v: _version, ns: _namespace, ...options } = index;
      await collection.createIndex(indexKey, { ...options, name } as mongoose.mongo.CreateIndexesOptions);
    }
    const count = await collection.countDocuments();
    if (count !== item.documents.length) throw Error(`Restore verification failed for ${item.name}.`);
    verified.push({ name: item.name, documents: count });
  }
  restored = true;
  if (process.env.RESTORE_DRILL_CLEANUP === 'true') {
    for (const item of payload.collections) {
      await database.collection(`${targetPrefix}${item.name}`).drop().catch((error: unknown) => {
        if (!(error instanceof Error) || !error.message.toLowerCase().includes('ns not found')) throw error;
      });
    }
    const remainingCollections = await database.listCollections({}, { nameOnly: true }).toArray();
    const remainingDrillCollections = remainingCollections.filter(collection => collection.name.startsWith(targetPrefix));
    if (remainingDrillCollections.length > 0) throw Error(`Restore cleanup verification failed: ${remainingDrillCollections.map(collection => collection.name).join(', ')}`);
    cleanupVerified = true;
  }
  console.log(JSON.stringify({ restored, sourceDatabase: payload.sourceDatabase, stagingDatabase, targetPrefix, collections: verified, integrity: 'verified', cleanedUp: cleanupVerified }));
} finally {
  await mongoose.disconnect();
}
