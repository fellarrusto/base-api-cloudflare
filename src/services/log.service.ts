import { AuditLog } from '../models/log.model';

// stub — qui collegherai elasticsearch
const logs: AuditLog[] = [];

export function saveLog(log: AuditLog) {
  logs.push(log);
}

export function getLogs(): AuditLog[] {
  return logs;
}