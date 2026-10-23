# Daily Tithi WhatsApp

This sends WhatsApp messages by the Telugu calendar:
- **Every morning at about 8 AM India time:** the full message for **tomorrow**: Telugu date (samvatsaram, masam, tithi, vaaram), any festival with what to do, family tithis and your notes. So Saturday's message arrives on Friday morning.
- **Sunday mornings:** a second message with the coming week, Monday to Sunday.

It sends from your own WhatsApp through Green API (free Developer plan, up to 3 chats) and runs on GitHub Actions
(free) every day, even when your computer is off. Sending to a family WhatsApp group works best: everyone in the
group gets the reminders, and the group counts as one chat.

## 1. Make the WhatsApp group

On your phone, make a WhatsApp group, for example **Tithi Reminders**, and add your sister and anyone else who
should get the messages. Send one message in it ("hi") so it shows up in the list later.

## 2. Link your WhatsApp to Green API

1. Go to https://console.green-api.com and sign up (free).
2. Create an instance and choose the free **Developer** plan.
3. On the instance page you'll see a QR code. On your phone, open WhatsApp → **Settings** → **Linked devices** → **Link a device**, and scan it.
4. On the same instance page, find these three values. You'll paste them into GitHub in step 4, so don't share them with anyone:
   - **apiUrl** (looks like `https://1234.api.greenapi.com`)
   - **idInstance** (a long number)
   - **apiTokenInstance** (a long code)

## 3. Make the GitHub repository

1. Sign in at https://github.com (create a free account if needed).
2. Go to https://github.com/new. Name it `tithi-whatsapp`, choose **Private**, leave "Add a README" unticked, click **Create repository**.
3. From this folder, run:
   ```
   git remote add origin https://github.com/YOUR-USERNAME/tithi-whatsapp.git
   git push -u origin main
   ```
   A GitHub sign-in window opens the first time; sign in with your browser.

## 4. Add your WhatsApp settings as a secret

1. In the repo, go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Name: `WHATSAPP`
3. Secret (put in your three values from step 2; leave `chats` empty for now):

```json
{"apiUrl": "https://1234.api.greenapi.com", "idInstance": "1101000000", "apiTokenInstance": "paste-your-token", "chats": []}
```

4. Click **Add secret**. It stays hidden and never appears in the code.

## 5. Find your group's chat ID

1. Go to **Actions** → **Daily tithi WhatsApp** → **Run workflow**, choose **groups**, and click the green **Run workflow** button.
2. Open the run when it finishes, then click **send** → **Send WhatsApp message**. You'll see lines like `Tithi Reminders  →  120363...@g.us`.
3. Copy that ID and put it in the file `data/chats.json` in the repo (click the file, then the pencil to edit), in quotes inside the brackets:

```json
["120363000000000000@g.us"]
```

You can list up to 3 chats. A single person's chat ID is their number with country code and `@c.us`, for example `919876543210@c.us`.
(If you prefer, you can put the list in the secret's `"chats"` instead; the secret wins when it has any.)

## 6. Test it

**Actions** → **Daily tithi WhatsApp** → **Run workflow** → choose **morning** → **Run workflow**. Today's message
arrives in the group within a minute. After that it runs by itself.

## Adding family dates and notes

**The easy way: the "Add a Tithi Reminder" form.** Open the form link (it's in the sheet's **Start here** tab;
pin it in the WhatsApp group too), pick what you're adding, fill in the dropdowns, and press Submit. Answers land
in the sheet's **Form entries** tab, and the job reads them before every message, so they go out automatically
on their Telugu dates, every year. No computer or Claude app is needed. To change or remove an entry, edit or
delete its row in **Form entries**.

You can also type rows straight into the sheet's **Family** and **Notes** tabs.

### Setting up the sheet and form (once)

1. Upload `Tithi Family Notebook.xlsx` to Google Drive, open it with Google Sheets, then **File → Save as Google Sheets**.
2. In that Google Sheet: **Extensions → Apps Script**. Delete what's there, paste everything from `setup-form.gs`,
   click **Save** (💾), then **Run**. Google asks for permission: **Review permissions** → your account →
   **Advanced** → **Go to (unsafe)** → **Allow**. (It says "unsafe" only because you wrote the script yourself.)
3. A **Start here** tab appears with the form link.
4. **Share** the sheet with family as **Editor**, and set **General access** to **Anyone with the link → Viewer**.
5. Put the sheet's ID in `data/sheet.json` as `{"sheetId": "..."}`. The ID is the long part of the sheet's
   address between `/d/` and `/edit`.

Rows missing a dropdown value are skipped, and the run log says which row. If the sheet can't be read, the job
still sends the day's festivals and uses `data/tithi-data.json` for entries.

## Good to know

- GitHub sometimes starts scheduled jobs up to about 30 minutes late.
- GitHub pauses schedules in repos with no changes for 60 days. The job makes a tiny commit on the 1st of each month to prevent this.
- Green API is a third-party service, not WhatsApp itself. Keep messages to your own family group; WhatsApp can block numbers that send spam. If your phone is offline for a long time, Green API may ask you to scan the QR code again.
- To try a day without sending anything: `node daily.js --date=2026-11-08 --dry-run`
