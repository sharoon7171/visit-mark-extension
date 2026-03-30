import type { Config } from "tailwindcss";

import { designColors } from "./tokens/colors";
import { designFonts } from "./tokens/typography";
import { designRadius } from "./tokens/radius";
import { designShadows } from "./tokens/shadows";

export default {
  theme: {
    extend: {
      colors: designColors,
      borderRadius: designRadius,
      boxShadow: designShadows,
      fontFamily: {
        sans: [designFonts.sans],
      },
    },
  },
} satisfies Config;
