"""
JARVIS browser agent.

Uses Playwright with a DEDICATED profile directory (never the user's real
Chrome profile, cookies, or saved passwords). Provides research, navigation,
downloads (to an approved folder), and page summarization (text extraction).

Playwright is optional: if not installed, all methods fail gracefully with a
clear message. Nothing here touches the user's main browser data.
"""

import os
from dataclasses import dataclass, field
from typing import Optional

from core.security import Security, SecurityError, Risk


@dataclass
class BrowserAgent:
    security: Security
    profile_dir: str
    download_dir: str
    headless: bool = False
    _pw = None
    _browser = None
    _context = None

    # ---- lifecycle ----
    def _ensure_started(self):
        if self._browser is not None:
            return
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as e:
            raise SecurityError(
                "Playwright is not installed. Install it with:\n"
                "  pip install playwright\n  playwright install chromium"
            ) from e

        os.makedirs(self.profile_dir, exist_ok=True)
        os.makedirs(self.download_dir, exist_ok=True)
        # Contain downloads
        self.security.add_write_root(self.download_dir)
        self.security.add_read_root(self.profile_dir)

        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=self.headless)
        self._context = self._browser.new_context(
            accept_downloads=True,
            user_data_dir=None,  # dedicated profile dir used via launch_persistent
        )

    def launch_persistent(self):
        """Use a persistent DEDICATED profile (separate from user Chrome)."""
        if self._browser is not None:
            return
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as e:
            raise SecurityError(
                "Playwright not installed. Run: pip install playwright && "
                "playwright install chromium") from e
        os.makedirs(self.profile_dir, exist_ok=True)
        self.security.add_read_root(self.profile_dir)
        self._pw = sync_playwright().start()
        self._context = self._pw.chromium.launch_persistent_context(
            self.profile_dir, headless=self.headless, accept_downloads=True)
        self._browser = self._context.browser

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
        """Run a Google search and return the top result titles+links."""
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
        """Fetch a page and return its visible text (for the AI to summarize)."""
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
        """Download a file into the approved download dir."""
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