"use server";

import { revalidatePath } from "next/cache";
import * as expenseService from "@/services/expense.service";
import { requireSession, type AuthSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const first = (error as { issues: { message?: string }[] }).issues[0];
    if (first?.message) return first.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function run(fn: (session: AuthSession) => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn(await requireSession());
    revalidatePath("/expenses");
    revalidatePath("/finance");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

function readExpense(formData: FormData) {
  const field = (key: string) => String(formData.get(key) ?? "");
  return {
    campusId: field("campusId"),
    categoryId: field("categoryId"),
    date: field("date"),
    amount: field("amount"),
    payee: field("payee"),
    description: field("description"),
    method: field("method"),
    reference: field("reference"),
  };
}

async function attachReceipt(session: AuthSession, expenseId: string, formData: FormData) {
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) await expenseService.addReceipt(session, expenseId, file);
}

export async function createExpenseAction(formData: FormData) {
  return run(async (session) => {
    const expense = await expenseService.createExpense(session, readExpense(formData));
    await attachReceipt(session, expense.id, formData);
  });
}

export async function updateExpenseAction(expenseId: string, formData: FormData) {
  return run(async (session) => {
    await expenseService.updateExpense(session, expenseId, readExpense(formData));
    await attachReceipt(session, expenseId, formData);
  });
}

export async function reviewExpenseAction(expenseId: string, status: "approved" | "rejected", reviewNote?: string) {
  return run((session) => expenseService.reviewExpense(session, expenseId, { status, reviewNote }));
}

export async function deleteExpenseAction(expenseId: string) {
  return run((session) => expenseService.deleteExpense(session, expenseId));
}

export async function removeReceiptAction(attachmentId: string) {
  return run((session) => expenseService.removeReceipt(session, attachmentId));
}

// -- Categories --------------------------------------------------------
export async function createCategoryAction(name: string) {
  return run((session) => expenseService.createCategory(session, { name }));
}

export async function renameCategoryAction(categoryId: string, name: string) {
  return run((session) => expenseService.renameCategory(session, categoryId, { name }));
}

export async function setCategoryArchivedAction(categoryId: string, archived: boolean) {
  return run((session) => expenseService.setCategoryArchived(session, categoryId, archived));
}

// -- Bills --------------------------------------------------------
export async function createBillAction(input: unknown) {
  return run((session) => expenseService.createBill(session, input));
}

export async function updateBillAction(billId: string, input: unknown) {
  return run((session) => expenseService.updateBill(session, billId, input));
}

export async function setBillArchivedAction(billId: string, archived: boolean) {
  return run((session) => expenseService.setBillArchived(session, billId, archived));
}

export async function payBillAction(billId: string, formData: FormData) {
  return run(async (session) => {
    const expense = await expenseService.payBill(session, billId, {
      date: String(formData.get("date") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      method: String(formData.get("method") ?? ""),
      reference: String(formData.get("reference") ?? ""),
      description: String(formData.get("description") ?? ""),
    });
    await attachReceipt(session, expense.id, formData);
  });
}
