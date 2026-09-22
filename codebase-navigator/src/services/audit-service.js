export function createAuditService({ repositories, clock }) {
  return {
    recordEvent(action, actorId, resourceId, requestId, metadata = {}) {
      // Callers provide selected business fields, never request bodies or tokens.
      repositories.audit.append({
        action, actorId, resourceId, requestId, metadata,
        occurredAt: new Date(clock()).toISOString(),
      });
    },
    listEvents() { return repositories.audit.findAll().reverse(); },
  };
}
