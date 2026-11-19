# Telegram Course Bot & Mini App

Telegram kursi uchun bot va o'qituvchi boshqaruv paneli (Mini App).

## Texnologiyalar

- Python 3.12, aiogram 3 (async webhook)
- FastAPI (Mini App API va statik frontend)
- PostgreSQL + SQLAlchemy 2 (async) + Alembic
- Redis (sessiyalar, kesh, rate limit)
- Docker va Docker Compose

## O'rnatish va ishga tushirish

1. Muhit parametrlarini sozlash:
```bash
cp .env.example .env
# .env faylini haqiqiy parametrlar bilan to'ldiring
```

2. Docker konteynerlarini ishga tushirish:
```bash
docker compose up -d --build
```

3. Ma'lumotlar bazasi migratsiyalarini qo'llash:
```bash
docker compose exec app alembic upgrade head
```

4. O'quvchilarni bazaga yuklash (Seed):
```bash
docker compose exec app python -m app.scripts.seed_students
```

## O'quvchilar seed skripti haqida

`app/scripts/seed_students.py` skripti `data/students_seed.json` faylidagi 46 ta o'quvchini bazaga idempotent tarzda yuklaydi:
- Allaqachon mavjud o'quvchilarni o'tkazib yuboradi (dublikat yaratmaydi).
- Bitta tranzaksiyada xavfsiz saqlanadi.
- Saqlangandan so'ng Redis rating keshini avtomatik tozalaydi.
- Faqat ism va familya saqlanadi, sinf maydoni ixtiyoriy (bo'sh).

## Git va Push yo'riqnomasi

Loyihani GitHub private repoga push qilish:
```bash
git add -A
git commit -m "feat: add students seed script and admin logout endpoint"
git push origin main
```
Diqqat: .env fayli repoga yuklanmaydi (.gitignore da ko'rsatilgan).
