import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Store } from "./index";

// Development-only store: one JSON file on disk. Production uses Supabase.
const FILE = path.join(process.cwd(), ".data", "db.json");

type Db = Record<string, Record<string, Record<string, unknown>>>; // user -> collection -> id -> data

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

async function write(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

// Serialise writes so concurrent server actions don't clobber each other.
function mutate(fn: (db: Db) => void) {
  const next = queue.then(async () => {
    const db = await read();
    fn(db);
    await write(db);
  });
  queue = next.catch(() => {});
  return next;
}

function bucket(db: Db, userId: string, collection: string) {
  db[userId] ??= {};
  db[userId][collection] ??= {};
  return db[userId][collection];
}

export const fileStore: Store = {
  async list(userId, collection) {
    const db = await read();
    return Object.values(db[userId]?.[collection] ?? {}) as never;
  },
  async get(userId, collection, id) {
    const db = await read();
    return (db[userId]?.[collection]?.[id] ?? null) as never;
  },
  async put(userId, collection, id, data) {
    await mutate(db => {
      bucket(db, userId, collection)[id] = data as Record<string, unknown>;
    });
  },
  async putMany(userId, collection, rows) {
    await mutate(db => {
      const b = bucket(db, userId, collection);
      for (const row of rows) b[row.id] = row.data as Record<string, unknown>;
    });
  },
  async remove(userId, collection, id) {
    await mutate(db => {
      delete bucket(db, userId, collection)[id];
    });
  },
  async usersWithPreferences() {
    const db = await read();
    return Object.keys(db).filter(user => db[user].preferences?.me);
  },
};
