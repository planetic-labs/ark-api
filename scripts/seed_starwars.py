import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select

# Import all models to register them
from core.config import settings
from core.database import AsyncSessionLocal
from modules.auth.models import RefreshToken
from modules.messaging.models import Chat, Message, chat_members
from modules.notifications.models import DeviceToken
from modules.users.init_db import create_superuser_if_not_exists
from modules.users.models import Role, User

# List of users to seed
SEEDED_USERS = [
    {"email": "yoda@order.jed", "name": "Мастер Йода", "role": "master"},
    {"email": "vader@empire.gov", "name": "Дарт Вейдер", "role": "master"},
    {"email": "padme@naboo.org", "name": "Падме Амидала", "role": "student"},
    {"email": "anakin@order.jed", "name": "Энакин Скайуокер", "role": "warrior"},
    {"email": "obiwan@order.jed", "name": "Оби-Ван Кеноби", "role": "warrior"},
    {"email": "windu@order.jed", "name": "Мейс Винду", "role": "warrior"},
    {"email": "luke@order.jed", "name": "Люк Скайуокер", "role": "student"},
    {"email": "ahsoka@order.jed", "name": "Асока Тано", "role": "student"},
    {"email": "quigon@order.jed", "name": "Квай-Гон Джинн", "role": "warrior"},
    {"email": "plokoon@order.jed", "name": "Пло Кун", "role": "warrior"},
    {"email": "kitfisto@order.jed", "name": "Кит Фисто", "role": "warrior"},
    {"email": "shaakti@order.jed", "name": "Шаак Ти", "role": "warrior"},
    {"email": "kiadimundi@order.jed", "name": "Ки-Ади-Мунди", "role": "warrior"},
]


