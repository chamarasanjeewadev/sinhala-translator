"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";
import { localePath } from "@/lib/i18n/utils";
import type { ComponentProps } from "react";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale();
  return <Link href={localePath(href, locale)} {...props} />;
}
