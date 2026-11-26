"""
Eski db.sqlite3 dagi ma'lumotlarni PostgreSQL'ga ko'chirish.

Nega dumpdata emas: eski SQLite jadvallari migratsiyalarga mos bo'lmasligi mumkin
(masalan, 0001_initial.py keyinchalik tahrirlangan va ba'zi ustunlar SQLite'da yo'q).
Bu buyruq SQLite'da mavjud ustunlarnigina o'qiydi, yo'qlariga modeldagi standart
qiymatni qo'yadi.

Ishlatish (avval: docker compose up -d database && python manage.py migrate):
    python manage.py import_sqlite

- Foydalanuvchi Postgres'da shu telefon raqam bilan allaqachon bo'lsa, qayta yaratilmaydi;
  uning mehmon/byudjet/vazifalari o'sha mavjud foydalanuvchiga biriktiriladi.
- Vendor shu nom va kategoriya bilan bor bo'lsa, qayta yaratilmaydi.
- Mehmon, byudjet, vazifa va vendor rasmlari har safar yangidan qo'shiladi,
  shuning uchun buyruqni BIR MARTA ishga tushiring.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction

from apps.models import BudgetItem, Guests, Review, Task, User, Vendor, VendorImage

SOURCE = 'sqlite'

# Tartib muhim: avval bog'lanadigan jadvallar (User, Vendor), keyin ularga bog'liqlar.
# (model, mavjudini topish uchun maydonlar yoki None — har doim yangi yozuv)
PLAN = [
    (User, ('phone_number',)),
    (Vendor, ('name', 'category')),
    (Guests, None),
    (BudgetItem, None),
    (Task, None),
    (VendorImage, None),
    (Review, ('vendor_id', 'user_id')),
]


class Command(BaseCommand):
    help = "Eski db.sqlite3 dagi ma'lumotlarni asosiy (PostgreSQL) bazaga ko'chiradi"

    def handle(self, *args, **options):
        if SOURCE not in connections.databases:
            raise CommandError(
                "db.sqlite3 topilmadi. Fayl loyiha papkasida (manage.py yonida) bo'lishi kerak."
            )

        src = connections[SOURCE]
        with src.cursor() as cursor:
            tables = set(src.introspection.table_names(cursor))

        id_map = {}  # {Model: {eski_id: yangi_id}}

        with transaction.atomic():
            for model, lookup in PLAN:
                id_map[model] = self.copy_model(model, lookup, src, tables, id_map)

        self.stdout.write(self.style.SUCCESS("Tayyor. Ma'lumotlar PostgreSQL'ga ko'chirildi."))

    def copy_model(self, model, lookup, src, tables, id_map):
        name = model.__name__
        table = model._meta.db_table
        mapping = {}

        if table not in tables:
            self.stdout.write(f"  {name}: SQLite'da jadval yo'q — o'tkazib yuborildi")
            return mapping

        with src.cursor() as cursor:
            existing_cols = {c.name for c in src.introspection.get_table_description(cursor, table)}

        fields = [f for f in model._meta.concrete_fields if f.column in existing_cols]
        missing = [f.name for f in model._meta.concrete_fields if f.column not in existing_cols]
        pk_name = model._meta.pk.attname

        rows = list(model.objects.using(SOURCE).values(*[f.attname for f in fields]))
        created = reused = 0

        for row in rows:
            old_pk = row.pop(pk_name)

            # Bog'langan yozuvlarning id'larini yangi bazadagi id'larga almashtiramiz
            for f in model._meta.concrete_fields:
                if f.is_relation and f.attname in row:
                    target = f.related_model
                    old_fk = row[f.attname]
                    if old_fk is None:
                        continue
                    if old_fk not in id_map.get(target, {}):
                        row = None  # egasi ko'chmagan — bu yozuvni tashlaymiz
                        break
                    row[f.attname] = id_map[target][old_fk]
            if row is None:
                continue

            if lookup:
                found = model.objects.filter(**{k: row[k] for k in lookup if k in row}).first()
                if found:
                    mapping[old_pk] = found.pk
                    reused += 1
                    continue

            obj = model(**row)
            obj.save(force_insert=True)
            mapping[old_pk] = obj.pk
            created += 1

        msg = f"  {name}: SQLite'da {len(rows)} ta, yangi qo'shildi {created} ta"
        if reused:
            msg += f", allaqachon bor edi {reused} ta"
        if missing:
            msg += f" (SQLite'da yo'q ustunlar standart qiymat oldi: {', '.join(missing)})"
        self.stdout.write(msg)
        return mapping
