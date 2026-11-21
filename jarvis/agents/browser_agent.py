"""
JARVIS browser agent (Playwright).

Two modes:
  - "dedicated" (safe, default): a separate Chromium + JARVIS profile. It does
    NOT see your real Chrome's logins, cookies, or passwords.
  - "real" (risky, opt-in): launches YOUR real Chrome profile (logins/cookies)
    via Playwright's persistent context. Chrome must be fully closed first.
    JARVIS never reads/exports passwords or cookies; it just drives the browser.

Playwright is optional: if not installed, methods raise a clear message.
"""

import os
from dataclasses import dataclass
from typing import Optional

from core.security import Security, SecurityError, Risk


def default_chrome_user_data() -> str:
    """Best-guess path to Chrome's 'User Data' folder on Windows."""
    local = os.environ.get("LOCALAPPDATA", "")
    return os.path.join(local, "Google", "Chrome", "User Data")


def chrome_is_running() -> bool:
    """True if chrome.exe appears to be running (Windows)."""
    try:
        import subprocess
        out = subprocess.run(["tasklist", "/fi", "imagename eq chrome.exe", "/nh"],
                             capture_output=True, text=True, timeout=10).stdout
        return "chrome.exe" in out.lower()
    except Exception:  # noqa: BLE001
        return False


@dataclass
class BrowserAgent:
    security: Security
    profile_dir: str
    download_dir: str
    headless: bool = False
    mode: str = "dedicated"           # "dedicated" | "real"
    real_profile_dir: str = ""        # Chrome "User Data" (real mode)
    profile_directory: str = "Default"
    _pw = None
    _browser = None
    _context = None

    # ---- lifecycle ----
    def _ensure_started(self):
        if self._context is not None:
            return
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as e:
            raise SecurityError(
                "Playwright is not installed. Install it with:\n"
                "  pip install playwright\n  playwright install chromium") from e

        os.makedirs(self.download_dir, exist_ok=True)
        self.security.add_write_root(self.download_dir)
        self._pw = sync_playwright().start()

        if self.mode == "real":
            udd = self.real_profile_dir or default_chrome_user_data()
            if not os.path.isdir(udd):
                raise SecurityError(
                    f"Chrome 'User Data' folder not found: {udd}\n"
                    "Set the correct path in Settings.")
            if chrome_is_running():
                raise SecurityError(
                    "Chrome is currently running. Close ALL Chrome windows, then "
                    "try again (the profile is locked while Chrome is open).")
            # High-risk: launching the user's real profile.
            self.security.authorize(
                "launch", Risk.CONFIRM,
                "Launch YOUR real Chrome profile (logins/cookies)?")
            self._context = self._pw.chromium.launch_persistent_context(
                udd, headless=self.headless, accept_downloads=True,
                args=[f"--profile-directory={self.profile_directory}"])
        else:
            os.makedirs(self.profile_dir, exist_ok=True)
            self.security.add_read_root(self.profile_dir)
            self._context = self._pw.chromium.launch_persistent_context(
                self.profile_dir, headless=self.headless, accept_downloads=True)

        self._browser = self._context.browser

    def connect_cdp(self, endpoint: str = "http://localhost:9222"):
        """Attach to an already-running Chrome started with remote debugging."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as e:
            raise SecurityError("Playwright not installed: pip install playwright") from e
        self.security.authorize("launch", Risk.CONFIRM,
                                f"Attach to Chrome at {endpoint}")
        if self._pw is None:
            self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.connect_over_cdp(endpoint)
        self._context = self._browser.contexts[0] if self._browser.contexts \
            else self._browser.new_context()
        return f"Attached to Chrome at {endpoint}"

    # ---- navigation ----
    def goto(self, url: str) -> str:
        self.security.authorize("launch", Risk.CONFIRM, f"Open URL: {url}")
        self._ensure_started()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        page = self._context.new_page()
        page.goto(url, timeout=30000)
        title = page.title()
        page.close()
        return f"Opened {url} -> '{title}'"

    # ---- research ----
    def search(self, query: str) -> str:
        self.security.authorize("launch", Risk.CONFIRM, f"Search: {query}")
        self._ensure_started()
        page = self._context.new_page()
        page.goto("https://www.google.com/search?q=" +
                  query.replace(" ", "+"), timeout=30000)
        results = []
        for el in page.query_selector_all("h3"):
            try:
                title = el.inner_text()
                a = el.query_selector("xpath=ancestor::a")
                href = a.get_attribute("href") if a else ""
                if title:
                    results.append(f"- {title} ({href})")
            except Exception:  # noqa: BLE001
                continue
            if len(results) >= 8:
                break
        page.close()
        return "\n".join(results) if results else "(no results parsed)"

    # ---- summarization ----
    def summarize(self, url: str, max_chars: int = 4000) -> str:
        self.security.authorize("launch", Risk.CONFIRM, f"Read page: {url}")
        self._ensure_started()
        page = self._context.new_page()
        page.goto(url, timeout=30000)
        text = page.inner_text("body")
        page.close()
        text = " ".join(text.split())
        return text[:max_chars]

    # ---- downloads ----
    def download(self, url: str, filename: str = "") -> str:
        self.security.authorize("download", Risk.CONFIRM, f"Download {url}")
        self._ensure_started()
        os.makedirs(self.download_dir, exist_ok=True)
        page = self._context.new_page()
        try:
            with page.expect_download() as dl_info:
                page.goto(url, timeout=60000)
            dl = dl_info.value
            name = filename or dl.suggested_filename
            dest = os.path.join(self.download_dir, os.path.basename(name))
            if not self.security.can_write(dest):
                raise SecurityError(f"Download path not allowed: {dest}")
            dl.save_as(dest)
            return f"Downloaded to {dest}"
        finally:
            page.close()

    # ---- cleanup ----
    def close(self):
        try:
            if self._context:
                self._context.close()
            if self._browser:
                self._browser.close()
            if self._pw:
                self._pw.stop()
        except Exception:  # noqa: BLE001
            pass
        self._context = self._browser = self._pw = None