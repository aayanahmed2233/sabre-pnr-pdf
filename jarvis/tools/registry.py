"""
JARVIS Tool registry + dispatch.

A Tool is a named, described callable. The AI (later) requests a tool by name;
the registry runs it THROUGH the Security layer. No tool touches the system
without the Security gate.

This module is UI-agnostic: it takes a Security instance and a context (config,
workspace paths, confirm callback). Agents register their tools here.
"""

import traceback
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from core.security import Security, SecurityError, Risk


@dataclass
class Tool:
    name: str
    description: str
    func: Callable[..., Any]
    risk: str = Risk.SAFE
    action: str = ""            # key into Security labels
    params: Dict[str, str] = field(default_factory=dict)  # name -> description

    def __call__(self, *args, **kwargs):
        return self.func(*args, **kwargs)


@dataclass
class ToolResult:
    ok: bool
    output: str = ""
    error: str = ""


class ToolRegistry:
    def __init__(self, security: Security, context: dict):
        self.security = security
        self.context = context          # shared: cfg, workspace, etc.
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool):
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def names(self) -> List[str]:
        return sorted(self._tools)

    def describe(self) -> List[dict]:
        return [
            {"name": t.name, "description": t.description,
             "risk": t.risk, "params": t.params}
            for t in self._tools.values()
        ]

    def run(self, name: str, *args, **kwargs) -> ToolResult:
        """Run a tool by name through the Security gate."""
        tool = self._tools.get(name)
        if not tool:
            return ToolResult(False, error=f"Unknown tool: {name}")
        try:
            self.security.authorize(tool.action or tool.name, tool.risk)
            out = tool(*args, **kwargs)
            return ToolResult(True, output="" if out is None else str(out))
        except SecurityError as e:
            return ToolResult(False, error=str(e))
        except Exception as e:  # noqa: BLE001
            return ToolResult(False, error=f"{e}\n{traceback.format_exc(limit=2)}")

    def call(self, name: str, **kwargs) -> ToolResult:
        return self.run(name, **kwargs)