async def seed_starwars():
    # Environment Check
    if not settings.DEBUG:
        print("======================================================================")
        print(
            "CRITICAL WARNING: This script is only allowed to "
            "run in local DEVELOPMENT mode."
        )
        print(
            "It has been blocked because DEBUG is set to False "
            "(or not running locally)."
        )
        print("======================================================================")
        return

    async with AsyncSessionLocal() as session:
        try:
            print("Starting database cleanup...")
            # 1. Full cleanup of data
            await session.execute(delete(Message))
            await session.execute(delete(Chat))
            await session.execute(delete(RefreshToken))
            await session.execute(delete(DeviceToken))
            await session.execute(delete(User))
            await session.commit()
            print("Successfully cleared all messages, chats, tokens, and users.")

            # 2. Ensure Roles exist
            roles_map = {}
            for role_name in ["admin", "master", "warrior", "student"]:
                result = await session.execute(
                    select(Role).where(Role.name == role_name)
                )
                role_obj = result.scalar_one_or_none()
                if not role_obj:
                    role_obj = Role(
                        name=role_name,
                        is_system=(role_name == "admin"),
                        is_default=(role_name == "student"),
                    )
                    session.add(role_obj)
                    await session.flush()
                roles_map[role_name] = role_obj

            # 3. Create Users
            users_map = {}
            for u_data in SEEDED_USERS:
                user = User(
                    email=u_data["email"],
                    is_approved=True,
                    is_active=True,
                    email_verified=True,
                    status="active",
                )
                user.full_name = u_data["name"]
                user.roles.append(roles_map[u_data["role"]])
                session.add(user)
                await session.flush()
                users_map[u_data["email"]] = user
                print(f"Created user: {user.email} (ID: {user.id})")

            # Helper function to add a message
            async def add_msg(chat_id, sender_email, content, time_offset_minutes):
                sender = users_map[sender_email]
                created_at = datetime.now(UTC) - timedelta(minutes=time_offset_minutes)
                msg = Message(
                    chat_id=chat_id,
                    sender_id=sender.id,
                    content=content,
                    created_at=created_at,
                )
                session.add(msg)
                await session.flush()

            # 4. Group Chat 1: "Разведка: Звезда Смерти"
            gc1 = Chat(name="Разведка: Звезда Смерти", is_group=True)
            session.add(gc1)
            await session.flush()

            # Members
            member_emails = [
                "windu@order.jed",
                "obiwan@order.jed",
                "anakin@order.jed",
                "ahsoka@order.jed",
                "plokoon@order.jed",
                "kitfisto@order.jed",
                "yoda@order.jed",
            ]
            for email in member_emails:
                await session.execute(
                    chat_members.insert().values(
                        chat_id=gc1.id, user_id=users_map[email].id
                    )
                )

            # Dialogue (11 messages)
            dialogue1 = [
                (
                    "windu@order.jed",
                    (
                        "Наши шпионы получили новые данные о секретной станции "
                        "Империи. Кодовое имя — Звезда Смерти."
                    ),
                    60,
                ),
                ("obiwan@order.jed", "Звучит угрожающе. Каковы масштабы?", 55),
                (
                    "anakin@order.jed",
                    (
                        "Да какая разница, какие масштабы. Дайте мне эскадрилью "
                        "истребителей, и я разнесу её в щепки!"
                    ),
                    52,
                ),
                (
                    "ahsoka@order.jed",
                    "Учитель, не горячитесь. Похоже, у этой станции серьезная защита.",
                    48,
                ),
                (
                    "plokoon@order.jed",
                    (
                        "Я чувствую возмущение в Силе. Станция способна "
                        "уничтожать целые планеты."
                    ),
                    45,
                ),
                (
                    "kitfisto@order.jed",
                    "Уничтожать планеты? Это безумие. Каков их источник энергии?",
                    40,
                ),
                (
                    "yoda@order.jed",
                    "Сила темная за этим стоит. Осторожность проявить мы должны.",
                    35,
                ),
                (
                    "anakin@order.jed",
                    (
                        "Я посмотрел чертежи. Там есть теплоотводная шахта, "
                        "ведущая прямо к реактору. Диаметр всего два метра."
                    ),
                    30,
                ),
                (
                    "obiwan@order.jed",
                    "Попасть в такую мишень даже на истребителе будет крайне непросто.",
                    25,
                ),
                (
                    "windu@order.jed",
                    "Нам нужен четкий план атаки. Любая ошибка приведет к катастрофе.",
                    20,
                ),
                ("yoda@order.jed", "Люка отправить нужно. Сила крепка в нем.", 15),
            ]
            for sender, content, offset in dialogue1:
                await add_msg(gc1.id, sender, content, offset)

            # 5. Group Chat 2: "Обучение Люка Скайуокера"
            gc2 = Chat(name="Обучение Люка Скайуокера", is_group=True)
            session.add(gc2)
            await session.flush()

            # Members
            for email in ["yoda@order.jed", "obiwan@order.jed", "luke@order.jed"]:
                await session.execute(
                    chat_members.insert().values(
                        chat_id=gc2.id, user_id=users_map[email].id
                    )
                )

            # Dialogue (13 messages)
            dialogue2 = [
                (
                    "obiwan@order.jed",
                    "Мастер Йода, я привел Люка на Дагобу. Он готов начать обучение.",
                    120,
                ),
                (
                    "yoda@order.jed",
                    "Готов, говоришь? Хм. Слишком стар он. Терпения нет у него.",
                    115,
                ),
                (
                    "luke@order.jed",
                    "Я готов! Я не подведу вас. Оби-Ван рассказывал мне о Силе.",
                    110,
                ),
                (
                    "yoda@order.jed",
                    (
                        "Слова, лишь слова. Сила повсюду. Между мной, тобой, "
                        "тем деревом, той скалой."
                    ),
                    100,
                ),
                (
                    "luke@order.jed",
                    "Но как мне поднять этот X-Wing из болота? Он слишком тяжелый!",
                    90,
                ),
                (
                    "yoda@order.jed",
                    (
                        "Размер значения не имеет. Посмотри на меня. "
                        "По моему росту обо мне судишь?"
                    ),
                    85,
                ),
                ("obiwan@order.jed", "Доверься Силе, Люк. Отпусти свои сомнения.", 80),
                ("luke@order.jed", "Хорошо, я попробую...", 75),
                (
                    "yoda@order.jed",
                    "Нет! Не пробовать. Делать. Или не делать. Никаких «попробую».",
                    70,
                ),
                ("luke@order.jed", "Я не могу... это невозможно!", 65),
                (
                    "yoda@order.jed",
                    "*поднимает X-Wing Силой и плавно ставит на сухую землю*",
                    60,
                ),
                ("luke@order.jed", "Я... я не верю!", 55),
                ("yoda@order.jed", "В этом и есть твоя ошибка.", 50),
            ]
            for sender, content, offset in dialogue2:
                await add_msg(gc2.id, sender, content, offset)

            await session.commit()
            print("========================================")
            print("  STAR WARS DATA SEEDED SUCCESSFULLY!   ")
            print("========================================")

            # 6. Re-create superusers
            print("Re-creating superusers...")
            await create_superuser_if_not_exists()
            print("Superusers re-created successfully.")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding Star Wars data: {e}")
            raise e


if __name__ == "__main__":
    asyncio.run(seed_starwars())
