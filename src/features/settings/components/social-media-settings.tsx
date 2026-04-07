"use client";

import { useState, useTransition } from "react";
import { Facebook, Instagram, Linkedin, Globe, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateSocialMediaSettings } from "@/server/actions/social-media";

interface SocialMediaSettingsProps {
  initialValues: {
    facebookPageUrl: string | null;
    instagramUrl: string | null;
    twitterUrl: string | null;
    linkedinUrl: string | null;
  } | null;
}

const SOCIAL_PLATFORMS = [
  {
    key: "facebookPageUrl" as const,
    label: "Facebook",
    icon: Facebook,
    placeholder: "https://facebook.com/yourpage",
    composeUrl: "https://www.facebook.com/",
  },
  {
    key: "instagramUrl" as const,
    label: "Instagram",
    icon: Instagram,
    placeholder: "https://instagram.com/yourhandle",
    composeUrl: "https://www.instagram.com/",
  },
  {
    key: "twitterUrl" as const,
    label: "X (Twitter)",
    icon: Globe,
    placeholder: "https://x.com/yourhandle",
    composeUrl: "https://x.com/compose/post",
  },
  {
    key: "linkedinUrl" as const,
    label: "LinkedIn",
    icon: Linkedin,
    placeholder: "https://linkedin.com/company/yourcompany",
    composeUrl: "https://www.linkedin.com/feed/",
  },
];

export function SocialMediaSettings({ initialValues }: SocialMediaSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({
    facebookPageUrl: initialValues?.facebookPageUrl ?? "",
    instagramUrl: initialValues?.instagramUrl ?? "",
    twitterUrl: initialValues?.twitterUrl ?? "",
    linkedinUrl: initialValues?.linkedinUrl ?? "",
  });

  function handleSave() {
    startTransition(async () => {
      const result = await updateSocialMediaSettings(values);
      if (result.success) {
        toast.success("Social media settings saved.");
      } else {
        toast.error(result.error);
      }
    });
  }

  const hasAnyLinks = Object.values(values).some((v) => v.trim());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Social Profiles</CardTitle>
          <CardDescription>
            Add your business social media links. These will appear on the dashboard for quick access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SOCIAL_PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            return (
              <div key={platform.key} className="space-y-1.5">
                <Label htmlFor={platform.key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {platform.label}
                </Label>
                <Input
                  id={platform.key}
                  value={values[platform.key]}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [platform.key]: e.target.value }))
                  }
                  placeholder={platform.placeholder}
                />
              </div>
            );
          })}
          <Button onClick={handleSave} disabled={isPending} className="mt-2">
            {isPending ? "Saving..." : "Save Social Media Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Quick-launch section */}
      {hasAnyLinks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Launch</CardTitle>
            <CardDescription>
              Open your social media platforms to create posts or check activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const url = values[platform.key]?.trim();
                if (!url) return null;
                const Icon = platform.icon;
                return (
                  <a
                    key={platform.key}
                    href={platform.composeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {platform.label}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
