"use client";

import { useEffect, useRef, useState } from "react";

const text = "Prestige in Every Order. Control in Every Moment.";

export default function TypewriterHeading() {
  const [value, setValue] = useState("");
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      audioRef.current = new AudioContext();
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    let i = 0;
    const timer = window.setInterval(() => {
      setValue(text.slice(0, i + 1));

      const ctx = audioRef.current;
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 900 + Math.random() * 180;
        gain.gain.value = 0.018;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.025);
      }

      i++;
      if (i >= text.length) window.clearInterval(timer);
    }, 115);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const parts = value.split(/(Prestige|Control)/g);

  return (
    <h1
      className="max-w-[760px] -skew-x-[2deg] text-[clamp(3.05rem,4.15vw,4.7rem)] font-medium italic leading-[.94] tracking-[-0.045em]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {parts.map((part, i) =>
        part === "Prestige" || part === "Control" ? (
          <span key={i} className="text-[#D9B86A]">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </h1>
  );
}