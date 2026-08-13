# SnapCal Alertmanager Configuration

Do NOT commit real credentials. Copy example before deploy:

```bash
cp alertmanager.yml.example alertmanager.yml
```

Required environment variables at runtime:

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | optional for email | SMTP relay host |
| `SMTP_USER` | optional for email | SMTP username |
| `SMTP_PASSWORD` | optional for email | SMTP password |
| `ALERT_EMAIL` | optional | Default email recipient |
| `ALERT_FROM` | no | Sender email, default `alerts@snapcal.health` |
| `ALERT_WEBHOOK_URL` | **yes** | Webhook for alerts (Slack/Teams/Telegram/PagerDuty) |

Recommended providers:
- Slack: incoming webhook URL
- Telegram: `https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>`
- PagerDuty: events v2 integration URL
- OpsGenie: API endpoint

Critical alerts go to both email and webhook; warnings go to webhook only.
