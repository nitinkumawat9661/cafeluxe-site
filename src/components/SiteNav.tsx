"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BookDemoForm from "@/components/BookDemoForm";

const links = [
  ["Home", "/"],
  ["Features", "/features"],
  ["Download", "/app"],
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <nav ref={navRef} className="relative z-50 flex h-14 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 font-serif text-3xl text-[#D9B86A]">
          CafeLuxe
        </Link>

        <div className="hidden items-center gap-5 text-sm text-[#D8CFBE] xl:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="transition hover:text-[#D9B86A]">
              {label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-site-nav"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-[#D9B86A]/45 px-4 py-2 text-sm font-bold text-[#E7D3A1] xl:hidden"
        >
          Menu
        </button>

        {open && (
          <div id="mobile-site-nav" className="absolute left-0 right-0 top-16 rounded-[1.5rem] border border-[#D9B86A]/25 bg-black/95 p-4 shadow-2xl backdrop-blur-xl xl:hidden">
            <div className="grid gap-3">
              {links.map(([label, href]) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl border border-[#D9B86A]/15 px-4 py-3 text-[#D8CFBE]">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="fixed bottom-6 right-0 z-[80]">
        <div className="cafeluxe-floating-cta rounded-l-2xl border-y border-l border-[#D9B86A]/45 bg-black/85 p-2 shadow-[0_18px_60px_rgba(217,184,106,.25)] backdrop-blur-xl">
          <BookDemoForm />
        </div>
      </div>
    </>
  );
}
