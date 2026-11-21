"""
JARVIS UI widgets: an animated "arc reactor" (pure Tkinter Canvas) and small
helpers for a polished, animated, HD-looking interface. No image assets needed
- everything is drawn with Canvas primitives and animated via `after()`.
"""

import math
import tkinter as tk

# Central palette (dark, cyan, Jarvis-style).
palette = {
    "bg":        "#05070d",
    "bg2":       "#0a0e17",
    "panel":     "#0f1727",
    "panel2":    "#0b1220",
    "border":    "#1b2a44",
    "accent":    "#22d3ee",
    "accent2":   "#38bdf8",
    "dim":       "#0e7490",
    "text":      "#e6f1ff",
    "muted":     "#7c8aa5",
    "user":      "#7dd3fc",
    "bot":       "#22d3ee",
    "danger":    "#ef4444",
    "danger_hi": "#f87171",
    "ok":        "#34d399",
}


def hoverify(widget, normal, hover, pressed=None):
    """Attach Enter/Leave/Press hover colour changes to a tk widget."""
    pressed = pressed or hover
    try:
        widget.bind("<Enter>", lambda e: widget.configure(background=hover))
        widget.bind("<Leave>", lambda e: widget.configure(background=normal))
        widget.bind("<Button-1>", lambda e: widget.configure(background=pressed))
        widget.bind("<ButtonRelease-1>", lambda e: widget.configure(background=hover))
    except tk.TclError:
        pass


class ArcReactor(tk.Canvas):
    """
    Animated JARVIS arc-reactor drawn on a Canvas.

    - Idle: slow rotation, soft pulse.
    - Active (thinking): fast rotation, brighter, larger pulse.
    """

    def __init__(self, master, size=84, bg=None, accent=None, dim=None):
        super().__init__(width=size, height=size, bg=bg or palette["bg"],
                         highlightthickness=0, bd=0)
        self.size = size
        self.accent = accent or palette["accent"]
        self.dim = dim or palette["dim"]
        self._angle = 0.0
        self._pulse = 0.0
        self._active = False
        self._alive = True
        self._tick()

    def set_active(self, active: bool):
        self._active = bool(active)

    def _tick(self):
        if not self._alive:
            return
        try:
            self.delete("all")
            c = self.size / 2
            speed = 5.0 if self._active else 1.1
            self._angle = (self._angle + speed) % 360
            self._pulse += 0.16 if self._active else 0.07
            breathe = (1.0 + 0.12 * math.sin(self._pulse))

            # outer soft ring
            r_out = c - 3
            self.create_oval(c - r_out, c - r_out, c + r_out, c + r_out,
                             outline=self.dim, width=2)
            # faint inner ring
            r_in = c * 0.62
            self.create_oval(c - r_in, c - r_in, c + r_in, c + r_in,
                             outline=palette["border"], width=1)

            # rotating arcs (two, opposite)
            r_arc = c * 0.80
            box = (c - r_arc, c - r_arc, c + r_arc, c + r_arc)
            ext = 62 if self._active else 46
            self.create_arc(*box, start=self._angle, extent=ext,
                            style="arc", outline=self.accent, width=3)
            self.create_arc(*box, start=self._angle + 180, extent=ext,
                            style="arc", outline=self.accent, width=3)

            # tick marks
            for deg in range(0, 360, 45):
                rad = math.radians(deg)
                r1 = c * 0.90
                r2 = c * 0.99
                x1 = c + r1 * math.cos(rad)
                y1 = c + r1 * math.sin(rad)
                x2 = c + r2 * math.cos(rad)
                y2 = c + r2 * math.sin(rad)
                self.create_line(x1, y1, x2, y2, fill=self.dim, width=2)

            # pulsing core
            core = c * 0.30 * breathe
            self.create_oval(c - core, c - core, c + core, c + core,
                             fill=self.accent, outline="")
            hi = core * 0.5
            self.create_oval(c - hi, c - hi, c + hi, c + hi,
                             fill="#ffffff", outline="")

            self.after(30, self._tick)
        except tk.TclError:
            self._alive = False

    def destroy(self):
        self._alive = False
        super().destroy()