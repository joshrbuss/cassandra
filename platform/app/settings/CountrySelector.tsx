"use client";

import { useState } from "react";
import { countryToFlag } from "@/lib/countryFlag";

const COUNTRIES = [
  { code: "", label: "Not set" },
  { code: "AF", label: "Afghanistan" },
  { code: "AL", label: "Albania" },
  { code: "DZ", label: "Algeria" },
  { code: "AR", label: "Argentina" },
  { code: "AM", label: "Armenia" },
  { code: "AU", label: "Australia" },
  { code: "AT", label: "Austria" },
  { code: "AZ", label: "Azerbaijan" },
  { code: "BD", label: "Bangladesh" },
  { code: "BY", label: "Belarus" },
  { code: "BE", label: "Belgium" },
  { code: "BR", label: "Brazil" },
  { code: "BG", label: "Bulgaria" },
  { code: "CA", label: "Canada" },
  { code: "CL", label: "Chile" },
  { code: "CN", label: "China" },
  { code: "CO", label: "Colombia" },
  { code: "HR", label: "Croatia" },
  { code: "CZ", label: "Czech Republic" },
  { code: "DK", label: "Denmark" },
  { code: "EG", label: "Egypt" },
  { code: "EE", label: "Estonia" },
  { code: "FI", label: "Finland" },
  { code: "FR", label: "France" },
  { code: "GE", label: "Georgia" },
  { code: "DE", label: "Germany" },
  { code: "GR", label: "Greece" },
  { code: "HU", label: "Hungary" },
  { code: "IS", label: "Iceland" },
  { code: "IN", label: "India" },
  { code: "ID", label: "Indonesia" },
  { code: "IR", label: "Iran" },
  { code: "IQ", label: "Iraq" },
  { code: "IE", label: "Ireland" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "KE", label: "Kenya" },
  { code: "KR", label: "South Korea" },
  { code: "LV", label: "Latvia" },
  { code: "LT", label: "Lithuania" },
  { code: "MY", label: "Malaysia" },
  { code: "MX", label: "Mexico" },
  { code: "MA", label: "Morocco" },
  { code: "NL", label: "Netherlands" },
  { code: "NZ", label: "New Zealand" },
  { code: "NG", label: "Nigeria" },
  { code: "NO", label: "Norway" },
  { code: "PK", label: "Pakistan" },
  { code: "PE", label: "Peru" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "RO", label: "Romania" },
  { code: "RU", label: "Russia" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "RS", label: "Serbia" },
  { code: "SG", label: "Singapore" },
  { code: "SK", label: "Slovakia" },
  { code: "SI", label: "Slovenia" },
  { code: "ZA", label: "South Africa" },
  { code: "ES", label: "Spain" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "TH", label: "Thailand" },
  { code: "TR", label: "Turkey" },
  { code: "UA", label: "Ukraine" },
  { code: "AE", label: "UAE" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "UZ", label: "Uzbekistan" },
  { code: "VE", label: "Venezuela" },
  { code: "VN", label: "Vietnam" },
];

interface CountrySelectorProps {
  initialCountry: string | null;
}

export default function CountrySelector({ initialCountry }: CountrySelectorProps) {
  const [country, setCountry] = useState(initialCountry ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(value: string) {
    setCountry(value);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/users/me/country", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: value || null }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silently ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Country</h2>
      <p className="text-xs text-gray-500 mb-3">
        Your flag appears next to your name on leaderboards.
      </p>
      <div className="flex items-center gap-3">
        {country && <span className="text-xl">{countryToFlag(country)}</span>}
        <select
          value={country}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code ? `${countryToFlag(c.code)} ${c.label}` : c.label}
            </option>
          ))}
        </select>
        {saved && <span className="text-xs text-green-600 font-medium">Saved</span>}
      </div>
    </div>
  );
}
