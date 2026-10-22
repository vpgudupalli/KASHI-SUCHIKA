# Daily Tithi WhatsApp

This sends WhatsApp messages by the Telugu calendar:
- **6:00 AM India time, every day:** today's Telugu date (samvatsaram, masam, tithi, vaaram), any festival with what to do, family tithis, and your own notes.
- **7:00 PM India time, the evening before:** tomorrow's festival, family date or notes, so you can get ready. Ordinary days get no evening message.
- **Sunday mornings:** a second message with the coming week, Monday to Sunday.
It uses CallMeBot (free) to send and GitHub Actions (free) to run every day, even when your computer is off.

## 1. Get a CallMeBot key (each person who wants messages)

1. Go to https://www.callmebot.com/blog/free-api-whatsapp-messages/ and save the WhatsApp number shown there in your phone contacts. The number sometimes changes, so always take it from that page.
2. From WhatsApp, send that contact this exact message: `I allow callmebot to send me messages`
3. You get a reply with your **apikey** (a number). Keep it. Your sister does the same on her phone.

## 2. Make the GitHub repository

1. Sign in at https://github.com (create a free account if needed).
2. Click **+** (top right) → **New repository**. Name it `tithi-whatsapp`, choose **Private**, click **Create repository**.
3. Click **uploading an existing file**. Drag in `daily.js`, `engine.js`, `festivals.js`, `README.md` and the `data` folder. Click **Commit changes**.
4. Click **Add file** → **Create new file**. Type the name `.github/workflows/daily.yml` (the slashes make folders). Paste in everything from the `daily.yml` file here, then click **Commit changes**.

## 3. Add the phone numbers as a secret

1. In the repo, go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Name: `RECIPIENTS`
3. Value (change the numbers and keys; country code first, no spaces):

```json
[
  {"name": "Me", "phone": "+919876543210", "apikey": "123456"},
  {"name": "Chelli", "phone": "+919812345678", "apikey": "654321"}
]
```

4. Click **Add secret**. The numbers and keys stay hidden and never appear in the code.

## 4. Test it

Go to **Actions** → **Daily tithi WhatsApp** → **Run workflow**. Within a minute you should get today's message.
After that it runs by itself every morning.

## Keeping family dates and notes up to date

Edit anything on the Tithi Reminders page whenever you like. Every evening at about 7 PM (computer time), the
"Sync Tithi Reminders to WhatsApp job" scheduled task in the Claude app copies your latest family dates and notes
into this repo, before the next morning's message. It runs while the Claude app is open; if the app was closed,
it runs the next time you open it.

If you ever need to do it by hand: on the page tap **Download data for daily WhatsApp**, then in GitHub open the
`data` folder → **Add file** → **Upload files**, drop in `tithi-data.json`, and **Commit changes**.

## Good to know

- GitHub sometimes starts scheduled jobs up to about 30 minutes late.
- GitHub pauses schedules in repos with no changes for 60 days. The job makes a tiny commit on the 1st of each month to prevent this.
- CallMeBot is a free third-party service, not WhatsApp itself. If it ever stops working, the same job can be switched to Meta's official WhatsApp Cloud API.
- To try a day without sending anything: `node daily.js --date=2026-11-08 --dry-run`
