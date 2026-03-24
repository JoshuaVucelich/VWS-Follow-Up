/**
 * tailwind.config.ts
 *
 * Tailwind CSS configuration for VWS FollowUp.
 *
 * We extend the default theme with a custom color palette that matches
 * our design system. CSS variables are used for theming so that future
 * light/dark mode support is straightforward to implement.
 *
 * Color names follow shadcn/ui conventions so that components work
 * out-of-the-box without extra configuration.
 *
 * @see https://tailwindcss.com/docs/configuration
 * @see https://ui.shadcn.com/docs/theming
 */

import type { Config } from "tailwindcss";

const config: Config = {
  // Enable dark mode via the "class" strategy so we can toggle it
  // by adding/removing a "dark" class on the <html> element.
  darkMode: ["class"],

  // Only process files that actually use Tailwind classes to keep
  // the generated CSS bundle as small as possible.
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],

  theme: {
    // Keep the container centered and with sensible padding by default.
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },

    extend: {
      /**
       * Color palette.
       *
       * These CSS variable references allow runtime theming via :root rules.
       * The actual color values are defined in src/app/globals.css.
       *
       * Do not hardcode hex values here — always reference CSS variables
       * so that themes can be swapped without touching this config.
       */
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // App-specific status colors for pipeline stages, task priorities, etc.
        // These are intentionally separate from the base palette.
        status: {
          new: "hsl(var(--status-new))",
          contacted: "hsl(var(--status-contacted))",
          quoted: "hsl(var(--status-quoted))",
          booked: "hsl(var(--status-booked))",
          completed: "hsl(var(--status-completed))",
          lost: "hsl(var(--status-lost))",
        },
      },

      // Rounded corners used across all interactive components.
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // Custom keyframes for animations (used by shadcn/ui components).
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
      },
    },
  },

  plugins: [require("tailwindcss-animate")],
};

export default config;
