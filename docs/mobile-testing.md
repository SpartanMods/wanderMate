# Mobile Testing

This branch adds an optional Playwright setup and a repeatable way to open WanderMate on a real phone.

## What this branch changes

- Adds `dev:lan` and `start:lan` scripts so the app can bind to your local network.
- Adds a Playwright config and a few mobile smoke tests.
- Adds a `/phone` helper page where you can paste your LAN URL and generate a scannable QR code.
- Does **not** add or upgrade any npm packages in `package.json` or `package-lock.json`.

That last point is intentional. You can merge this branch now and install Playwright later, using whatever current version you want at that time.

## Add Playwright later

When you are ready to install it, run:

```bash
npm install -D @playwright/test
npx playwright install
```

Then run:

```bash
npm run test:e2e
```

## Open WanderMate on your phone

### 1. Start the app on your LAN

From the project root:

```bash
npm install
npm run dev:lan
```

This starts Next.js on `0.0.0.0:3000`, which makes it reachable from other devices on the same Wi-Fi network.

### 2. Find your computer's local IP address

On Windows PowerShell:

```powershell
ipconfig
```

Find the active Wi-Fi adapter and look for `IPv4 Address`. It will usually look like `192.168.x.x` or `10.0.x.x`.

### 3. Open the app on your phone

On your phone, while connected to the same Wi-Fi, open:

```text
http://YOUR-IP:3000
```

Example:

```text
http://192.168.1.42:3000
```

### 3a. Optional QR shortcut

On your computer, open:

```text
http://localhost:3000/phone
```

Paste your LAN URL into the field, then scan the QR code with your phone camera.

### 4. If it does not load

Check these in order:

1. Your phone and computer must be on the same Wi-Fi network.
2. The dev server must be running with `npm run dev:lan`, not plain `npm run dev`.
3. Windows Firewall may prompt for Node.js network access the first time. Allow access on private networks.
4. Some routers block device-to-device traffic. If so, disable AP isolation / client isolation on that network, or test on a different network.

## Use Playwright against the local server

If your local app is already running, Playwright can target it directly:

```bash
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
npm run test:e2e
```

If `PLAYWRIGHT_BASE_URL` is not set, the config will start `npm run dev` automatically.
