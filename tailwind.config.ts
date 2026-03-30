import type { Config } from "tailwindcss";

import { designColors } from "./tokens/colors";
import { designRadius } from "./tokens/radius";
import { designShadows } from "./tokens/shadows";
import { designFonts } from "./tokens/typography";

export default {
  theme: {
    extend: {
      borderRadius: designRadius,
      boxShadow: designShadows,
      colors: designColors,
      fontFamily: {
        sans: [designFonts.sans],
      },
    },
  },
} satisfies Config;
