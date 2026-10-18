"use server";

import { revalidatePath } from "next/cache";
import * as syllabusService from "@/services/syllabus.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createTopicAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await syllabusService.createTopic(session, input);
    revalidatePath("/syllabus");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateTopicAction(topicId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await syllabusService.updateTopic(session, topicId, input);
    revalidatePath("/syllabus");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateTopicStatusAction(topicId: string, status: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await syllabusService.updateTopicStatus(session, topicId, status);
    revalidatePath("/syllabus");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteTopicAction(topicId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await syllabusService.deleteTopic(session, topicId);
    revalidatePath("/syllabus");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function reorderTopicsAction(classId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await syllabusService.reorderTopics(session, classId, orderedIds);
    revalidatePath("/syllabus");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
