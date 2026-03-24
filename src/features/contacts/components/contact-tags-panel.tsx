/**
 * src/features/contacts/components/contact-tags-panel.tsx
 *
 * ContactTagsPanel — tag display and management within the contact overview.
 *
 * Shows existing tags as colored pill badges with a remove button.
 * Provides a small input to add new tags (by name). If the tag already
 * exists in the workspace it is reused; otherwise a new tag is created.
 *
 * This is a client component because it manages local input state and
 * calls server actions.
 *
 * Props:
 *   contactId   — The contact to add/remove tags on.
 *   currentTags — Tags currently attached to this contact.
 *   allTags     — All workspace tags (for autocomplete suggestions).
 */

"use client";

import { useTransition, useState, useRef } from "react";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { addTagToContact, removeTagFromContact } from "@/server/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tag {
  id: string;
  name: string;
}

interface ContactTagsPanelProps {
  contactId: string;
  currentTags: Tag[];
  allTags: Tag[];
}

// ---------------------------------------------------------------------------
// ContactTagsPanel
// ---------------------------------------------------------------------------

export function ContactTagsPanel({ contactId, currentTags, allTags }: ContactTagsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tags from allTags that aren't already on this contact, filtered by input
  const currentTagIds = new Set(currentTags.map((t) => t.id));
  const suggestions = allTags.filter(
    (t) => !currentTagIds.has(t.id) && t.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  function handleRemove(tagId: string, tagName: string) {
    startTransition(async () => {
      const result = await removeTagFromContact(contactId, tagId);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(`Removed tag "${tagName}".`);
      }
    });
  }

  function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await addTagToContact(contactId, trimmed);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(`Added tag "${trimmed}".`);
        setInputValue("");
        setShowInput(false);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(inputValue);
    } else if (e.key === "Escape") {
      setInputValue("");
      setShowInput(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Existing tags */}
      {currentTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {currentTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemove(tag.id, tag.name)}
                disabled={isPending}
                aria-label={`Remove tag ${tag.name}`}
                className="ml-0.5 rounded-full hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No tags yet.</p>
      )}

      {/* Add tag */}
      {showInput ? (
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder="Type a tag name…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Short delay so click on suggestion fires before blur
              setTimeout(() => {
                if (!inputValue.trim()) {
                  setShowInput(false);
                }
              }, 150);
            }}
            className="h-7 text-xs pr-7"
            autoFocus
            disabled={isPending}
          />
          {inputValue.trim() && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
              onClick={() => handleAdd(inputValue)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
              aria-label="Add tag"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && inputValue.length > 0 && (
            <ul className="absolute top-full mt-1 left-0 z-10 w-full rounded-md border bg-popover p-1 shadow-md text-xs max-h-36 overflow-y-auto">
              {suggestions.slice(0, 8).map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleAdd(tag.name)}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded-sm hover:bg-accent hover:text-accent-foreground",
                      isPending && "opacity-50 pointer-events-none"
                    )}
                  >
                    {tag.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setShowInput(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          disabled={isPending}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add tag
        </Button>
      )}
    </div>
  );
}
