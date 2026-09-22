import { paginateRecords } from '../services/pagination.js';

export function createAdministrationController({ userService, auditService, metrics, clock }) {
  return {
    listUsers(request, response) {
      response.json(paginateRecords(userService.listUsers(), request.validated.query));
    },
    listAuditEvents(request, response) {
      response.json(paginateRecords(auditService.listEvents(), request.validated.query));
    },
    getMetrics(request, response) {
      response.json({ data: {
        completedRequests: metrics.completedRequests, serverErrors: metrics.serverErrors,
        uptimeSeconds: Math.floor((clock() - metrics.startedAt) / 1000),
      } });
    },
  };
}
