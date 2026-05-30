/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/tw-elements/dist/js/**/*.js",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        "primary-hover": "var(--primary-hover-color)",
        "primary-active": "var(--primary-active-color)",
        "primary-disabled": "var(--primary-disabled-color)",
        "primary-selected": "var(--primary-selected-color)",
        "primary-selected-hover": "var(--primary-selected-hover-color)",
        "primary-selected-active": "var(--primary-selected-active-color)",
        "primary-selected-disabled": "var(--primary-selected-disabled-color)",
        "primary-disabled-selected": "var(--primary-disabled-selected-color)",
        "primary-disabled-selected-hover":
          "var(--primary-disabled-selected-hover-color)",
        "primary-disabled-selected-active":
          "var(--primary-disabled-selected-active-color)",
        "primary-disabled-selected-disabled":
          "var(--primary-disabled-selected-disabled-color)",
        secondary: "var(--secondary-color)",
        "secondary-hover": "var(--secondary-hover-color)",
        "secondary-active": "var(--secondary-active-color)",
        "secondary-disabled": "var(--secondary-disabled-color)",
        "secondary-selected": "var(--secondary-selected-color)",
        "secondary-selected-hover": "var(--secondary-selected-hover-color)",
        "secondary-selected-active": "var(--secondary-selected-active-color)",
        "secondary-selected-disabled":
          "var(--secondary-selected-disabled-color)",
        "secondary-disabled-selected":
          "var(--secondary-disabled-selected-color)",
        "secondary-disabled-selected-hover":
          "var(--secondary-disabled-selected-hover-color)",
        "secondary-disabled-selected-active":
          "var(--secondary-disabled-selected-active-color)",
        "secondary-disabled-selected-disabled":
          "var(--secondary-disabled-selected-disabled-color)",
        accent: "var(--accent-color)",
        "accent-hover": "var(--accent-hover-color)",
        "accent-active": "var(--accent-active-color)",
        "accent-disabled": "var(--accent-disabled-color)",
        "accent-selected": "var(--accent-selected-color)",
        "accent-selected-hover": "var(--accent-selected-hover-color)",
        "accent-selected-active": "var(--accent-selected-active-color)",
        "accent-selected-disabled": "var(--accent-selected-disabled-color)",
        "accent-disabled-selected": "var(--accent-disabled-selected-color)",
        "accent-disabled-selected-hover":
          "var(--accent-disabled-selected-hover-color)",
        "accent-disabled-selected-active":
          "var(--accent-disabled-selected-active-color)",
        "accent-disabled-selected-disabled":
          "var(--accent-disabled-selected-disabled-color)",
        background: "var(--background-color)",
        "background-hover": "var(--background-hover-color)",
        "background-active": "var(--background-active-color)",
        "background-disabled": "var(--background-disabled-color)",
        "background-selected": "var(--background-selected-color)",
        "background-selected-hover": "var(--background-selected-hover-color)",
        "background-selected-active": "var(--background-selected-active-color)",
        "background-selected-disabled":
          "var(--background-selected-disabled-color)",
        "background-disabled-selected":
          "var(--background-disabled-selected-color)",
        "background-disabled-selected-hover":
          "var(--background-disabled-selected-hover-color)",
        "background-disabled-selected-active":
          "var(--background-disabled-selected-active-color)",
        "background-disabled-selected-disabled":
          "var(--background-disabled-selected-disabled-color)",
        border: "var(--border-color)",
        "border-hover": "var(--border-hover-color)",
        "border-active": "var(--border-active-color)",
        "border-disabled": "var(--border-disabled-color)",
        "border-selected": "var(--border-selected-color)",
        "border-selected-hover": "var(--border-selected-hover-color)",
        "border-selected-active": "var(--border-selected-active-color)",
        "border-selected-disabled": "var(--border-selected-disabled-color)",
        "border-disabled-selected": "var(--border-disabled-selected-color)",
        "border-disabled-selected-hover":
          "var(--border-disabled-selected-hover-color)",
        "border-disabled-selected-active":
          "var(--border-disabled-selected-active-color)",
        "border-disabled-selected-disabled":
          "var(--border-disabled-selected-disabled-color)",
        text: "var(--text-color)",
        "text-hover": "var(--text-hover-color)",
        "text-active": "var(--text-active-color)",
        "text-disabled": "var(--text-disabled-color)",
        "text-selected": "var(--text-selected-color)",
        "text-selected-hover": "var(--text-selected-hover-color)",
        "text-selected-active": "var(--text-selected-active-color)",
        "text-selected-disabled": "var(--text-selected-disabled-color)",
        "text-disabled-selected": "var(--text-disabled-selected-color)",
        "text-disabled-selected-hover":
          "var(--text-disabled-selected-hover-color)",
        "text-disabled-selected-active":
          "var(--text-disabled-selected-active-color)",
        "text-disabled-selected-disabled":
          "var(--text-disabled-selected-disabled-color)",
        icon: "var(--icon-color)",
        "icon-hover": "var(--icon-hover-color)",
        "icon-active": "var(--icon-active-color)",
        "icon-disabled": "var(--icon-disabled-color)",
        "icon-selected": "var(--icon-selected-color)",
        "icon-selected-hover": "var(--icon-selected-hover-color)",
        "icon-selected-active": "var(--icon-selected-active-color)",
        "icon-selected-disabled": "var(--icon-selected-disabled-color)",
        "icon-disabled-selected": "var(--icon-disabled-selected-color)",
        "icon-disabled-selected-hover":
          "var(--icon-disabled-selected-hover-color)",
        "icon-disabled-selected-active":
          "var(--icon-disabled-selected-active-color)",
        "icon-disabled-selected-disabled":
          "var(--icon-disabled-selected-disabled-color)",

        input: "var(--input-color)",
        "input-hover": "var(--input-hover-color)",
        "input-active": "var(--input-active-color)",
        "input-disabled": "var(--input-disabled-color)",
        "input-selected": "var(--input-selected-color)",
        "input-selected-hover": "var(--input-selected-hover-color)",
        "input-selected-active": "var(--input-selected-active-color)",
        "input-selected-disabled": "var(--input-selected-disabled-color)",
        "input-disabled-selected": "var(--input-disabled-selected-color)",
        "input-disabled-selected-hover":
          "var(--input-disabled-selected-hover-color)",
        "input-disabled-selected-active":
          "var(--input-disabled-selected-active-color)",
        "input-disabled-selected-disabled":
          "var(--input-disabled-selected-disabled-color)",

        "side-bar-nav": "var(--side-bar-nav-color)",
        "side-bar-nav-hover": "var(--side-bar-nav-hover-color)",
        "side-bar-nav-active": "var(--side-bar-nav-active-color)",
        "side-bar-nav-disabled": "var(--side-bar-nav-disabled-color)",
        "side-bar-nav-selected": "var(--side-bar-nav-selected-color)",
        "side-bar-nav-selected-hover":
          "var(--side-bar-nav-selected-hover-color)",
        "side-bar-nav-selected-active":
          "var(--side-bar-nav-selected-active-color)",
        "side-bar-nav-selected-disabled":
          "var(--side-bar-nav-selected-disabled-color)",
        "side-bar-nav-disabled-selected":
          "var(--side-bar-nav-disabled-selected-color)",
        "side-bar-nav-disabled-selected-hover":
          "var(--side-bar-nav-disabled-selected-hover-color)",
        "side-bar-nav-disabled-selected-active":
          "var(--side-bar-nav-disabled-selected-active-color)",
        "side-bar-nav-disabled-selected-disabled":
          "var(--side-bar-nav-disabled-selected-disabled-color)",

        table: "var(--table-color)",
        "table-header": "var(--table-header-color)",
        "table-header-hover": "var(--table-header-hover-color)",
        "table-header-active": "var(--table-header-active-color)",
        "table-header-selected": "var(--table-header-selected-color)",
        "table-header-column": "var(--table-header-column-color)",
        "table-header-column-hover": "var(--table-header-column-hover-color)",
        "table-header-column-active": "var(--table-header-column-active-color)",
        "table-header-column-selected":
          "var(--table-header-column-selected-color)",
        "table-row": "var(--table-row-color)",
        "table-row-hover": "var(--table-row-hover-color)",
        "table-row-active": "var(--table-row-active-color)",
        "table-row-selected": "var(--table-row-selected-color)",
        "table-row-column": "var(--table-row-column-color)",
        "table-row-column-hover": "var(--table-row-column-hover-color)",
        "table-row-column-active": "var(--table-row-column-active-color)",
        "table-row-column-selected": "var(--table-row-column-selected-color)",
      },

      fontSize: {
        base: "var(--font-size)",
      },
      lineHeight: {
        base: "var(--line-height)",
      },

      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
      },
      animation: {
        wiggle: "wiggle 200ms ease-in-out",
      },
    },
  },
  plugins: [require("tw-elements/dist/plugin"), require("@tailwindcss/forms")],
};
