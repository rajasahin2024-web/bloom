"""LangGraph agent graph — profile → retrieval → LLM.

The graph is linear for M1 (skeleton); M2 adds routing/agent profiles. Nodes
are closures bound to `TutorDeps`; the worker injects an `emit` callable via
`config["configurable"]` so the LLM node can stream tokens to the job's Redis
event stream as they are generated.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import RunnableConfig
from sqlalchemy.orm import sessionmaker

from tutor import profile as profile_mod
from tutor import retrieval
from tutor.embeddings import EmbeddingProvider
from tutor.llm import LLMProvider

Emit = Callable[[str, dict[str, Any]], None]

SYSTEM_TEMPLATE = """You are Bloom AI Tutor, an IELTS preparation tutor for Bloom Academy students.

Rules:
- Answer ONLY from the Bloom knowledge-base context below; do not invent facts
  or pull from generic internet knowledge.
- Cite the context you used with [n] markers matching the numbered sources.
- If the context does not cover the question, say so honestly and suggest how
  the student can find the answer inside Bloom's materials.
- Adapt depth and vocabulary to the student's profile when one is provided.

Student profile: {profile}

Bloom knowledge-base context:
{context}"""


class TutorState(TypedDict, total=False):
    job_id: str
    student_id: str | None
    question: str
    module: str | None
    profile: dict[str, Any]
    contexts: list[retrieval.RetrievedChunk]
    answer: str


@dataclass
class TutorDeps:
    session_factory: sessionmaker
    embedder: EmbeddingProvider
    llm: LLMProvider
    top_k: int


def _emit(config: RunnableConfig) -> Emit:
    emit = config.get("configurable", {}).get("emit")
    if not callable(emit):
        return lambda _t, _d: None
    return emit


def _format_context(chunks: list[retrieval.RetrievedChunk]) -> str:
    if not chunks:
        return "(no relevant knowledge-base material retrieved)"
    return "\n".join(
        f"[{i + 1}] ({c['doc_title']}) {c['content']}" for i, c in enumerate(chunks)
    )


def build_graph(deps: TutorDeps):
    """Compile the tutor graph bound to the given providers/session factory."""

    async def profile_node(state: TutorState, config: RunnableConfig) -> dict[str, Any]:
        emit = _emit(config)
        profile = await asyncio.to_thread(
            _load_profile_sync, deps.session_factory, state.get("student_id")
        )
        emit("status", {"state": "profile_loaded", "has_profile": bool(profile)})
        return {"profile": profile}

    async def retrieval_node(state: TutorState, config: RunnableConfig) -> dict[str, Any]:
        emit = _emit(config)
        contexts = await asyncio.to_thread(
            _retrieve_sync, deps.session_factory, deps.embedder, state["question"], deps.top_k
        )
        emit("citations", {"items": retrieval.as_citations(contexts)})
        return {"contexts": contexts}

    async def llm_node(state: TutorState, config: RunnableConfig) -> dict[str, Any]:
        emit = _emit(config)
        system = SYSTEM_TEMPLATE.format(
            profile=state.get("profile") or "not available",
            context=_format_context(state.get("contexts") or []),
        )
        if state.get("module"):
            system += f"\n\nThe student is currently working on: {state['module']}."
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": state["question"]},
        ]
        answer = ""
        async for delta in deps.llm.stream(messages):
            answer += delta
            emit("token", {"text": delta})
        return {"answer": answer}

    builder = StateGraph(TutorState)
    builder.add_node("profile", profile_node)
    builder.add_node("retrieval", retrieval_node)
    builder.add_node("llm", llm_node)
    builder.add_edge(START, "profile")
    builder.add_edge("profile", "retrieval")
    builder.add_edge("retrieval", "llm")
    builder.add_edge("llm", END)
    return builder.compile()


def _load_profile_sync(
    session_factory: sessionmaker, student_id: str | None
) -> dict[str, Any]:
    with session_factory() as db:
        return profile_mod.load_profile(db, student_id)


def _retrieve_sync(
    session_factory: sessionmaker,
    embedder: EmbeddingProvider,
    question: str,
    top_k: int,
) -> list[retrieval.RetrievedChunk]:
    vector = embedder.embed([question])[0]
    with session_factory() as db:
        return retrieval.search(db, vector, top_k)
