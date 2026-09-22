import { randomUUID } from 'node:crypto';

// Every application gets private storage. Copies prevent accidental mutations
// outside explicit save operations. A database adapter could replace this layer.
export function createMemoryRepositories({ maximumAuditEvents }) {
  const users = new Map();
  const products = new Map();
  const orders = new Map();
  const sessions = new Map();
  const idempotencyRecords = new Map();
  const auditEvents = [];
  const copy = value => value === undefined ? undefined : structuredClone(value);

  function createEntityRepository(records) {
    return {
      findById(identifier) { return copy(records.get(identifier)); },
      findAll() { return [...records.values()].map(copy); },
      save(entity) {
        records.set(entity.id, copy(entity));
        return copy(entity);
      },
    };
  }

  return {
    users: {
      ...createEntityRepository(users),
      findByEmail(email) {
        return copy([...users.values()].find(user => user.email === email));
      },
    },
    products: createEntityRepository(products),
    orders: createEntityRepository(orders),
    sessions: {
      findByTokenHash(tokenHash) { return copy(sessions.get(tokenHash)); },
      save(session) { sessions.set(session.tokenHash, copy(session)); },
      deleteByTokenHash(tokenHash) { sessions.delete(tokenHash); },
      deleteByUserId(userId) {
        for (const [tokenHash, session] of sessions) {
          if (session.userId === userId) sessions.delete(tokenHash);
        }
      },
      deleteExpired(now) {
        for (const [tokenHash, session] of sessions) {
          if (session.expiresAt <= now) sessions.delete(tokenHash);
        }
      },
    },
    idempotency: {
      findByKey(key) { return copy(idempotencyRecords.get(key)); },
      save(key, record) { idempotencyRecords.set(key, copy(record)); },
      count() { return idempotencyRecords.size; },
      deleteExpired(now) {
        for (const [key, record] of idempotencyRecords) {
          if (record.expiresAt <= now) idempotencyRecords.delete(key);
        }
      },
    },
    audit: {
      append(event) {
        auditEvents.push(copy({ id: randomUUID(), ...event }));
        if (auditEvents.length > maximumAuditEvents) auditEvents.shift();
      },
      findAll() { return auditEvents.map(copy); },
    },
  };
}
