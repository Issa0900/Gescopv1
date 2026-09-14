import React from "react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

export const GESCOP_LOGO_URL = "https://media.base44.com/images/public/6aa428eadfaf8d99d50d10b7/d652274d2_GESCOP_Logo.png";

export default function BrandLogo({ className, alt = "Logo GESCOP" }) {
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-xl bg-white", className)}>
      <Image
        src={GESCOP_LOGO_URL}
        alt={alt}
        fittingType="fit"
        className="h-full w-full"
      />
    </div>
  );
}