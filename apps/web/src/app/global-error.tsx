"use client";

/**
 * Last-resort error boundary that fires when even the root layout throws.
 *
 * This component renders its own `<html>` / `<body>` because Next can no
 * longer rely on the broken layout. Keep it dependency-free — no Tailwind
 * classes, no shared providers — so it always renders even if the rest of
 * the app's import graph is failing.
 */
interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
          background: "#fafaf7",
          color: "#171717",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "32rem" }}>
            <p
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#b88a2c",
              }}
            >
              Critical error
            </p>
            <h1 style={{ marginTop: "0.5rem", fontSize: "2rem" }}>
              The site is temporarily unavailable.
            </h1>
            <p style={{ marginTop: "0.75rem", color: "#525252" }}>
              We&apos;ve been notified. Please retry in a moment.
            </p>
            {error.digest ? (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.75rem",
                  color: "#737373",
                }}
              >
                Reference: <code>{error.digest}</code>
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                padding: "0.6rem 1.25rem",
                background: "#f0c14b",
                border: "none",
                borderRadius: "9999px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
