"use client";

/** Last-resort boundary: renders when the root layout itself fails, so it supplies its own <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "6rem 1rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Indian Rounds is temporarily unavailable</h1>
        <p style={{ color: "#4b5563" }}>Please try again in a moment.</p>
        {error.digest && <p style={{ color: "#4b5563", fontSize: "0.75rem" }}>Reference: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.75rem 1.5rem", borderRadius: "9999px", border: 0, background: "#cc0a00", color: "#fff", fontWeight: 600 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
