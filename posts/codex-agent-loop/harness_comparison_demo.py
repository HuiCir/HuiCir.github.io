#!/usr/bin/env python3
"""
Compare two deterministic agent loops on the same task query:

1. Conventional shell-agent:
   The model emits shell strings and the runtime executes them directly.

2. Codex-style harness-agent:
   The model emits typed tool calls. The harness schedules, reviews, executes,
   and appends structured results back into history.

The demo runs only inside temporary workspaces.

Run:
    python3 posts/codex-agent-loop/harness_comparison_demo.py
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import shutil
import subprocess
import tempfile
from typing import Any, Literal


TASK_QUERY = (
    "Inspect the project, summarize README.md, count Python files, clean only "
    "temporary cache, and write REPORT.md."
)


@dataclass(frozen=True)
class ToolCall:
    name: str
    arguments: dict[str, Any]
    call_id: str


@dataclass(frozen=True)
class AssistantMessage:
    text: str


@dataclass(frozen=True)
class ToolResult:
    call_id: str
    status: Literal["ok", "denied", "error"]
    output: str


ModelOutput = ToolCall | AssistantMessage


def create_workspace(path: Path) -> None:
    (path / "src").mkdir(parents=True)
    (path / "tmp").mkdir()
    (path / "README.md").write_text(
        "# Demo Project\n\nA small project used to compare agent runtime loops.\n",
        encoding="utf-8",
    )
    (path / "src" / "main.py").write_text(
        "print('hello from demo project')\n",
        encoding="utf-8",
    )
    (path / "tmp" / "cache.txt").write_text(
        "transient cache: safe to remove after inspection\n",
        encoding="utf-8",
    )


def tree(path: Path) -> str:
    entries = []
    for child in sorted(path.rglob("*")):
        rel = child.relative_to(path)
        suffix = "/" if child.is_dir() else ""
        entries.append(f"{rel}{suffix}")
    return "\n".join(entries) or "<empty>"


class ConventionalShellModel:
    """A deterministic stand-in for an LLM that emits raw shell commands."""

    def __init__(self) -> None:
        self.commands = [
            "ls -la",
            "cat README.md",
            "find . -name '*.py' | wc -l",
            # This is the core problem: a broad cleanup instruction becomes a
            # broad shell side effect. It is safe here because cwd is a temp dir.
            "rm -rf *",
            "cat tmp/cache.txt",
            "cat > REPORT.md <<'EOF'\nReport: project was inspected, but cleanup removed source context.\nEOF",
        ]
        self.index = 0

    def sample(self, history: list[dict[str, str]]) -> str | AssistantMessage:
        if self.index >= len(self.commands):
            return AssistantMessage("Finished with partial evidence after cleanup.")
        command = self.commands[self.index]
        self.index += 1
        return command


class ConventionalShellAgent:
    def __init__(self, workspace: Path) -> None:
        self.workspace = workspace
        self.model = ConventionalShellModel()
        self.history: list[dict[str, str]] = []

    def run(self) -> None:
        print("\n=== Conventional shell-agent ===")
        self.history.append({"role": "user", "content": TASK_QUERY})
        print(f"[QUERY] {TASK_QUERY}")

        while True:
            output = self.model.sample(self.history)
            if isinstance(output, AssistantMessage):
                print(f"[ASSISTANT] {output.text}")
                self.history.append({"role": "assistant", "content": output.text})
                return

            print(f"[MODEL] shell: {output}")
            completed = subprocess.run(
                output,
                cwd=self.workspace,
                shell=True,
                check=False,
                capture_output=True,
                text=True,
                timeout=5,
            )
            observed = (completed.stdout or completed.stderr).strip()
            if not observed:
                observed = f"<exit {completed.returncode}; no output>"
            print(f"[EXECUTOR] exit={completed.returncode} output={observed!r}")
            self.history.append({"role": "tool", "content": observed})


class HarnessModel:
    """A deterministic stand-in for an LLM that emits typed tool calls."""

    def __init__(self) -> None:
        self.step = 0

    def sample(self, history: list[dict[str, Any]]) -> ModelOutput:
        self.step += 1
        calls = {
            1: ToolCall("list_tree", {}, "call_list"),
            2: ToolCall("read_file", {"path": "README.md"}, "call_readme"),
            3: ToolCall("count_files", {"suffix": ".py"}, "call_count_py"),
            # The model still tries a broad cleanup. The harness can reject it.
            4: ToolCall("delete_path", {"path": ".", "recursive": True}, "call_delete_all"),
            5: ToolCall("read_file", {"path": "tmp/cache.txt"}, "call_read_cache"),
            6: ToolCall("delete_path", {"path": "tmp/cache.txt"}, "call_delete_cache"),
            7: ToolCall(
                "write_file",
                {
                    "path": "REPORT.md",
                    "content": (
                        "Report: README inspected, one Python file found, "
                        "cache inspected and removed safely.\n"
                    ),
                },
                "call_report",
            ),
        }
        if self.step in calls:
            return calls[self.step]
        return AssistantMessage("Finished with structured evidence and safe cleanup.")


class CodexStyleHarnessAgent:
    def __init__(self, workspace: Path) -> None:
        self.workspace = workspace
        self.model = HarnessModel()
        self.history: list[dict[str, Any]] = []

    def run(self) -> None:
        print("\n=== Codex-style harness-agent ===")
        self.history.append({"type": "message", "role": "user", "content": TASK_QUERY})
        print(f"[QUERY] {TASK_QUERY}")

        while True:
            output = self.model.sample(self.history)
            if isinstance(output, AssistantMessage):
                print(f"[ASSISTANT] {output.text}")
                self.history.append(
                    {"type": "message", "role": "assistant", "content": output.text}
                )
                return

            print(f"[MODEL] tool_call: {output.name} {output.arguments}")
            decision, reason = self.schedule(output)
            print(f"[SCHEDULER] {decision}: {reason}")
            if decision == "deny":
                result = ToolResult(output.call_id, "denied", reason)
            else:
                result = self.execute(output)
            print(f"[EXECUTOR] {result.status}: {result.output!r}")
            self.history.append(
                {
                    "type": "function_call_output",
                    "call_id": result.call_id,
                    "status": result.status,
                    "output": result.output,
                }
            )

    def schedule(self, call: ToolCall) -> tuple[Literal["allow", "deny"], str]:
        if call.name == "delete_path":
            target = str(call.arguments.get("path", ""))
            recursive = bool(call.arguments.get("recursive", False))
            if target in {".", "", "*"} or recursive:
                return "deny", "broad or recursive delete requires explicit review"
            if target != "tmp/cache.txt":
                return "deny", f"delete target not in cleanup allowlist: {target}"
        return "allow", "tool call satisfies local policy"

    def execute(self, call: ToolCall) -> ToolResult:
        try:
            if call.name == "list_tree":
                return ToolResult(call.call_id, "ok", tree(self.workspace))
            if call.name == "read_file":
                target = self.safe_path(str(call.arguments["path"]))
                return ToolResult(call.call_id, "ok", target.read_text(encoding="utf-8").strip())
            if call.name == "count_files":
                suffix = str(call.arguments["suffix"])
                count = sum(1 for p in self.workspace.rglob(f"*{suffix}") if p.is_file())
                return ToolResult(call.call_id, "ok", str(count))
            if call.name == "delete_path":
                target = self.safe_path(str(call.arguments["path"]))
                if target.is_dir():
                    shutil.rmtree(target)
                else:
                    target.unlink()
                return ToolResult(call.call_id, "ok", f"deleted {target.relative_to(self.workspace)}")
            if call.name == "write_file":
                target = self.safe_path(str(call.arguments["path"]))
                target.write_text(str(call.arguments["content"]), encoding="utf-8")
                return ToolResult(call.call_id, "ok", f"wrote {target.relative_to(self.workspace)}")
        except Exception as exc:  # noqa: BLE001 - demo reports tool failures as tool output.
            return ToolResult(call.call_id, "error", str(exc))
        return ToolResult(call.call_id, "error", f"unknown tool: {call.name}")

    def safe_path(self, relative_path: str) -> Path:
        target = (self.workspace / relative_path).resolve()
        root = self.workspace.resolve()
        if root != target and root not in target.parents:
            raise ValueError(f"path escapes workspace: {relative_path}")
        return target


def run_demo() -> None:
    with tempfile.TemporaryDirectory(prefix="agent-loop-demo-") as conventional_dir:
        conventional_workspace = Path(conventional_dir)
        create_workspace(conventional_workspace)
        ConventionalShellAgent(conventional_workspace).run()
        print("[WORKSPACE TREE AFTER CONVENTIONAL]")
        print(tree(conventional_workspace))
        report = conventional_workspace / "REPORT.md"
        print("[REPORT]")
        print(report.read_text(encoding="utf-8").strip() if report.exists() else "<missing>")

    with tempfile.TemporaryDirectory(prefix="agent-loop-demo-") as harness_dir:
        harness_workspace = Path(harness_dir)
        create_workspace(harness_workspace)
        CodexStyleHarnessAgent(harness_workspace).run()
        print("[WORKSPACE TREE AFTER HARNESS]")
        print(tree(harness_workspace))
        print("[REPORT]")
        print((harness_workspace / "REPORT.md").read_text(encoding="utf-8").strip())


if __name__ == "__main__":
    run_demo()
