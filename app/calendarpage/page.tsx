"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CalendarPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/Projectmainpage");
  }, [router]);

  return null;
}