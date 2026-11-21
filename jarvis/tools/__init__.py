"""JARVIS tools package: file, app, system, input + screen agents."""

from .registry import Tool, ToolRegistry, ToolResult
from . import file_agent, app_agent, system_monitor, keyboard_mouse, screen_reader

__all__ = ["Tool", "ToolRegistry", "ToolResult",
           "file_agent", "app_agent", "system_monitor",
           "keyboard_mouse", "screen_reader"]