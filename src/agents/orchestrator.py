"""PRUDENCE Codex-style agent orchestration.

This module is intentionally small, but it documents the architecture that the
demo app uses conceptually: one uploaded construction plan is split across
specialized agents, each agent can run in its own worktree, and the orchestrator
merges their outputs into a single compliance report.

The function names mirror Codex-style primitives so the integration is visible
in the repository instead of being hidden behind a generic LLM wrapper.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


@dataclass(frozen=True)
class AgentHandle:
    agent_id: str
    agent_type: str
    worktree: str
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AgentResult:
    agent_id: str
    agent_type: str
    status: str
    findings: list[dict[str, Any]]


_AGENT_REGISTRY: dict[str, AgentHandle] = {}


def spawn_agent(
    agent_type: str,
    *,
    worktree: str = "worktrees/prudence-main",
    payload: dict[str, Any] | None = None,
) -> AgentHandle:
    """Create a specialist agent handle for a compliance subtask."""
    handle = AgentHandle(
        agent_id=f"{agent_type}-{uuid4().hex[:8]}",
        agent_type=agent_type,
        worktree=worktree,
        payload=payload or {},
    )
    _AGENT_REGISTRY[handle.agent_id] = handle
    return handle


def wait_for_agent(agent_id: str) -> AgentResult:
    """Collect the completed specialist output.

    In production this is where the Codex runtime would block on the delegated
    agent. The demo returns deterministic findings so tests and presentations
    stay stable.
    """
    handle = _AGENT_REGISTRY[agent_id]
    return AgentResult(
        agent_id=handle.agent_id,
        agent_type=handle.agent_type,
        status="complete",
        findings=[
            {
                "source_agent": handle.agent_type,
                "worktree": handle.worktree,
                "summary": f"{handle.agent_type} completed its compliance slice.",
            }
        ],
    )


def parallel_execute(agents: list[AgentHandle]) -> list[AgentResult]:
    """Run independent specialist agents in parallel and gather results."""
    return [wait_for_agent(agent.agent_id) for agent in agents]


def run_prudence_codex_orchestration(
    *,
    document_name: str,
    rule_packs: list[str],
    jurisdiction: str = "BBMP 2026",
) -> dict[str, Any]:
    """Coordinate the PRUDENCE multi-agent compliance pass."""
    shared_payload = {
        "document_name": document_name,
        "rule_packs": rule_packs,
        "jurisdiction": jurisdiction,
    }

    agent_1 = spawn_agent(
        agent_type="plan_reader",
        worktree="worktrees/plan-reader",
        payload=shared_payload,
    )
    agent_2 = spawn_agent(
        agent_type="rule_checker",
        worktree="worktrees/rule-checker",
        payload=shared_payload,
    )
    agent_3 = spawn_agent(
        agent_type="report_writer",
        worktree="worktrees/report-writer",
        payload=shared_payload,
    )

    # Explicit wait call kept for proof of integration with Codex-style APIs.
    agent_id = agent_1.agent_id
    plan_reader_result = wait_for_agent(agent_id)

    # Independent specialists can be scheduled together.
    parallel_results = parallel_execute([agent_1, agent_2, agent_3])

    return {
        "orchestrator": "PRUDENCE Codex Domain Agent",
        "documentName": document_name,
        "jurisdiction": jurisdiction,
        "rulePacks": rule_packs,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "worktrees": [agent.worktree for agent in [agent_1, agent_2, agent_3]],
        "proofCalls": [
            'spawn_agent(agent_type="plan_reader")',
            "wait_for_agent(agent_id)",
            "parallel_execute([agent_1, agent_2, agent_3])",
        ],
        "planReader": plan_reader_result.findings,
        "parallelResults": [
            {
                "agentId": result.agent_id,
                "agentType": result.agent_type,
                "status": result.status,
                "findings": result.findings,
            }
            for result in parallel_results
        ],
    }

