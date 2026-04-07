import { Facebook, Instagram, Linkedin, Globe, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

const PLATFORMS = [
  { key: "facebookPageUrl", label: "Facebook", icon: Facebook, composeUrl: "https://www.facebook.com/" },
  { key: "instagramUrl", label: "Instagram", icon: Instagram, composeUrl: "https://www.instagram.com/" },
  { key: "twitterUrl", label: "X (Twitter)", icon: Globe, composeUrl: "https://x.com/compose/post" },
  { key: "linkedinUrl", label: "LinkedIn", icon: Linkedin, composeUrl: "https://www.linkedin.com/feed/" },
] as const;

export async function SocialMediaLinks() {
  const settings = await db.businessSettings.findFirst({
    select: {
      facebookPageUrl: true,
      instagramUrl: true,
      twitterUrl: true,
      linkedinUrl: true,
    },
  });

  if (!settings) return null;

  const activeLinks = PLATFORMS.filter(
    (p) => settings[p.key as keyof typeof settings]
  );

  if (activeLinks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Social Media</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {activeLinks.map((platform) => {
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
  );
}
