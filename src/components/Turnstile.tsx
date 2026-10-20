"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

type TurnstileProps = {
  onSuccess: (token: string) => void;
  onExpire: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export default function Turnstile({
  onSuccess,
  onExpire,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderTurnstile = () => {
    if (!containerRef.current || !window.turnstile) {
      return;
    }

    if (widgetIdRef.current !== null) {
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      console.error("Turnstile Site Key가 설정되지 않았습니다.");
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,

      callback: (token) => {
        onSuccess(token);
      },

      "expired-callback": () => {
        onExpire();
      },

      "error-callback": () => {
        onExpire();
      },
    });
  };

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderTurnstile}
      />

      <div ref={containerRef} />
    </>
  );
}