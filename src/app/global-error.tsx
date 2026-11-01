"use client";

// Last-resort boundary for errors in the root layout itself. It replaces the whole document,
// so it can't rely on the app's stylesheet.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7fa", fontFamily: "system-ui, sans-serif", color: "#0f1b2d" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>CareerOS couldn&apos;t load</h1>
          <p style={{ color: "#5d6c80" }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 12, height: 40, padding: "0 18px", border: 0, borderRadius: 3, background: "#13315c", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
