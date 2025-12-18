// app/api/whatsapp/confirm/route.ts
import { NextResponse } from "next/server";

type Body = {
  phone?: string;          // número do prestador (destino) no formato internacional, ex: 5511999999999
  apptId?: string;
  companyName?: string;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  startsAt?: string;       // ISO string
  priceCents?: number | null;
};

function formatBRLFromCents(cents: number) {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeIntlPhone(phone: string) {
  // mantém apenas dígitos
  return phone.replace(/\D/g, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // Pode vir do body OU do .env (recomendado)
    const envPhone = safeStr(process.env.CALLMEBOT_WHATSAPP_PHONE);
    const envApiKey = safeStr(process.env.CALLMEBOT_WHATSAPP_APIKEY);

    const phone = normalizeIntlPhone(safeStr(body.phone || envPhone));
    const apikey = envApiKey;

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "Faltou o telefone do WhatsApp (CALLMEBOT_WHATSAPP_PHONE ou body.phone)." },
        { status: 400 }
      );
    }

    if (!apikey) {
      return NextResponse.json(
        { ok: false, error: "Faltou a CALLMEBOT_WHATSAPP_APIKEY no .env." },
        { status: 400 }
      );
    }

    const companyName = safeStr(body.companyName) || "Sua empresa";
    const clientName = safeStr(body.clientName) || "Cliente";
    const clientPhone = safeStr(body.clientPhone) || "—";
    const serviceName = safeStr(body.serviceName) || "Serviço";
    const apptId = safeStr(body.apptId) || "";
    const startsAt = safeStr(body.startsAt);

    let when = "—";
    if (startsAt) {
      const d = new Date(startsAt);
      if (!Number.isNaN(d.getTime())) {
        when = d.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    const priceCents = typeof body.priceCents === "number" ? body.priceCents : null;
    const priceText = priceCents != null ? formatBRLFromCents(priceCents) : "—";

    // Monte a mensagem (simples e clara)
    const textLines = [
      `📅 *Novo agendamento*`,
      ``,
      `🏢 *Empresa:* ${companyName}`,
      `💇 *Serviço:* ${serviceName}`,
      `🕒 *Quando:* ${when}`,
      `👤 *Cliente:* ${clientName}`,
      `📱 *WhatsApp:* ${clientPhone}`,
      `💰 *Valor:* ${priceText}`,
      apptId ? `🧾 *ID:* ${apptId}` : "",
    ].filter(Boolean);

    const text = textLines.join("\n");

    // CallMeBot endpoint (GET)
    const url =
      `https://api.callmebot.com/whatsapp.php` +
      `?phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(text)}` +
      `&apikey=${encodeURIComponent(apikey)}`;

    const res = await fetch(url, { method: "GET" });
    const data = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "CallMeBot retornou erro.",
          status: res.status,
          response: data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, response: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro desconhecido no endpoint." },
      { status: 500 }
    );
  }
}
