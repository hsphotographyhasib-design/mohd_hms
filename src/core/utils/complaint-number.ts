import { db } from '@/core/database/db';

/**
 * Generate a complaint number that is not already used within the tenant.
 *
 * `complaintNumber` has no unique DB constraint, and the historical approach
 * (`count() + 1`) is racy — two concurrent creates read the same count and
 * produce the same number. This helper re-checks for an existing row and
 * advances past any number already committed, then falls back to a random
 * suffix so it can never loop forever.
 *
 * NOTE: this closes the common case (sequential submissions), but not two
 * genuinely simultaneous inserts. Fully eliminating the race requires a
 * unique constraint on `complaintNumber` + P2002 retry, or an atomic
 * per-tenant counter — tracked as a follow-up (schema change).
 *
 * @param tenantId  Tenant the complaint belongs to.
 * @param format    Formats a sequence number into the final string
 *                  (e.g. `(n) => \`CMP/2026/\${String(n).padStart(6, '0')}\``).
 * @param seedCount The current count used as the starting sequence value.
 */
export async function generateUniqueComplaintNumber(
  tenantId: string,
  format: (seq: number) => string,
  seedCount: number,
): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const candidate = format(seedCount + 1 + i);
    const existing = await db.complaint.findFirst({
      where: { tenantId, complaintNumber: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  // Extremely unlikely: fall back to a value that includes a random suffix.
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${format(seedCount + 1)}-${suffix}`;
}
