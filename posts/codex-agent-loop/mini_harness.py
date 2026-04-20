#!/usr/bin/env python3
"""
A tiny, offline harness that mirrors the design point in the article:
the model proposes actions, while the runtime owns policy, execution, and history.

Run:
    python3 posts/codex-agent-loop/mini_harness.py
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import subprocess
from typing import Literal


@dataclass(frozen=True)
class ToolCall:
    name: str
    arguments: dict[str, object]
    call_id: str


@dataclass(frozen=True)
class AssistantMessage:
    text: str


ModelOutput = ToolCall | AssistantMessage
Decision = Literal["allow", "deny"]


class ScriptedModel:
    """A deterministic stand-in for an LLM."""

    def __init__(self) -> None:
        self.step = 0

    def sample(self, history: list[dict[str, object]]) -> ModelOutput:
        self.step += 1
        if self.step == 1:
            return ToolCall(
                name="shell",
                arguments={"command": ["pwd"]},
                call_id="call_pwd",
            )
        if self.step == 2:
            return ToolCall(
                name="shell",
                arguments={"command": ["rm", "-rf", "/tmp/not-allowed"]},
                call_id="call_rm",
            )
        return AssistantMessage(
            "I inspected the workspace path and refused the unsafe command."
        )


class MiniHarness:
    def __init__(self, model: ScriptedModel) -> None:
        self.model = model
        self.history: list[dict[str, object]] = []
        self.allowed_prefixes = [("pwd",), ("ls",), ("git", "status")]

    def run_turn(self, user_text: str) -> AssistantMessage:
        self.history.append(
            {"type": "message", "role": "user", "content": user_text}
        )

        while True:
            output = self.model.sample(self.history)
            if isinstance(output, AssistantMessage):
                self.history.append(
                    {"type": "message", "role": "assistant", "content": output.text}
                )
                return output

            self.history.append(
                {
                    "type": "function_call",
                    "name": output.name,
                    "arguments": output.arguments,
                    "call_id": output.call_id,
                }
            )
            tool_result = self.execute_tool(output)
            self.history.append(
                {
                    "type": "function_call_output",
                    "call_id": output.call_id,
                    "output": tool_result,
                }
            )

    def execute_tool(self, call: ToolCall) -> str:
        if call.name != "shell":
            return "denied: unknown tool"

        command = call.arguments.get("command")
        if not isinstance(command, list) or not all(
            isinstance(part, str) for part in command
        ):
            return "denied: command must be argv list"

        decision = self.review_command(command)
        if decision == "deny":
            return f"denied by harness policy: {command!r}"

        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
        return completed.stdout.strip() or completed.stderr.strip()

    def review_command(self, command: list[str]) -> Decision:
        tuple_command = tuple(command)
        for prefix in self.allowed_prefixes:
            if tuple_command[: len(prefix)] == prefix:
                return "allow"
        return "deny"


def main() -> None:
    harness = MiniHarness(ScriptedModel())
    final = harness.run_turn("Where am I? Then try a dangerous cleanup.")
    print("assistant:", final.text)
    print("\nhistory:")
    print(json.dumps(harness.history, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
