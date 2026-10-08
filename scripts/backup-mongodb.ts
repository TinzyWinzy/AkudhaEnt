import { createCipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const passphrase = process.env.BACKUP_ENCRYPTION_KEY;
if (!uri || !dbName) throw Error('MONGODB_URI and MONGODB_DB are required.');
if (!passphrase || passphrase.length < 32) throw Error('BACKUP_ENCRYPTION_KEY must contain at least 32 characters.');

const outputDirectory = path.resolve(process.env.BACKUP_OUTPUT_DIR || '.backups');
const createdAt = new Date();

try {
  await mongoose.connect(uri, { dbName, maxPoolSize: 2, serverSelectionTimeoutMS: 15_000, autoIndex: false });
  const database = mongoose.connection.db;
  if (!database) throw Error('MongoDB connection did not expose a database.');
  const names = (await database.listCollections({}, { nameOnly: true }).toArray()).map(item => item.name).filter(name => !name.startsWith('system.')).sort();
  const collections = [];
  for (const name of names) {
    const collection = database.collection(name);
    collections.push({ name, documents: await collection.find({}).toArray(), indexes: await collection.indexes() });
  }
  const payload = { format: 'akudha-mongodb-backup', version: 1, createdAt: createdAt.toISOString(), sourceDatabase: dbName, collections };
  const serialized = mongoose.mongo.BSON.EJSON.stringify(payload, { relaxed: false });
  const compressed = gzipSync(Buffer.from(serialized));
  const salt = randomBytes(16); const iv = randomBytes(12); const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const envelope = { format: 'akudha-encrypted-backup', version: 1, algorithm: 'aes-256-gcm', createdAt: payload.createdAt, sourceDatabase: dbName, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), payloadSha256: createHash('sha256').update(serialized).digest('hex'), ciphertext: ciphertext.toString('base64') };
  await mkdir(outputDirectory, { recursive: true });
  const filename = `${dbName}-${createdAt.toISOString().replace(/[:.]/g, '-')}.akudha-backup`;
  const file = path.join(outputDirectory, filename);
  const encoded = JSON.stringify(envelope);
  await writeFile(file, encoded, { mode: 0o600 });
  console.log(JSON.stringify({ file, database: dbName, collections: collections.map(item => ({ name: item.name, documents: item.documents.length })), encrypted: true, bytes: Buffer.byteLength(encoded), sha256: createHash('sha256').update(encoded).digest('hex') }));
} finally {
  await mongoose.disconnect();
}
