import type { PublicUser } from "@aicte/shared";
import { verifyPassword } from "../auth/password";
import {
  findInstitution,
  findUserByEmail,
  findUserById,
  type UserRecord,
} from "../store/database";

export function toPublicUser(record: UserRecord): PublicUser {
  const institution = record.institutionId ? findInstitution(record.institutionId) : null;
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    institutionId: record.institutionId,
    institutionName: institution?.name ?? null,
    createdAt: record.createdAt,
  };
}

export function authenticate(email: string, password: string): PublicUser | null {
  const record = findUserByEmail(email.trim());
  if (!record) return null;
  if (!verifyPassword(password, record.passwordHash)) return null;
  return toPublicUser(record);
}

export function findPublicUserById(id: string): PublicUser | null {
  const record = findUserById(id);
  return record ? toPublicUser(record) : null;
}
