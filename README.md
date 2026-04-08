# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## NBA Update Email Notifications

`scripts/run_nba_update.ps1` can send a Gmail notification after each run. It reads credentials from these environment variables:

- `GMAIL_USER`: the Gmail address that will send and receive the notification
- `GMAIL_APP_PASSWORD`: a Gmail App Password for that account

Set them on Windows PowerShell:

```powershell
[System.Environment]::SetEnvironmentVariable("GMAIL_USER", "yourname@gmail.com", "User")
[System.Environment]::SetEnvironmentVariable("GMAIL_APP_PASSWORD", "your-app-password", "User")
```

Or with `setx` in Command Prompt:

```cmd
setx GMAIL_USER "yourname@gmail.com"
setx GMAIL_APP_PASSWORD "your-app-password"
```

After setting them, restart your terminal or task scheduler session so the new variables are available to PowerShell.

## GitHub Actions Secrets

The reminder workflow in `.github/workflows/prediction-reminder.yml` needs these repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

Set them in GitHub:

1. Open your repository on GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Click `New repository secret`.
4. Add each secret above with its production value.

The workflow runs daily at `14:00 UTC`, which is `17:00` Israel time under the schedule requested here, and can also be triggered manually with `workflow_dispatch`.
