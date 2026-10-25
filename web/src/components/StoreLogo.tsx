// Logo toko — gambar unggahan (Pengaturan) kalau ada, fallback ikun Soup
"use client";

import { Soup } from "lucide-react";
import { assetUrl } from "@/lib/api";
import { useStoreName } from "@/lib/store";

export default function StoreLogo({
  size = "size-10",
  icon = "size-5",
  rounded = "rounded-xl",
  glow = false,
}: {
  size?: string;
  icon?: string;
  rounded?: string;
  glow?: boolean;
}) {
  const { logo_url } = useStoreName();
  const url = assetUrl(logo_url);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${size} ${rounded} bg-gradient-to-b from-amber-400 to-amber-500 ${
        glow ? "login-glow" : "shadow-md shadow-amber-500/25"
      }`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Logo toko" className="size-full object-cover" />
      ) : (
        <Soup className={`${icon} text-white`} />
      )}
    </div>
  );
}
