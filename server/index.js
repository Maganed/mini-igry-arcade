/**
 * Бэкенд оплаты через ЮKassa.
 *
 * Делает три вещи:
 *  1. POST /api/payments            — создаёт платёж и возвращает ссылку на оплату
 *  2. POST /api/payments/webhook    — принимает уведомления ЮKassa (payment.succeeded)
 *  3. GET  /api/payments/:id        — статус платежа + ключ Premium
 *
 * Деньги идут на счёт, привязанный к твоему магазину в ЮKassa.
 * Секреты — только в переменных окружения (.env), никогда в коде и не в git.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import express from "express"

const PORT = process.env.PORT || 3000
const SHOP_ID = process.env.YOOKASSA_SHOP_ID
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY
const PREMIUM_PRICE_RUB = Number(process.env.PREMIUM_PRICE_RUB || 149)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*"
const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), "data.json")
const YOOKASSA_API = "https://api.yookassa.ru/v3/payments"

// Диапазоны IP ЮKassa для вебхуков (см. документацию ЮKassa, раздел «Уведомления»).
// Если стоит обратный прокси — включи trust proxy и проверяй X-Forwarded-For.
const WEBHOOK_IP_CHECK = process.env.WEBHOOK_IP_CHECK === "true"

if (!SHOP_ID || !SECRET_KEY) {
	console.warn("[warn] Не заданы YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY — создание платежей будет падать с 500.")
}

/* ------------ простое файловое хранилище ------------ */
function readData() {
	try {
		return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
	} catch {
		return { payments: {}, licenses: {} }
	}
}

function writeData(data) {
	fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

/* ------------ вспомогательное ------------ */
function authHeader() {
	return "Basic " + Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64")
}

async function yookassaFetch(url, options = {}) {
	const res = await fetch(url, {
		...options,
		headers: {
			Authorization: authHeader(),
			"Content-Type": "application/json",
			...(options.headers || {}),
		},
	})
	const body = await res.json().catch(() => ({}))
	return { ok: res.ok, status: res.status, body }
}

const app = express()
app.use(express.json({ limit: "64kb" }))

app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
	res.setHeader("Access-Control-Allow-Headers", "Content-Type")
	res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
	if (req.method === "OPTIONS") return res.sendStatus(204)
	next()
})

/* ------------ 1. создание платежа ------------ */
app.post("/api/payments", async (req, res) => {
	if (!SHOP_ID || !SECRET_KEY) {
		return res.status(500).json({ error: "ЮKassa не настроена на сервере" })
	}

	const { kind, amount, returnUrl } = req.body || {}

	if (kind !== "premium" && kind !== "donate") {
		return res.status(400).json({ error: "kind должен быть premium или donate" })
	}

	// Сумма всегда валидируется на сервере — клиенту верить нельзя.
	let rub
	if (kind === "premium") {
		rub = PREMIUM_PRICE_RUB
	} else {
		rub = Number(amount)
		if (!Number.isFinite(rub) || rub < 10 || rub > 100000) {
			return res.status(400).json({ error: "Сумма доната должна быть от 10 до 100000 ₽" })
		}
	}

	const safeReturnUrl =
		typeof returnUrl === "string" && /^https?:\/\//.test(returnUrl)
			? returnUrl
			: process.env.SITE_URL || "https://example.ru/"

	const payload = {
		amount: { value: rub.toFixed(2), currency: "RUB" },
		capture: true,
		confirmation: { type: "redirect", return_url: safeReturnUrl },
		description:
			kind === "premium" ? "Arcade Premium: отключение рекламы" : "Добровольная поддержка проекта Arcade",
		metadata: { kind },
	}

	const { ok, status, body } = await yookassaFetch(YOOKASSA_API, {
		method: "POST",
		headers: { "Idempotence-Key": crypto.randomUUID() },
		body: JSON.stringify(payload),
	})

	if (!ok) {
		console.error("[yookassa] create failed", status, body)
		return res.status(502).json({ error: body.description || "Ошибка ЮKassa" })
	}

	const data = readData()
	data.payments[body.id] = { kind, rub, status: body.status, createdAt: new Date().toISOString() }
	writeData(data)

	res.json({
		paymentId: body.id,
		confirmationUrl: body.confirmation?.confirmation_url,
	})
})

/* ------------ 2. webhook от ЮKassa ------------ */
app.post("/api/payments/webhook", async (req, res) => {
	// ЮKassa не подписывает уведомления, поэтому статус всегда перепроверяем запросом к API.
	const event = req.body || {}
	const paymentId = event?.object?.id
	if (!paymentId) return res.sendStatus(400)

	const { ok, body } = await yookassaFetch(`${YOOKASSA_API}/${encodeURIComponent(paymentId)}`)
	if (!ok) return res.sendStatus(200) // не ретрайим бесконечно

	const data = readData()
	const record = data.payments[paymentId] || {}
	record.status = body.status
	record.paidAmount = body.amount?.value
	record.kind = record.kind || body.metadata?.kind

	if (body.status === "succeeded" && record.kind === "premium" && !record.licenseKey) {
		const licenseKey = crypto.randomBytes(16).toString("hex")
		record.licenseKey = licenseKey
		data.licenses[licenseKey] = { paymentId, issuedAt: new Date().toISOString(), active: true }
	}

	data.payments[paymentId] = record
	writeData(data)
	res.sendStatus(200)
})

/* ------------ 3. статус платежа ------------ */
app.get("/api/payments/:id", async (req, res) => {
	const paymentId = req.params.id
	const { ok, body } = await yookassaFetch(`${YOOKASSA_API}/${encodeURIComponent(paymentId)}`)
	if (!ok) return res.status(404).json({ error: "Платёж не найден" })

	const data = readData()
	const record = data.payments[paymentId] || {}

	// Если webhook ещё не дошёл — выдаём лицензию здесь.
	if (body.status === "succeeded" && (record.kind || body.metadata?.kind) === "premium" && !record.licenseKey) {
		const licenseKey = crypto.randomBytes(16).toString("hex")
		record.licenseKey = licenseKey
		record.kind = "premium"
		data.licenses[licenseKey] = { paymentId, issuedAt: new Date().toISOString(), active: true }
	}

	record.status = body.status
	data.payments[paymentId] = record
	writeData(data)

	res.json({ status: body.status, licenseKey: record.licenseKey || null })
})

/* ------------ проверка Premium ------------ */
app.get("/api/premium/status", (req, res) => {
	const key = String(req.query.key || "")
	const data = readData()
	res.json({ active: Boolean(data.licenses[key]?.active) })
})

app.get("/api/health", (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
	console.log(`Arcade payments API → http://localhost:${PORT}`)
	if (WEBHOOK_IP_CHECK) console.log("WEBHOOK_IP_CHECK включён — настрой проверку IP на уровне прокси/файрволла")
})
