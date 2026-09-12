"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Link as LinkIcon,
  Type,
  Wifi,
  Mail,
  Phone,
  MessageSquare,
  Contact,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  encodeQrContent,
  type QrContentType,
  type WifiEncryption,
} from "@/lib/qr-encode";

export interface ContentCopy {
  types: Record<QrContentType, string>;
  urlLabel: string;
  urlPlaceholder: string;
  textLabel: string;
  textPlaceholder: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: string;
  wifiHidden: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  phoneLabel: string;
  smsNumber: string;
  smsMessage: string;
  vcFirstName: string;
  vcLastName: string;
  vcPhone: string;
  vcEmail: string;
  vcOrg: string;
  vcTitle: string;
  vcUrl: string;
  sectionTitle: string;
}

const TYPE_ICONS: Record<QrContentType, typeof LinkIcon> = {
  url: LinkIcon,
  text: Type,
  wifi: Wifi,
  email: Mail,
  phone: Phone,
  sms: MessageSquare,
  vcard: Contact,
};

const TYPE_ORDER: QrContentType[] = [
  "url",
  "text",
  "wifi",
  "email",
  "phone",
  "sms",
  "vcard",
];

const field =
  "block text-slate-900 placeholder:text-slate-400 border-slate-300 focus-visible:border-violet-500 focus-visible:ring-violet-500/30";

export function ContentForms({
  copy,
  onDataChange,
}: {
  copy: ContentCopy;
  onDataChange: (data: string) => void;
}) {
  const [type, setType] = useState<QrContentType>("url");
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({
    ssid: "",
    password: "",
    encryption: "WPA" as WifiEncryption,
    hidden: false,
  });
  const [email, setEmail] = useState({ to: "", subject: "", body: "" });
  const [phone, setPhone] = useState("");
  const [sms, setSms] = useState({ number: "", message: "" });
  const [vcard, setVcard] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    org: "",
    title: "",
    url: "",
  });

  const data = useMemo(() => {
    switch (type) {
      case "url":
        return encodeQrContent({ type: "url", url });
      case "text":
        return encodeQrContent({ type: "text", text });
      case "wifi":
        return encodeQrContent({ type: "wifi", ...wifi });
      case "email":
        return encodeQrContent({ type: "email", ...email });
      case "phone":
        return encodeQrContent({ type: "phone", phone });
      case "sms":
        return encodeQrContent({ type: "sms", ...sms });
      case "vcard":
        return encodeQrContent({ type: "vcard", ...vcard });
    }
  }, [type, url, text, wifi, email, phone, sms, vcard]);

  useEffect(() => {
    onDataChange(data);
  }, [data, onDataChange]);

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900 mb-3">
        {copy.sectionTitle}
      </h2>

      {/* Content-type selector */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
        {TYPE_ORDER.map((t) => {
          const Icon = TYPE_ICONS[t];
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {copy.types[t]}
            </button>
          );
        })}
      </div>

      {/* Forms */}
      <div className="space-y-4">
        {type === "url" && (
          <Fieldset label={copy.urlLabel}>
            <Input
              className={field}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={copy.urlPlaceholder}
              inputMode="url"
            />
          </Fieldset>
        )}

        {type === "text" && (
          <Fieldset label={copy.textLabel}>
            <textarea
              className={cn(
                field,
                "min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none resize-y"
              )}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={copy.textPlaceholder}
            />
          </Fieldset>
        )}

        {type === "wifi" && (
          <>
            <Fieldset label={copy.wifiSsid}>
              <Input
                className={field}
                value={wifi.ssid}
                onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                placeholder="MyNetwork"
              />
            </Fieldset>
            <Fieldset label={copy.wifiEncryption}>
              <select
                className={cn(
                  field,
                  "h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
                )}
                value={wifi.encryption}
                onChange={(e) =>
                  setWifi({
                    ...wifi,
                    encryption: e.target.value as WifiEncryption,
                  })
                }
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No password</option>
              </select>
            </Fieldset>
            {wifi.encryption !== "nopass" && (
              <Fieldset label={copy.wifiPassword}>
                <Input
                  className={field}
                  type="text"
                  value={wifi.password}
                  onChange={(e) =>
                    setWifi({ ...wifi, password: e.target.value })
                  }
                  placeholder="••••••••"
                />
              </Fieldset>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 accent-violet-600"
                checked={wifi.hidden}
                onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })}
              />
              {copy.wifiHidden}
            </label>
          </>
        )}

        {type === "email" && (
          <>
            <Fieldset label={copy.emailTo}>
              <Input
                className={field}
                type="email"
                value={email.to}
                onChange={(e) => setEmail({ ...email, to: e.target.value })}
                placeholder="hello@example.com"
              />
            </Fieldset>
            <Fieldset label={copy.emailSubject}>
              <Input
                className={field}
                value={email.subject}
                onChange={(e) => setEmail({ ...email, subject: e.target.value })}
              />
            </Fieldset>
            <Fieldset label={copy.emailBody}>
              <textarea
                className={cn(
                  field,
                  "min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none resize-y"
                )}
                value={email.body}
                onChange={(e) => setEmail({ ...email, body: e.target.value })}
              />
            </Fieldset>
          </>
        )}

        {type === "phone" && (
          <Fieldset label={copy.phoneLabel}>
            <Input
              className={field}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 71 234 5678"
            />
          </Fieldset>
        )}

        {type === "sms" && (
          <>
            <Fieldset label={copy.smsNumber}>
              <Input
                className={field}
                type="tel"
                value={sms.number}
                onChange={(e) => setSms({ ...sms, number: e.target.value })}
                placeholder="+94 71 234 5678"
              />
            </Fieldset>
            <Fieldset label={copy.smsMessage}>
              <textarea
                className={cn(
                  field,
                  "min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none resize-y"
                )}
                value={sms.message}
                onChange={(e) => setSms({ ...sms, message: e.target.value })}
              />
            </Fieldset>
          </>
        )}

        {type === "vcard" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Fieldset label={copy.vcFirstName}>
              <Input
                className={field}
                value={vcard.firstName}
                onChange={(e) =>
                  setVcard({ ...vcard, firstName: e.target.value })
                }
              />
            </Fieldset>
            <Fieldset label={copy.vcLastName}>
              <Input
                className={field}
                value={vcard.lastName}
                onChange={(e) =>
                  setVcard({ ...vcard, lastName: e.target.value })
                }
              />
            </Fieldset>
            <Fieldset label={copy.vcPhone}>
              <Input
                className={field}
                type="tel"
                value={vcard.phone}
                onChange={(e) => setVcard({ ...vcard, phone: e.target.value })}
              />
            </Fieldset>
            <Fieldset label={copy.vcEmail}>
              <Input
                className={field}
                type="email"
                value={vcard.email}
                onChange={(e) => setVcard({ ...vcard, email: e.target.value })}
              />
            </Fieldset>
            <Fieldset label={copy.vcOrg}>
              <Input
                className={field}
                value={vcard.org}
                onChange={(e) => setVcard({ ...vcard, org: e.target.value })}
              />
            </Fieldset>
            <Fieldset label={copy.vcTitle}>
              <Input
                className={field}
                value={vcard.title}
                onChange={(e) => setVcard({ ...vcard, title: e.target.value })}
              />
            </Fieldset>
            <div className="sm:col-span-2">
              <Fieldset label={copy.vcUrl}>
                <Input
                  className={field}
                  inputMode="url"
                  value={vcard.url}
                  onChange={(e) => setVcard({ ...vcard, url: e.target.value })}
                />
              </Fieldset>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Fieldset({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-700">{label}</Label>
      {children}
    </div>
  );
}
