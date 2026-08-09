"use server";

// Parent: REQ-0030
import { parseEntityId } from "@/lib/actionInputs";
import { measureMutation } from "@/lib/observability/telemetry";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { scheduleReservationOutboxDelivery } from "@/lib/circulation/scheduleOutbox";
import {
  getActionErrorMessage,
  requireAuthenticatedActor,
} from "@/lib/auth/authorization";
import {
  cancelReservation,
  createReservation,
  fulfillReservation,
  renewBorrow,
} from "@/lib/circulation/reservations";
import { logActivity } from "@/lib/admin/activityLog";

export async function reserveUnavailableBook(bookId: string) {
  try {
    const actor = await requireAuthenticatedActor();
    const safeBookId = parseEntityId(bookId);
    const result = await measureMutation("circulation.reserve", () =>
      createReservation(safeBookId, actor),
    );
    scheduleReservationOutboxDelivery();
    if (result.success) {
      await logActivity({
        actorId: actor.id,
        action: "CREATE",
        entityType: "reservation",
        entityId: result.data.id,
        details: {
          status: "WAITING",
          bookId: result.data.bookId ?? safeBookId,
          userId: actor.id,
        },
      });
      revalidateMutationPaths("reservation.lifecycle");
    }
    return result;
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error, "Unable to reserve book") };
  }
}

export async function cancelBookReservation(reservationId: string) {
  try {
    const actor = await requireAuthenticatedActor();
    const safeId = parseEntityId(reservationId);
    const result = await measureMutation("circulation.cancel", () =>
      cancelReservation(safeId, actor),
    );
    scheduleReservationOutboxDelivery();
    if (result.success) {
      await logActivity({
        actorId: actor.id,
        action: "UPDATE",
        entityType: "reservation",
        entityId: safeId,
        details: {
          status: "CANCELLED",
          bookId: result.data.bookId,
          userId: actor.id,
        },
      });
      revalidateMutationPaths("reservation.lifecycle");
    }
    return result;
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error, "Unable to cancel reservation") };
  }
}

export async function renewBorrowedBook(recordId: string, commandId: string) {
  try {
    const actor = await requireAuthenticatedActor();
    const safeRecordId = parseEntityId(recordId);
    const result = await measureMutation("circulation.renew", () =>
      renewBorrow(safeRecordId, actor, parseEntityId(commandId)),
    );
    if (result.success) {
      await logActivity({
        actorId: actor.id,
        action: "UPDATE",
        entityType: "borrow",
        entityId: safeRecordId,
        details: {
          status: "RENEWED",
          bookId: result.data.bookId,
          userId: actor.id,
          dueDate: result.data.dueDate,
        },
      });
      revalidateMutationPaths("renewal.write");
    }
    return result;
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error, "Unable to renew loan") };
  }
}

export async function borrowReservedBook(reservationId: string) {
  try {
    const actor = await requireAuthenticatedActor();
    const safeId = parseEntityId(reservationId);
    const result = await measureMutation("circulation.fulfill", () =>
      fulfillReservation(safeId, actor),
    );
    scheduleReservationOutboxDelivery();
    if (result.success) {
      await logActivity({
        actorId: actor.id,
        action: "UPDATE",
        entityType: "reservation",
        entityId: safeId,
        details: {
          status: "FULFILLED",
          bookId: result.data.bookId,
          userId: actor.id,
        },
      });
      revalidateMutationPaths("reservation.lifecycle");
    }
    return result;
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error, "Unable to claim reservation") };
  }
}
