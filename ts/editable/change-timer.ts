// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

export class ChangeTimer {
    private value: number | null = null;
    private action: (() => void) | null = null;
    // track when the timer was scheduled and for how long so we can report remaining time
    private startTime: number | null = null;
    private delayMs: number | null = null;

    constructor() {
        this.fireImmediately = this.fireImmediately.bind(this);
    }

    schedule(action: () => void, delay: number): void {
        this.clear();
        this.action = action;
        this.startTime = Date.now();
        this.delayMs = delay;
        this.value = setTimeout(this.fireImmediately, delay) as any;
    }

    clear(): void {
        if (this.value) {
            clearTimeout(this.value);
            this.value = null;
            this.startTime = null;
            this.delayMs = null;
        }
    }

    fireImmediately(): void {
        if (this.action) {
            this.action();
            this.action = null;
        }

        this.clear();
    }

    // Return remaining milliseconds, or null if nothing is scheduled
    getRemaining(): number | null {
        if (this.value && this.startTime !== null && this.delayMs !== null) {
            const elapsed = Date.now() - this.startTime;
            const rem = Math.max(0, this.delayMs - elapsed);
            return rem;
        }
        return null;
    }

    // Return whether a timer is scheduled
    isScheduled(): boolean {
        return this.value !== null;
    }
}
