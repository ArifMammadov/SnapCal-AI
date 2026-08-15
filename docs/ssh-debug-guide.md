# Пошаговая проверка SSH для GitHub Actions

## Шаг 1. Зайти на сервер

Откройте терминал и подключитесь к серверу:
```bash
ssh root@64.226.122.183
```

Если root не работает, используйте вашего пользователя:
```bash
ssh ваш_пользователь@64.226.122.183
```

## Шаг 2. Узнать правильного пользователя

На сервере выполните:
```bash
whoami
```

Запишите этот ответ — это значение для `PROD_USER` в GitHub.

## Шаг 3. Найти или создать SSH-ключ

Проверьте, есть ли ключи:
```bash
ls -la ~/.ssh/
```

Если есть файлы `id_ed25519` и `id_ed25519.pub` — используйте их.

Если нет — создайте:
```bash
ssh-keygen -t ed25519 -C "snapcal-github-actions" -f ~/.ssh/id_ed25519 -N ""
```

## Шаг 4. Добавить публичный ключ в authorized_keys

```bash
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Шаг 5. Проверить вход по ключу с локальной машины

На вашем компьютере (Mac) выполните:
```bash
scp root@64.226.122.183:~/.ssh/id_ed25519 ~/.ssh/snapcal-deploy-key
chmod 600 ~/.ssh/snapcal-deploy-key
ssh -i ~/.ssh/snapcal-deploy-key root@64.226.122.183
```

Если залогинился — ключ рабочий.

## Шаг 6. Скопировать приватный ключ

На сервере выполните:
```bash
cat ~/.ssh/id_ed25519
```

Выделите весь вывод, включая строки:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Скопируйте в буфер обмена.

## Шаг 7. Добавить секреты в GitHub

1. Откройте: https://github.com/ArifMammadov/SnapCal-AI/settings/secrets/actions
2. Нажмите **New repository secret**.
3. Добавьте 3 секрета:

| Name | Value |
|------|-------|
| `PROD_HOST` | `64.226.122.183` |
| `PROD_USER` | результат команды `whoami` с сервера |
| `DO_PROD_SSH_KEY` | весь текст приватного ключа из шага 6 |

## Шаг 8. Запустить CI/CD вручную

1. Откройте: https://github.com/ArifMammadov/SnapCal-AI/actions/workflows/ci-cd.yml
2. Нажмите **Run workflow** → выберите `main` → **Run workflow**.
3. Подождите 2–3 минуты.

## Шаг 9. Проверить результат

После зелёной галочки:
```bash
curl -s https://snapcal.health/api/auth/demo
```

Должен вернуться JSON с `accessToken`.

Также откройте https://snapcal.health в браузере — кнопка должна быть **«Начать путь»**.

## Если не работает

Проверьте логи CI. Если снова ошибка `ssh: unable to authenticate`, значит:
- неверный `PROD_USER`
- ключ не добавлен в `authorized_keys`
- в GitHub Secret вставлен публичный ключ вместо приватного

Пришлите вывод этих команд с сервера:
```bash
whoami
ls -la ~/.ssh/
head -1 ~/.ssh/authorized_keys
```
