"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Éviter l'hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-9 h-9 px-0">
        <div className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const currentIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="glass-button w-9 h-9 px-0 relative overflow-hidden group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={resolvedTheme}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-4 w-4 text-green-400 dark:text-green-300" />
              ) : (
                <Sun className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
              )}
            </motion.div>
          </AnimatePresence>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="glass-modal border-white/20 dark:border-gray-700/20 min-w-[140px]"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors focus:bg-white/60 dark:focus:bg-gray-600/60"
        >
          <Sun className="mr-2 h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          <span className="text-gray-900 dark:text-gray-100">Clair</span>
          {theme === "light" && (
            <motion.div
              layoutId="theme-indicator"
              className="ml-auto w-2 h-2 bg-green-500 rounded-full"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors focus:bg-white/60 dark:focus:bg-gray-600/60"
        >
          <Moon className="mr-2 h-4 w-4 text-green-400 dark:text-green-300" />
          <span className="text-gray-900 dark:text-gray-100">Sombre</span>
          {theme === "dark" && (
            <motion.div
              layoutId="theme-indicator"
              className="ml-auto w-2 h-2 bg-green-500 rounded-full"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors focus:bg-white/60 dark:focus:bg-gray-600/60"
        >
          <Monitor className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-300" />
          <span className="text-gray-900 dark:text-gray-100">Système</span>
          {theme === "system" && (
            <motion.div
              layoutId="theme-indicator"
              className="ml-auto w-2 h-2 bg-green-500 rounded-full"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Version simple pour les cas où on veut juste un toggle simple
export function SimpleThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-9 h-9 px-0">
        <div className="h-4 w-4" />
      </Button>
    );
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="glass-button w-9 h-9 px-0 relative overflow-hidden group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={resolvedTheme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          ) : (
            <Moon className="h-4 w-4 text-green-400 dark:text-green-300" />
          )}
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">
        {resolvedTheme === "dark" ? "Passer au mode clair" : "Passer au mode sombre"}
      </span>
    </Button>
  );
}
