import { db } from "@/database/drizzle";
import { systemConfig } from "@/database/schema";
import { eq } from "drizzle-orm";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

// Configuration keys
export const CONFIG_KEYS = {
  DAILY_FINE_AMOUNT: "daily_fine_amount",
} as const;

// Get configuration value
export async function getConfigValue(
  key: string,
  defaultValue?: string
): Promise<string> {
  try {
    const result = await db
      .select({ value: systemConfig.value })
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);

    return result[0]?.value || defaultValue || "";
  } catch (error) {
    console.error(`Error getting config value for key ${key}:`, error);
    return defaultValue || "";
  }
}

// Set configuration value
export async function setConfigValue(
  key: string,
  value: string,
  description?: string,
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if config exists
    const existing = await db
      .select({ id: systemConfig.id })
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);

    if (existing.length > 0) {
      // Update existing config
      await db
        .update(systemConfig)
        .set({
          value,
          description,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(systemConfig.key, key));
    } else {
      // Insert new config
      await db.insert(systemConfig).values({
        key,
        value,
        description,
        updatedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    revalidateMutationPaths("fine.write");
    return { success: true };
  } catch (error) {
    console.error(`Error setting config value for key ${key}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get daily fine amount with default
export async function getDailyFineAmount(): Promise<number> {
  const value = await getConfigValue(CONFIG_KEYS.DAILY_FINE_AMOUNT, "1.00");
  return parseFloat(value) || 1.0;
}

// Set daily fine amount
export async function setDailyFineAmount(
  amount: number,
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const previous = await getDailyFineAmount();
  const result = await setConfigValue(
    CONFIG_KEYS.DAILY_FINE_AMOUNT,
    amount.toString(),
    "Daily fine amount for overdue books",
    updatedBy
  );

  if (result.success && amount !== previous) {
    const { appendFineRateHistory } = await import("@/lib/fines/rateHistory");
    const { notifyOpenOverdueUsersOfRateChange } = await import(
      "@/lib/admin/actions/fines"
    );
    await appendFineRateHistory(amount, new Date(), updatedBy ?? null);
    await notifyOpenOverdueUsersOfRateChange(amount);
  }

  return result;
}

// Initialize default configurations
export async function initializeDefaultConfigs(): Promise<void> {
  try {
    // Check if daily fine amount exists
    const existingFine = await db
      .select({ id: systemConfig.id })
      .from(systemConfig)
      .where(eq(systemConfig.key, CONFIG_KEYS.DAILY_FINE_AMOUNT))
      .limit(1);

    if (existingFine.length === 0) {
      // Insert default daily fine amount
      await db.insert(systemConfig).values({
        key: CONFIG_KEYS.DAILY_FINE_AMOUNT,
        value: "1.00",
        description: "Daily fine amount for overdue books",
        updatedBy: "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error initializing default configs:", error);
  }
}
