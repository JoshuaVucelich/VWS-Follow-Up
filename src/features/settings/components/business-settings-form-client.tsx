/**
 * src/features/settings/components/business-settings-form-client.tsx
 *
 * Client form for business settings (name + timezone).
 */

"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { businessSettingsSchema, type BusinessSettingsInput } from "@/lib/validations/settings";
import { updateBusinessSettings } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Timezones
// ---------------------------------------------------------------------------

const TIMEZONES = [
  { group: "US & Canada", zones: [
    { label: "Eastern Time (ET)", value: "America/New_York" },
    { label: "Central Time (CT)", value: "America/Chicago" },
    { label: "Mountain Time (MT)", value: "America/Denver" },
    { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
    { label: "Alaska Time", value: "America/Anchorage" },
    { label: "Hawaii Time", value: "Pacific/Honolulu" },
    { label: "Atlantic Time", value: "America/Halifax" },
  ]},
  { group: "Europe", zones: [
    { label: "UTC", value: "UTC" },
    { label: "London (GMT/BST)", value: "Europe/London" },
    { label: "Paris / Berlin (CET)", value: "Europe/Paris" },
  ]},
  { group: "Other", zones: [
    { label: "Sydney (AEST)", value: "Australia/Sydney" },
    { label: "Auckland (NZST)", value: "Pacific/Auckland" },
  ]},
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BusinessSettingsFormClientProps {
  settings: { businessName: string; timezone: string } | null;
  isOwner: boolean;
}

export function BusinessSettingsFormClient({ settings, isOwner }: BusinessSettingsFormClientProps) {
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BusinessSettingsInput>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      businessName: settings?.businessName ?? "",
      timezone: settings?.timezone ?? "America/New_York",
    },
  });

  function onSubmit(data: BusinessSettingsInput) {
    startTransition(async () => {
      const result = await updateBusinessSettings(data);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Business settings saved.");
      }
    });
  }

  if (!isOwner) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Only workspace owners can edit business settings.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      {/* Business name */}
      <div className="space-y-1.5">
        <Label htmlFor="biz-name">Business name</Label>
        <Input id="biz-name" placeholder="My Business" {...register("businessName")} />
        {errors.businessName && (
          <p className="text-xs text-destructive">{errors.businessName.message}</p>
        )}
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <Label htmlFor="biz-timezone">Timezone</Label>
        <Select
          value={watch("timezone")}
          onValueChange={(v) => setValue("timezone", v, { shouldValidate: true })}
        >
          <SelectTrigger id="biz-timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel>{group.group}</SelectLabel>
                {group.zones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save business settings"}
      </Button>
    </form>
  );
}
