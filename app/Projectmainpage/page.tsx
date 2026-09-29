"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectMainPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mainpage");
  }, [router]);

  return null;
}
