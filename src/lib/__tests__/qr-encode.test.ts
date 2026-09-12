import { describe, it, expect } from "vitest";
import {
  encodeUrl,
  encodeText,
  encodeWifi,
  encodeEmail,
  encodePhone,
  encodeSms,
  encodeVCard,
  encodeQrContent,
} from "../qr-encode";

describe("encodeUrl", () => {
  it("prepends https:// when no scheme is present", () => {
    expect(encodeUrl("helavoice.lk")).toBe("https://helavoice.lk");
  });

  it("keeps an existing http/https scheme", () => {
    expect(encodeUrl("http://example.com")).toBe("http://example.com");
    expect(encodeUrl("https://example.com")).toBe("https://example.com");
  });

  it("keeps other schemes untouched", () => {
    expect(encodeUrl("mailto:hi@helavoice.lk")).toBe("mailto:hi@helavoice.lk");
  });

  it("trims surrounding whitespace", () => {
    expect(encodeUrl("  helavoice.lk  ")).toBe("https://helavoice.lk");
  });

  it("returns empty string for empty input", () => {
    expect(encodeUrl("")).toBe("");
    expect(encodeUrl("   ")).toBe("");
  });
});

describe("encodeText", () => {
  it("returns the text as-is", () => {
    expect(encodeText("hello world")).toBe("hello world");
  });
});

describe("encodeWifi", () => {
  it("builds a WPA network string", () => {
    expect(
      encodeWifi({ ssid: "MyNet", password: "secret", encryption: "WPA" })
    ).toBe("WIFI:T:WPA;S:MyNet;P:secret;;");
  });

  it("omits the password field for an open network", () => {
    expect(
      encodeWifi({ ssid: "Cafe", password: "", encryption: "nopass" })
    ).toBe("WIFI:T:nopass;S:Cafe;;");
  });

  it("marks hidden networks with H:true", () => {
    expect(
      encodeWifi({
        ssid: "Hidden",
        password: "pw",
        encryption: "WPA",
        hidden: true,
      })
    ).toBe("WIFI:T:WPA;S:Hidden;P:pw;H:true;;");
  });

  it("escapes special characters in ssid and password", () => {
    expect(
      encodeWifi({
        ssid: "My;Net,work",
        password: 'pa"ss:\\word',
        encryption: "WPA",
      })
    ).toBe('WIFI:T:WPA;S:My\\;Net\\,work;P:pa\\"ss\\:\\\\word;;');
  });
});

describe("encodeEmail", () => {
  it("builds a bare mailto for just an address", () => {
    expect(encodeEmail({ to: "hi@helavoice.lk" })).toBe(
      "mailto:hi@helavoice.lk"
    );
  });

  it("appends encoded subject and body", () => {
    expect(
      encodeEmail({
        to: "hi@helavoice.lk",
        subject: "Hello there",
        body: "a & b",
      })
    ).toBe("mailto:hi@helavoice.lk?subject=Hello%20there&body=a%20%26%20b");
  });
});

describe("encodePhone", () => {
  it("builds a tel: URI and strips spaces", () => {
    expect(encodePhone("+94 71 234 5678")).toBe("tel:+94712345678");
  });
});

describe("encodeSms", () => {
  it("builds an SMSTO string", () => {
    expect(encodeSms({ number: "+94712345678", message: "hi there" })).toBe(
      "SMSTO:+94712345678:hi there"
    );
  });

  it("omits the trailing colon when there is no message", () => {
    expect(encodeSms({ number: "+94712345678" })).toBe("SMSTO:+94712345678");
  });
});

describe("encodeVCard", () => {
  it("builds a vCard 3.0 block with the provided fields", () => {
    const out = encodeVCard({
      firstName: "Chamara",
      lastName: "Perera",
      phone: "+94712345678",
      email: "chamara@helavoice.lk",
      org: "HelaVoice",
      title: "Founder",
      url: "https://helavoice.lk",
    });
    expect(out).toContain("BEGIN:VCARD");
    expect(out).toContain("VERSION:3.0");
    expect(out).toContain("N:Perera;Chamara");
    expect(out).toContain("FN:Chamara Perera");
    expect(out).toContain("TEL;TYPE=CELL:+94712345678");
    expect(out).toContain("EMAIL:chamara@helavoice.lk");
    expect(out).toContain("ORG:HelaVoice");
    expect(out).toContain("TITLE:Founder");
    expect(out).toContain("URL:https://helavoice.lk");
    expect(out.trim().endsWith("END:VCARD")).toBe(true);
  });

  it("skips empty optional fields", () => {
    const out = encodeVCard({ firstName: "Solo" });
    expect(out).toContain("FN:Solo");
    expect(out).not.toContain("TEL");
    expect(out).not.toContain("EMAIL");
    expect(out).not.toContain("ORG");
  });
});

describe("encodeQrContent", () => {
  it("dispatches to the right encoder by type", () => {
    expect(encodeQrContent({ type: "url", url: "helavoice.lk" })).toBe(
      "https://helavoice.lk"
    );
    expect(encodeQrContent({ type: "text", text: "hi" })).toBe("hi");
    expect(encodeQrContent({ type: "phone", phone: "0712345678" })).toBe(
      "tel:0712345678"
    );
  });

  it("returns empty string for an unfilled form", () => {
    expect(encodeQrContent({ type: "url", url: "" })).toBe("");
  });
});
