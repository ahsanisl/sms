import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's built-in font sizes. Without this, it
 * reads our type-scale classes (text-label-md, text-body-md, ... — see the
 * --text-* tokens in globals.css) as text *colours*, so a class list with both
 * a size and a colour (e.g. a button's "text-label-md text-white") silently
 * lost the colour.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display-lg", "display-sm", "headline-lg", "headline-md", "headline-sm", "title-lg", "title-md", "body-lg", "body-md", "label-md", "label-sm"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
