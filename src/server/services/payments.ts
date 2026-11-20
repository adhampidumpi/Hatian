import "server-only";
import { paymentSnapshot } from "@/lib/activity";
import type { RecordPaymentInput } from "@/lib/validation/payments";
import { db } from "../db";
import { requireMembership } from "./access";
import { logActivity } from "./activity-log";
import { badRequest, notFound } from "./errors";

/** Record that one member paid another (settling up, fully or partly). */
export async function recordPayment(userId: string, input: RecordPaymentInput) {
  const me = await requireMembership(input.groupId, userId);
  return db.$transaction(async (tx) => {
    const people = await tx.groupMember.count({
      where: {
        groupId: input.groupId,
        removedAt: null,
        id: { in: [input.fromId, input.toId] },
      },
    });
    if (people !== 2) throw badRequest("Pick two people in this group.");

    const payment = await tx.payment.create({
      data: {
        groupId: input.groupId,
        fromId: input.fromId,
        toId: input.toId,
        amount: input.amount,
        currency: me.group.currency,
        method: input.method,
        reference: input.reference || null,
        date: new Date(`${input.date}T00:00:00Z`),
        createdById: userId,
      },
    });
    await logActivity(tx, {
      groupId: input.groupId,
      actorId: userId,
      entityId: payment.id,
      diff: { type: "PAYMENT_RECORDED", after: paymentSnapshot(payment) },
    });
    return { id: payment.id };
  });
}

/** Soft delete (the Undo after recording, or removing a mistake). */
export async function deletePayment(
  userId: string,
  groupId: string,
  paymentId: string,
) {
  await requireMembership(groupId, userId);
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, groupId, deletedAt: null },
    });
    if (!payment) throw notFound("That payment");
    await tx.payment.update({
      where: { id: paymentId },
      data: { deletedAt: new Date() },
    });
    await logActivity(tx, {
      groupId,
      actorId: userId,
      entityId: paymentId,
      diff: { type: "PAYMENT_DELETED", before: paymentSnapshot(payment) },
    });
  });
}

export async function restorePayment(
  userId: string,
  groupId: string,
  paymentId: string,
) {
  await requireMembership(groupId, userId);
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, groupId, deletedAt: { not: null } },
    });
    if (!payment) throw notFound("That payment");
    await tx.payment.update({
      where: { id: paymentId },
      data: { deletedAt: null },
    });
    await logActivity(tx, {
      groupId,
      actorId: userId,
      entityId: paymentId,
      diff: { type: "PAYMENT_RESTORED", after: paymentSnapshot(payment) },
    });
  });
}
