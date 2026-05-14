'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readToken, isTokenExpired } from "@/lib/auth";

export default function BootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = readToken();
    if (!token || isTokenExpired(token)) {
      router.replace("/onboarding");
    } else {
      router.replace("/home");
    }
  }, [router]);

  return null;
}
