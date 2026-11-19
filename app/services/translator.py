import asyncio
import logging
from deep_translator import GoogleTranslator
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


def _sync_translate(text: str, source_lang: str, target_lang: str) -> str:
    if source_lang == target_lang:
        return text
    translator = GoogleTranslator(source=source_lang, target=target_lang)
    result = translator.translate(text)
    return result if result else text


async def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
    retries: int = 3
) -> str:
    if source_lang == target_lang:
        return text

    for attempt in range(1, retries + 1):
        try:
            translated = await asyncio.to_thread(_sync_translate, text, source_lang, target_lang)
            if translated:
                return translated
        except Exception as e:
            logger.warning(
                f"Tarjima urinishi {attempt}/{retries} muvaffaqiyatsiz bo'ldi ({source_lang} -> {target_lang}): {e}"
            )
            if attempt == retries:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Matnni {target_lang} tiliga avtomatik tarjima qilishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring."
                )
            await asyncio.sleep(1)

    return text
