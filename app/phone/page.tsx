"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/Button";

const DEFAULT_URL = "http://192.168.1.42:3000";

export default function PhoneHelperPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [copied, setCopied] = useState(false);

  const qrUrl = useMemo(() => {
    const encoded = encodeURIComponent(url.trim());
    return `https://quickchart.io/qr?size=280&text=${encoded}`;
  }, [url]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-sand-50">
          Phone testing helper
        </h1>
        <p className="mt-2 max-w-2xl text-sand-200/80">
          Paste your local network URL, then scan the QR code from your phone.
          This is only for local testing on the same Wi-Fi network.
        </p>
      </div>

      <section className="card grid gap-6 p-5 sm:p-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="phone-url"
              className="mb-2 block text-sm font-semibold text-sand-100"
            >
              Local URL
            </label>
            <input
              id="phone-url"
              className="input-base"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.42:3000"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={copyUrl}
              className="rounded-xl border border-moss-500 bg-moss-600/20 px-4 py-2.5 text-sm font-semibold text-sand-50 transition hover:bg-moss-600/30"
            >
              {copied ? "Copied" : "Copy URL"}
            </button>
            <ButtonLink href="/planner" variant="ghost">
              Open planner
            </ButtonLink>
          </div>

          <div className="rounded-2xl border border-basecamp-700 bg-basecamp-950/70 p-4 text-sm text-sand-200/75">
            <p>Use `npm run dev:lan` before scanning.</p>
            <p className="mt-2">
              Find your machine IP with `ipconfig`, then replace the example IP
              above with your real one.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-basecamp-700 bg-basecamp-950/60 p-5">
          <Image
            src={qrUrl}
            alt="QR code for opening WanderMate on your phone"
            width={224}
            height={224}
            unoptimized
            className="rounded-2xl bg-white p-3"
          />
          <p className="text-center text-xs text-basecamp-500">
            Scan with your phone camera. If the QR does not load, open the URL
            manually.
          </p>
        </div>
      </section>
    </div>
  );
}
