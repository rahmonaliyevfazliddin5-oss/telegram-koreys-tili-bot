import asyncio
import logging
from deep_translator import GoogleTranslator
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


def _sync_translate(text: str, source_lang: str, target_lang: str) -> str:
    if not text or not text.strip():
        return text or ""
    if source_lang == target_lang:
        return text
    translator = GoogleTranslator(source=source_lang, target=target_lang)
    result = translator.translate(text)
    return result if result else text


async def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
    retries: int = 3,
    fallback_to_original: bool = True
) -> str:
    if not text or not text.strip():
        return text or ""
    if source_lang == target_lang:
        return text

    for attempt in range(1, retries + 1):
        try:
            translated = await asyncio.to_thread(_sync_translate, text.strip(), source_lang, target_lang)
            if translated:
                return translated
        except Exception as e:
            logger.warning(
                f"Tarjima urinishi {attempt}/{retries} muvaffaqiyatsiz bo'ldi ({source_lang} -> {target_lang}): {e}"
            )
            if attempt < retries:
                await asyncio.sleep(attempt * 0.5)
            elif not fallback_to_original:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Matnni {target_lang} tiliga avtomatik tarjima qilishda xatolik yuz berdi."
                )

    return text
