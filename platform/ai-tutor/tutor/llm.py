"""LLM providers — async streaming chat completions.

- `MockLLM` (LLM_PROVIDER=mock): deterministic, grounded-sounding answer built
  from the retrieved chunks — dev/test path with zero external calls.
- `OpenAILLM` (LLM_PROVIDER=openai): OpenAI-compatible streaming chat endpoint.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Protocol, runtime_checkable

from tutor.core.config import Settings


class Message(dict):
    """Chat message: {"role": ..., "content": ...}."""


@runtime_checkable
class LLMProvider(Protocol):
    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        """Yield answer text deltas."""
        ...
        yield  # pragma: no cover - protocol stub


class MockLLM:
    """Deterministic grounded answer for dev/test — cites retrieved chunks."""

    def __init__(self, token_delay: float = 0.005) -> None:
        self._token_delay = token_delay

    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        answer = self._render(messages)
        step = 24
        for i in range(0, len(answer), step):
            yield answer[i : i + step]
            if self._token_delay:
                await asyncio.sleep(self._token_delay)

    @staticmethod
    def _render(messages: list[dict[str, str]]) -> str:
        system = messages[0]["content"] if messages else ""
        question = messages[-1]["content"] if messages else ""
        # The system prompt embeds the retrieved context as "[n] (title) text".
        chunks: list[tuple[str, str]] = []
        for block in system.split("\n"):
            if block.startswith("[") and "]" in block:
                marker, _, rest = block.partition("]")
                title = rest.split(")", 1)[0].lstrip(" (") if "(" in rest else "KB"
                chunks.append((marker + "]", title))
        if not chunks:
            return (
                "I couldn't find relevant material in the Bloom knowledge base for "
                "that yet. A Bloom teacher can point you at the right lesson — or "
                "try rephrasing with the IELTS module you're working on."
            )
        lines = [
            "Here's what Bloom's IELTS materials say about that.",
            "",
        ]
        for marker, title in chunks:
            lines.append(f"- Key points from *{title}* {marker}")
        lines += [
            "",
            "Want me to turn any of these into a practice exercise?",
            "",
            f"(dev-mode mock answer — question: {question[:80]})",
        ]
        return "\n".join(lines)


class OpenAILLM:
    """OpenAI-compatible streaming chat completions."""

    def __init__(
        self,
        model: str,
        api_key: str | None,
        base_url: str | None,
        temperature: float = 0.3,
    ) -> None:
        from openai import AsyncOpenAI

        self._model = model
        self._temperature = temperature
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,  # type: ignore[arg-type]
            temperature=self._temperature,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta


def get_llm(settings: Settings) -> LLMProvider:
    if settings.llm_provider == "openai":
        return OpenAILLM(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            temperature=settings.llm_temperature,
        )
    if settings.llm_provider != "mock":
        raise ValueError(
            f"Unknown LLM_PROVIDER {settings.llm_provider!r} (expected 'mock' or 'openai')"
        )
    return MockLLM()
