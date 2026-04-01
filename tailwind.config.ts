import type { Config } from "tailwindcss";

import { designColors } from "./tokens/colors";
import { designRadius } from "./tokens/radius";
import { designShadows } from "./tokens/shadows";
import { designExtensionPopup } from "./tokens/sizing";
import { designFontSize, designFonts } from "./tokens/typography";

export default {
  theme: {
    extend: {
      borderRadius: designRadius,
      boxShadow: designShadows,
      colors: designColors,
      height: {
        "extension-popup": designExtensionPopup.height,
      },
      width: {
        "extension-popup": designExtensionPopup.width,
      },
      fontFamily: {
        sans: [
          designFonts.sans,
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: designFontSize,
    },
  },
} satisfies Config;
