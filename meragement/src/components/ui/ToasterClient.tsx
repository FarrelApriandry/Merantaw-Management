// src/components/common/ToasterClient.tsx
"use client";
import type { JSX } from "react";
import { Toaster } from "sonner";

export default function ToasterClient(): JSX.Element {
    return <Toaster richColors position="top-right" />;
}
