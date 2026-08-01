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

export async function reserveUnavailableBook(bookId: string) {
  try {
    const actor = await requireAuthenticatedActor();
    const result = await measureMutation("circulation.reserve", () => createReservation(parseEntityId(bookId), actor));
    scheduleReservationOutboxDelivery();
    if (result.success) revalidateMutationPaths("reservation.lifecycle");
    return result;
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error, "Unable to reserve book") };
  }
}

export async function cancelBookReservation(reservationId: string) {
  try {
    const actor = await requireAuthenticatedActor();
    const result = await measureMutation("circulation.cancel", () => cancelReservation(parseEntityId(reservationId), actor));
    scheduleReservationOutboxDelivery();
    if (result.success) revalidateMutationPaths("reservation.lifecycle");
    return result;
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error, "Unable to cancel reservation") };
  }
}

export async function renewBorrowedBook(recordId: string, commandId: string) {
  try {
    const actor = await requireAuthenticatedActor();
    const result = await measureMutation("circulation.renew", () => renewBorrow(parseEntityId(recordId), actor, parseEntityId(commandId)));
    if (result.success) revalidateMutationPaths("renewal.write");
    return result;
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error, "Unable to renew loan") };
  }
}

export async function borrowReservedBook(reservationId: string) {
  try {
    const actor = await requireAuthenticatedActor();
    const result = await measureMutation("circulation.fulfill", () => fulfillReservation(parseEntityId(reservationId), actor));
    scheduleReservationOutboxDelivery();
    if (result.success) revalidateMutationPaths("reservation.lifecycle");
    return result;
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error, "Unable to claim reservation") };
  }
}
