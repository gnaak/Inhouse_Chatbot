/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        main: {
          DEFAULT: "#1F1F1F",
          hover: "#2A2A2A",
          active: "#161616",
        },
        sub1: {
          DEFAULT: "#3A3A3A",
          hover: "#4A4A4A",
          active: "#2E2E2E",
        },
        sub2: {
          DEFAULT: "#F2F2F2",
          hover: "#EDEDED",
          active: "#DCDCDC",
        },
        clientMain: "rgb(var(--c-clientMain) / <alpha-value>)",
        adminMain: "#FAFAFA",
        errorColor: "#CE3535",
        adminBlue: "#276EEB",
        textMain: "rgb(var(--c-textMain) / <alpha-value>)",
        iconMain: "rgb(var(--c-iconMain) / <alpha-value>)",
        iconCircle: "rgb(var(--c-iconCircle) / <alpha-value>)",
        inputHeader: "rgb(var(--c-inputHeader) / <alpha-value>)",
      },
      keyframes: {
        "needle-fade": {
          "0%, 39%, 100%": { opacity: "0.25" },
          "40%": { opacity: "1" },
        },
      },
      animation: {
        "needle-fade": "needle-fade 1.2s linear infinite",
      },
      "animation-delay": {
        1000: "1s",
        2000: "2s",
        3000: "3s",
      },
    },
  },
  plugins: [],
};
