"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/session";
import type { ActionResult } from "@/types";

export async function updateSocialMediaSettings(input: {
  facebookPageUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
}): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only workspace owners can update social media settings." };
  }

  try {
    const settings = await db.businessSettings.findFirst();
    if (settings) {
      await db.businessSettings.update({
        where: { id: settings.id },
        data: {
          facebookPageUrl: input.facebookPageUrl || null,
          instagramUrl: input.instagramUrl || null,
          twitterUrl: input.twitterUrl || null,
          linkedinUrl: input.linkedinUrl || null,
        },
      });
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateSocialMediaSettings]", error);
    return { success: false, error: "Failed to save social media settings." };
  }
}

export async function getSocialMediaSettings(): Promise<{
  facebookPageUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
} | null> {
  const settings = await db.businessSettings.findFirst({
    select: {
      facebookPageUrl: true,
      instagramUrl: true,
      twitterUrl: true,
      linkedinUrl: true,
    },
  });
  return settings;
}
