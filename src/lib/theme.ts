const KEY = "sq-theme";

export function getTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem(KEY);
  return v === "light" ? "light" : "dark";
}

export function applyTheme(theme: "dark" | "light") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(KEY, theme);
}

export function toggleTheme(): "dark" | "light" {
  const next = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
