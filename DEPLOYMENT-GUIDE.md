# Publish StudyFlow for everyone

StudyFlow uses two services:

- **GitHub** stores and versions the source code.
- **Vercel** hosts the public Next.js app and gives you a shareable link.
- **Supabase** continues to provide accounts and private user data.

Normal users do not need the source ZIP. They open your Vercel link, create an account, and can install StudyFlow from `/install`.

## A. Upload to GitHub

The easiest option on Windows is to double-click:

```text
PUBLISH-STUDYFLOW-TO-GITHUB.bat
```

It initializes Git, creates the first commit, and helps push to:

```text
https://github.com/Darksiam-guff/studyflow
```

The launcher uses GitHub CLI when available. Otherwise it opens GitHub so you can create one empty repository, then it pushes the code with Git.

Never upload `.env.local`, `.env.production`, a service-role key, or any `sb_secret_...` key. The included `.gitignore` blocks these files.

## B. Deploy from GitHub to Vercel

1. Sign in to Vercel with GitHub.
2. Click **Add New → Project**.
3. Import `Darksiam-guff/studyflow`.
4. Keep the detected framework as **Next.js**.
5. Add these environment variables for Production, Preview, and Development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xuubragcavogbjlwsiia.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SB_PUBLISHABLE_KEY
```

Do not add a secret or service-role key.

6. Click **Deploy**.
7. Copy the final Vercel URL, for example:

```text
https://studyflow-example.vercel.app
```

## C. Allow the production URL in Supabase

Open Supabase → Authentication → URL Configuration.

Set the production URL as **Site URL**:

```text
https://YOUR-FINAL-VERCEL-DOMAIN
```

Add these Redirect URLs:

```text
https://YOUR-FINAL-VERCEL-DOMAIN/auth/callback
https://YOUR-FINAL-VERCEL-DOMAIN/reset-password
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

Keep the localhost URLs so local development still works.

## D. Test before sharing

1. Open the public Vercel URL in a private/incognito browser window.
2. Register a new account and verify the email.
3. Create a task, note, course, study session, and finance entry.
4. Refresh and confirm the records remain.
5. Create a second account and verify it cannot see the first account's records.
6. Open `/install` and install the app on a phone or computer.

## E. Share with users

Share only the public Vercel URL. Users can:

- create individual accounts;
- use StudyFlow in any modern browser;
- visit `/install` to add it to their device;
- receive updates automatically whenever you push changes to the GitHub `main` branch.
