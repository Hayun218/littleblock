"use client";

import { useEffect } from "react";

export default function ViewCounter({ patternId }: { patternId: string }) {
  useEffect(() => {
    const incrementView = async () => {
      try {
        await fetch(`/api/patterns/${patternId}/view`, { method: "POST" });
      } catch (err) {
        console.error("Failed to increment view count:", err);
      }
    };

    incrementView();
  }, [patternId]);

  return null;
}
