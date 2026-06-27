"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDictionary } from "@/lib/i18n/dictionary-context";

// Stripe Checkout requires http(s) return URLs, so mobile checkouts land
// here and get bounced to the app's deep link (the in-app browser closes
// when it sees the helavoiceapp:// scheme).

function PaymentCompleteInner() {
  const searchParams = useSearchParams();
  const dict = useDictionary();
  const status = searchParams.get("status") === "cancelled" ? "cancelled" : "success";
  const sessionId = searchParams.get("session_id");
  const deepLink = `helavoiceapp://payment-${status}`;
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "cancelled" || !sessionId) return;
    let stale = false;
    fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`)
      .then(
        (res) =>
          res.json() as Promise<{ errorKey?: string; errorCode?: string; message?: string }>
      )
      .then((data) => {
        if (stale || !data.errorKey) return;
        const stripeErrors = dict.stripeErrors as Record<string, string> | undefined;
        const message = stripeErrors?.[data.errorKey] || data.message;
        if (!message) return;
        const codeNote =
          data.errorCode && stripeErrors?.errorCode
            ? ` (${stripeErrors.errorCode.replace("{code}", data.errorCode)})`
            : "";
        setFailureMessage(`${message}${codeNote}`);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionId]);

  useEffect(() => {
    // Give the customer time to read why the payment failed before the
    // deep link closes the in-app browser.
    if (status === "cancelled" && sessionId) {
      const timer = setTimeout(() => {
        window.location.href = deepLink;
      }, 8000);
      return () => clearTimeout(timer);
    }
    window.location.href = deepLink;
  }, [deepLink, status, sessionId]);

  return (
    <main className="min-h-screen bg-[#faf8ff] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-sans text-lg font-medium text-[#111c2d] mb-4">
          {status === "success" ? "Payment complete!" : "Payment not completed."}
        </p>
        {failureMessage && (
          <p className="font-sans text-sm font-medium text-[#b91c1c] mb-4">
            {failureMessage}
          </p>
        )}
        <p className="font-sans text-sm text-[#4a4452] mb-6">
          Returning to the HelaVoice app…
        </p>
        <a
          href={deepLink}
          className="font-sans text-sm font-medium text-[#5d48cf] underline"
        >
          Tap here if the app does not open automatically
        </a>
      </div>
    </main>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={null}>
      <PaymentCompleteInner />
    </Suspense>
  );
}
