# Настройка SSH-доступа GitHub Actions к серверу SnapCal

## 1. Создать или выбрать SSH-ключ на сервере

Зайдите на сервер `64.226.122.183` под пользователем, который будет выполнять деплой (например, `root` или `snapcal`).

Проверьте, есть ли уже ключ:
```bash
ls -la ~/.ssh/
```

Если файла `id_ed25519` нет, создайте:
```bash
ssh-keygen -t ed25519 -C "snapcal-github-actions" -f ~/.ssh/id_ed25519 -N ""
```

## 2. Разрешить ключ для входа

Добавьте публичный ключ в `authorized_keys`:
```bash
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Проверьте, что вход по ключу работает с локальной машины:
```bash
ssh -i ~/.ssh/id_ed25519 <USER>@64.226.122.183
```

## 3. Разрешить вход GitHub Actions

Скопируйте **приватный** ключ с сервера:
```bash
cat ~/.ssh/id_ed25519
```

Выделите и скопируйте всё содержимое, включая строки:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

## 4. Добавить секреты в GitHub

Откройте репозиторий: https://github.com/ArifMammadov/SnapCal-AI/settings/secrets/actions

Нажмите **New repository secret** и добавьте 3 секрета:

| Имя секрета | Значение |
|-------------|----------|
| `PROD_HOST` | `64.226.122.183` |
| `PROD_USER` | ваш пользователь на сервере (`root`, `snapcal` или другой) |
| `DO_PROD_SSH_KEY` | полное содержимое приватного ключа `id_ed25519` |

## 5. Убедиться, что на сервере есть нужные директории и сервисы

На сервере должны быть:
- `/opt/snapcal-main` — git-репозиторий, привязанный к `https://github.com/ArifMammadov/SnapCal-AI`
- systemd-сервисы `snapcal-api-main` и `snapcal-ai-main`
- `pnpm` и `node` доступны глобально

Если директории нет, клонируйте репозиторий:
```bash
cd /opt
git clone https://github.com/ArifMammadov/SnapCal-AI.git snapcal-main
cd snapcal-main
git checkout main
```

## 6. Проверить деплой

После добавления секретов сделайте любой push в `main` или запустите workflow вручную:
https://github.com/ArifMammadov/SnapCal-AI/actions/workflows/ci-cd.yml

## 7. Проверить результат

После успешного деплоя:
```bash
curl -s https://snapcal.health/api/auth/demo
```

Должен вернуться JSON с `accessToken` и `user`.

## Важно

- Никогда не сохраняйте приватный ключ в коде или в чатах.
- Используйте только ed25519 или rsa 4096+.
- Ограничьте права пользователя деплоя по минимуму (желательно отдельный пользователь `deploy`).
- Включите `StrictHostKeyChecking=no` в CI уже настроено через `appleboy/ssh-action`.
