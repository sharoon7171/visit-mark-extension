import type { Config } from "tailwindcss";

export default {
  content: ["./public/popup.html", "./public/options.html", "./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [],
} satisfies Config;
