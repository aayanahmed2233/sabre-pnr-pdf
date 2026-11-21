"""
JARVIS keyboard & mouse control (Phase 3 addition).

All input control is Security-gated (confirmation). If pyautogui is missing,
calls fail gracefully with a clear install message.

Safety: these are high-risk; the security layer requires confirmation and they
are blocked while an Emergency Stop is engaged.
"""

from core.security import Security, SecurityError, Risk


def _require_pyautogui():
    try:
        import pyautogui  # noqa: F401
        return pyautogui
    except ImportError:
        raise SecurityError(
            "Keyboard/mouse control needs pyautogui. Install: pip install "
            "pyautogui (and pygetwindow on Windows).")


def move_mouse(security: Security, x: int, y: int) -> str:
    security.authorize("input_control", Risk.CONFIRM, f"Move mouse to ({x},{y})")
    pg = _require_pyautogui()
    pg.moveTo(int(x), int(y), duration=0.2)
    return f"Moved mouse to ({x}, {y})"


def click(security: Security, x=None, y=None, button: str = "left") -> str:
    security.authorize("input_control", Risk.CONFIRM,
                       f"Click {button} at ({x},{y})")
    pg = _require_pyautogui()
    if x is not None and y is not None:
        pg.click(int(x), int(y), button=button)
        return f"Clicked {button} at ({x},{y})"
    pg.click(button=button)
    return f"Clicked {button} at current position"


def type_text(security: Security, text: str, interval: float = 0.02) -> str:
    security.authorize("input_control", Risk.CONFIRM, "Type text via keyboard")
    pg = _require_pyautogui()
    pg.write(text, interval=interval)
    return f"Typed {len(text)} characters"


def press_key(security: Security, key: str) -> str:
    security.authorize("input_control", Risk.CONFIRM, f"Press key {key}")
    pg = _require_pyautogui()
    pg.press(key)
    return f"Pressed {key}"


def hotkey(security: Security, *keys) -> str:
    security.authorize("input_control", Risk.CONFIRM, f"Hotkey {'+'.join(keys)}")
    pg = _require_pyautogui()
    pg.hotkey(*keys)
    return f"Pressed {'+'.join(keys)}"


def screenshot(security: Security, path: str) -> str:
    """Save a screenshot into the allowed workspace/downloads."""
    security.authorize("write", Risk.CONFIRM, f"Screenshot -> {path}")
    pg = _require_pyautogui()
    import os
    p = os.path.abspath(path)
    if not security.can_write(p):
        raise SecurityError(f"Screenshot path not allowed: {p}")
    img = pg.screenshot()
    img.save(p)
    return f"Screenshot saved to {p}"