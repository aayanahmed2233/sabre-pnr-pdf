"""
JARVIS multi-agent system (Phase 7).

A coordinator delegates to specialised agents:
  - Researcher : uses browser_agent to gather info
  - Developer  : uses coding_agent to write/edit/run code
  - Tester     : runs tests in the workspace
  - FileManager: uses file_agent to move/search files
  - Coordinator: decides which agent(s) to invoke for a task

This is a lightweight, deterministic coordinator (no LLM required). It can be
wired to the AI engine later for intent-based routing. Every action still goes
through each agent's Security gate.
"""

from dataclasses import dataclass
from typing import Callable, List

from core.security import Security
from tools.registry import ToolRegistry


@dataclass
class AgentResult:
    agent: str
    ok: bool
    output: str = ""


class MultiAgentCoordinator:
    def __init__(self, security: Security, registry: ToolRegistry,
                 browser=None, coding=None, file_agent=None):
        self.security = security
        self.registry = registry
        self.browser = browser
        self.coding = coding
        self.file_agent = file_agent

    def research(self, query: str) -> AgentResult:
        if not self.browser:
            return AgentResult("researcher", False, "Browser agent not enabled.")
        try:
            out = self.browser.search(query)
            return AgentResult("researcher", True, out)
        except Exception as e:  # noqa: BLE001
            return AgentResult("researcher", False, str(e))

    def develop(self, rel_path: str, content: str) -> AgentResult:
        if not self.coding:
            return AgentResult("developer", False, "Coding agent not enabled.")
        try:
            out = self.coding.write_file(rel_path, content)
            return AgentResult("developer", True, out)
        except Exception as e:  # noqa: BLE001
            return AgentResult("developer", False, str(e))

    def test(self, command: str) -> AgentResult:
        if not self.coding:
            return AgentResult("tester", False, "Coding agent not enabled.")
        try:
            out = self.coding.run_command(command)
            return AgentResult("tester", True, out)
        except Exception as e:  # noqa: BLE001
            return AgentResult("tester", False, str(e))

    def manage_files(self, op: str, *args, **kwargs) -> AgentResult:
        if not self.file_agent:
            return AgentResult("file_manager", False, "File agent not available.")
        try:
            fn = getattr(self.file_agent, op)
            out = fn(self.security, *args, **kwargs)
            return AgentResult("file_manager", True, str(out))
        except Exception as e:  # noqa: BLE001
            return AgentResult("file_manager", False, str(e))

    def run_all(self, task: str, **ctx) -> List[AgentResult]:
        """A simple coordinator pipeline for a task (research -> develop -> test)."""
        results = []
        if ctx.get("query"):
            results.append(self.research(ctx["query"]))
        if ctx.get("write"):
            path, content = ctx["write"]
            results.append(self.develop(path, content))
        if ctx.get("test_cmd"):
            results.append(self.test(ctx["test_cmd"]))
        return results