"use server";

import { revalidatePath } from "next/cache";
import * as curriculumService from "@/services/curriculum.service";
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
    await curriculumService.createTopic(session, input);
    revalidatePath("/curriculum");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateTopicAction(topicId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await curriculumService.updateTopic(session, topicId, input);
    revalidatePath("/curriculum");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateTopicStatusAction(topicId: string, status: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await curriculumService.updateTopicStatus(session, topicId, status);
    revalidatePath("/curriculum");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteTopicAction(topicId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await curriculumService.deleteTopic(session, topicId);
    revalidatePath("/curriculum");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function reorderTopicsAction(classId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await curriculumService.reorderTopics(session, classId, orderedIds);
    revalidatePath("/curriculum");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
