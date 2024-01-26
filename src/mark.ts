const __marks: Record<string, DOMHighResTimeStamp> = {};
export function mark(label: string, debugLabel: string): void {
    const now = performance.now();
    if (__marks[label] != null) {
        const dur = now - __marks[label];
        if (dur > 10) {
            console.debug(`mark ${label} ${debugLabel} took ${dur}ms`);
        }
    }
    __marks[label] = now;
}
