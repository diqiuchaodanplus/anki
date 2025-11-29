// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import { registerPackage } from "@tslib/runtime-require";
import { get, readable, writable, type Writable } from "svelte/store";

interface ThemeInfo {
    isDark: boolean;
}

function getThemeFromRoot(): ThemeInfo {
    return {
        isDark: document.documentElement.classList.contains("night-mode"),
    };
}

let setPageTheme: ((theme: ThemeInfo) => void) | null = null;
/** The current theme that applies to this document/shadow root. When
previewing cards in the card layout screen, this may not match the
theme Anki is using in its UI. */
export const pageTheme = readable(getThemeFromRoot(), (set) => {
    setPageTheme = set;
});
// ensure setPageTheme is set immediately
get(pageTheme);

// Update theme when root element's class changes.
const observer = new MutationObserver((_mutationsList, _observer) => {
    setPageTheme!(getThemeFromRoot());
});
observer.observe(document.documentElement, { attributeFilter: ["class"] });

registerPackage("anki/theme", {
    pageTheme,
});

// Theme mode store: 'system' means follow whatever the application/root is doing;
// 'light' and 'dark' explicitly force the UI. We persist the user's choice
// to localStorage so it survives reloads.
export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "anki_ui_theme_mode_v1";

function applyMode(mode: ThemeMode) {
    if (typeof document === "undefined") {
        // server-side: nothing to do
        return;
    }

    if (mode === "dark") {
        document.documentElement.classList.add("night-mode");
    } else if (mode === "light") {
        document.documentElement.classList.remove("night-mode");
    } else {
        // system: do not force any class; leave it to the app/root to decide.
    }
    // notify listeners that the effective theme may have changed
    if (setPageTheme) {
        setPageTheme(getThemeFromRoot());
    }
}

// Initialize to 'system' on the server. Client-side we'll hydrate from
// localStorage and apply the stored mode.
export const themeMode: Writable<ThemeMode> = writable("system");

if (typeof window !== "undefined") {
    // Read persisted value and apply it.
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === "light" || raw === "dark" || raw === "system") {
            themeMode.set(raw);
        }
    } catch (e) {
        // ignore
    }

    // apply current mode now that document is available
    applyMode(get(themeMode));

    // persist and apply on subsequent changes
    themeMode.subscribe((m) => {
        try {
            localStorage.setItem(STORAGE_KEY, m);
        } catch (e) {
            // ignore
        }
        applyMode(m);
    });
}

registerPackage("anki/theme", {
    themeMode,
});
