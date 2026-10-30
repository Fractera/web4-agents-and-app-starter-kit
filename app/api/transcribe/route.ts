// @api turn a recorded voice fragment into written text
import { NextRequest, NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/require-roles"
import { PROTECTED_GROUP_ROLES } from "@/lib/roles"
import { openAiKey } from "@/lib/openai-key"
import { isBornElement } from "@/lib/web4-items/element-delete"
import { transcribeAudio } from "@/_tools/voice-input/server/transcribe"

// Дверь расшифровки речи для приложения.
//
// ТОНКАЯ ОБЁРТКА над серверной половиной инструмента: проверяет входящего,
// подставляет ключ и отдаёт результат. Вся работа с моделью живёт в инструменте —
// повторить её здесь значило бы завести вторую реализацию того же.
//
// 🔒 РОЛЬ ПРОВЕРЯЕТСЯ. Расшифровка стоит денег: открытая дверь превращается в
// чужой бесплатный сервис распознавания речи, оплаченный владельцем проекта.
// Роли те же, что у страниц, откуда голос вызывают.
//
// Ключ подставляется В ПАМЯТИ на время вызова: инструмент читает его из
// окружения процесса, а писать туда навсегда нельзя — оставленный ключ пережил
// бы своё удаление из настроек.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const denied = await requireRoles(req, PROTECTED_GROUP_ROLES.staff)
  if (denied) return denied

  // 336-3: `?item=<id>` — работа над элементом: ключ ядра, нет — ключ элемента (слово владельца 2026-09-29).
  const item = req.nextUrl.searchParams.get("item")
  const key = openAiKey(item && isBornElement(item) ? item : null)
  if (!key) {
    // Отдельный код, а не общая ошибка: клиент по нему показывает подсказку,
    // где ключ добавить, вместо «что-то пошло не так».
    // 🛑 336: клиент читает `reason`, а здесь стояло только `error` — вместо «нет ключа» человек видел «не удалось».
    return NextResponse.json({ ok: false, error: "no-key", reason: "no-key" }, { status: 503 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get("audio") ?? form?.get("file")
  // 617: голосовое из Telegram главному агенту — язык человека (`npm run transcribe`); голосовые поля страниц его не шлют.
  const language = form?.get("language")

  const had = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = key
  try {
    const result = await transcribeAudio(file, typeof language === "string" ? language.toLowerCase().slice(0, 2) : undefined)
    return NextResponse.json(result, { status: result.ok ? 200 : (result.status || 500) })
  } finally {
    if (had === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = had
  }
}
