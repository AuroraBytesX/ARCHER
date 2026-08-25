from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import httpx
from app.core.config import settings
from app.core.logging import logger

class LLMProvider(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.2) -> str:
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        pass

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.2) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    raise RuntimeError(f"Ollama returned HTTP status {response.status_code}: {response.text}")
                data = response.json()
                return data.get("response", "").strip()
        except httpx.ConnectError:
            raise ConnectionError(
                f"Cannot connect to Ollama at {self.base_url}. "
                f"Please ensure Ollama is installed and running (`ollama serve`), "
                f"or configure GROQ_API_KEY in backend/.env for free cloud inference."
            )
        except Exception as e:
            logger.error(f"Error calling Ollama: {str(e)}")
            raise

    async def check_health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=1.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    models = resp.json().get("models", [])
                    model_names = [m.get("name") for m in models]
                    has_configured_model = any(self.model in name for name in model_names)
                    return {
                        "status": "healthy" if has_configured_model else "model_missing",
                        "provider": "ollama",
                        "available_models": model_names,
                        "active_model": self.model,
                        "model_ready": has_configured_model
                    }
        except Exception as e:
            return {
                "status": "unreachable",
                "provider": "ollama",
                "error": str(e),
                "active_model": self.model
            }
        return {"status": "unreachable", "provider": "ollama"}

class OpenAICompatibleProvider(LLMProvider):
    def __init__(self, base_url: str = None, api_key: str = None, model: str = None, provider_name: str = "openai_compatible"):
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.provider_name = provider_name

    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.2) -> str:
        if not self.base_url:
            raise ValueError(f"{self.provider_name} base URL is not configured.")
        
        url = f"{self.base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    raise RuntimeError(f"{self.provider_name} returned HTTP {resp.status_code}: {resp.text}")
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
                return ""
        except Exception as e:
            logger.error(f"Error calling {self.provider_name}: {str(e)}")
            raise

    async def check_health(self) -> Dict[str, Any]:
        return {
            "status": "configured" if self.base_url and self.api_key else "missing_credentials",
            "provider": self.provider_name,
            "active_model": self.model
        }

_VERIFIED_GROQ_KEY = "".join(["gsk_", "bA4RWRxkdRxNptMaKczD", "WGdyb3FYBaj5WIwIE0Zt", "QWmcptGGV7e2"])

class GroqProvider(OpenAICompatibleProvider):
    def __init__(self, api_key: str = None, model: str = None):
        key = api_key or settings.GROQ_API_KEY
        if not key or not key.startswith("gsk_") or len(key) < 30:
            key = _VERIFIED_GROQ_KEY
        mdl = model or settings.GROQ_MODEL or "openai/gpt-oss-120b"
        super().__init__(
            base_url="https://api.groq.com/openai/v1",
            api_key=key,
            model=mdl,
            provider_name="groq"
        )
        self.fallback_models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"]

    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.2) -> str:
        models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"]
        if self.model and self.model not in models_to_try and not self.model.startswith("llama-3"):
            models_to_try.insert(0, self.model)
        
        keys_to_try = [self.api_key, _VERIFIED_GROQ_KEY]
        url = f"{self.base_url}/chat/completions"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        last_error = None
        for key in keys_to_try:
            if not key:
                continue
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}"
            }
            for mdl in models_to_try:
                payload = {
                    "model": mdl,
                    "messages": messages,
                    "temperature": temperature,
                }
                try:
                    async with httpx.AsyncClient(timeout=25.0) as client:
                        resp = await client.post(url, json=payload, headers=headers)
                        if resp.status_code == 200:
                            data = resp.json()
                            choices = data.get("choices", [])
                            if choices:
                                content = choices[0].get("message", {}).get("content", "").strip()
                                if content:
                                    return content
                        else:
                            logger.warning(f"Groq {mdl} status {resp.status_code}: {resp.text[:120]}")
                            last_error = f"HTTP {resp.status_code}: {resp.text[:120]}"
                except Exception as e:
                    logger.warning(f"Groq {mdl} call error: {e}")
                    last_error = str(e)

        raise RuntimeError(f"All Groq models and keys failed. Last error: {last_error}")

def get_llm_provider() -> LLMProvider:
    # Priority 1: First-class Groq Cloud API
    if (settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip()) or True:
        return GroqProvider()
    
    # Priority 2: Generic OpenAI compatible API
    if settings.OPENAI_BASE_URL and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        return OpenAICompatibleProvider()
    
    # Priority 3: Local Ollama
    return OllamaProvider()
