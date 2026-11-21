"""
JARVIS screen reader (Phase 3 addition).

Read window titles and (optionally) OCR the screen. Read-only and Security-
gated. Optional deps degrade gracefully:
  - win32gui (pywin32) for window enumeration
  - pytesseract + Pillow for OCR
"""

import os

from core.security import Security, SecurityError, Risk


def list_windows(security: Security) -> str:
    """List open windows (title + handle)."""
    security.authorize("read", Risk.SAFE)
    try:
        import win32gui
    except ImportError:
        raise SecurityError(
            "Window listing needs pywin32. Install: pip install pywin32")

    results = []
    def cb(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            title = win32gui.GetWindowText(hwnd)
            if title:
                results.append(f"{hwnd}: {title}")
    win32gui.EnumWindows(cb, None)
    return "\n".join(results[:60]) if results else "(no visible windows)"


def read_active_window(security: Security) -> str:
    """Return the title of the currently focused window."""
    security.authorize("read", Risk.SAFE)
    try:
        import win32gui
    except ImportError:
        raise SecurityError("Needs pywin32: pip install pywin32")
    hwnd = win32gui.GetForegroundWindow()
    return win32gui.GetWindowText(hwnd) if hwnd else "(no foreground window)"


def ocr_screen(security: Security, out_path: str = "") -> str:
    """
    Capture the screen and run OCR. Returns extracted text.
    Requires pyautogui + pytesseract + Pillow (+ Tesseract installed).
    """
    security.authorize("write", Risk.CONFIRM, "OCR the screen")
    try:
        import pyautogui
        import pytesseract
        from PIL import Image
    except ImportError:
        raise SecurityError(
            "OCR needs: pip install pyautogui pytesseract pillow (and install "
            "the Tesseract engine).")

    img = pyautogui.screenshot()
    if out_path:
        p = os.path.abspath(out_path)
        if security.can_write(p):
            img.save(p)
    text = pytesseract.image_to_string(img)
    return text.strip() or "(no text detected)"


def ocr_image(security: Security, image_path: str) -> str:
    """OCR an existing image file (within allowed roots)."""
    security.authorize("read", Risk.SAFE)
    p = os.path.abspath(image_path)
    if not security.can_read(p):
        raise SecurityError(f"Image outside allowed folders: {p}")
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        raise SecurityError(
            "OCR needs: pip install pytesseract pillow (and Tesseract).")
    with Image.open(p) as im:
        return pytesseract.image_to_string(im).strip() or "(no text detected)"