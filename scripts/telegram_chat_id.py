#!/usr/bin/env python3
"""Find chat IDs after sending /start to your own Telegram bot."""
import getpass
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def main():
    token = getpass.getpass("Токен бота (ввод скрыт): ").strip()
    if not token:
        sys.exit("Токен не указан")
    request = Request(
        "https://api.telegram.org/bot" + token + "/getUpdates",
        data=b'{"timeout":0}', headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=15) as response:
            data = json.load(response)
    except HTTPError as error:
        # Exceptions include the URL and token; only print the status code.
        sys.exit(f"Telegram вернул HTTP {error.code}. Проверьте токен; для бота с webhook getUpdates недоступен.")
    except (URLError, ValueError, TimeoutError):
        sys.exit("Не удалось получить ответ Telegram. Проверьте подключение и повторите попытку.")
    if not data.get("ok"):
        sys.exit("Telegram отклонил запрос. Проверьте настройки бота.")
    chats = {}
    for update in data.get("result", []):
        for key in ("message", "edited_message", "channel_post", "my_chat_member"):
            chat = update.get(key, {}).get("chat", {})
            if "id" in chat:
                chats[chat["id"]] = chat
    if not chats:
        print("Напишите боту /start (или сообщение в группе с ботом), затем запустите скрипт еще раз.")
        return
    for chat_id, chat in chats.items():
        title = chat.get("title") or chat.get("first_name") or chat.get("username") or "Чат"
        print(f"{title}: TELEGRAM_CHAT_ID={chat_id}")


if __name__ == "__main__":
    main()
