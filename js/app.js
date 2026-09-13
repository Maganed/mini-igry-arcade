/* Навигация, реклама и оплата через ЮKassa. */
(function () {
	"use strict"

	const cfg = window.APP_CONFIG || {}
	const api = (path) => (cfg.apiBase || "") + path
	const statusEl = document.getElementById("payStatus")

	document.getElementById("year").textContent = new Date().getFullYear()

	/* --- Табы --- */
	document.getElementById("tabs").addEventListener("click", (e) => {
		const tab = e.target.closest(".tab")
		if (!tab) return
		document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t === tab))
		document.querySelectorAll(".view").forEach((v) => {
			v.classList.toggle("is-active", v.id === "view-" + tab.dataset.view)
		})
	})

	/* --- Premium (без рекламы) --- */
	function isPremium() {
		return localStorage.getItem("premium:key") !== null
	}

	async function verifyPremium() {
		const key = localStorage.getItem("premium:key")
		if (!key) return false
		try {
			const res = await fetch(api("/api/premium/status?key=" + encodeURIComponent(key)))
			if (!res.ok) return true // сервер недоступен — не отбираем купленное
			const data = await res.json()
			if (!data.active) localStorage.removeItem("premium:key")
			return Boolean(data.active)
		} catch (e) {
			return true
		}
	}

	/* --- Реклама --- */
	function renderAds() {
		const slots = [
			{ el: document.getElementById("ad-top"), blockId: (cfg.ads || {}).blockIdTop },
			{ el: document.getElementById("ad-bottom"), blockId: (cfg.ads || {}).blockIdBottom },
		]

		if (isPremium()) {
			slots.forEach((s) => s.el && s.el.classList.add("is-hidden"))
			return
		}

		const provider = (cfg.ads || {}).provider
		const hasIds = slots.some((s) => s.blockId)

		if (provider !== "yandex" || !hasIds) {
			slots.forEach((s) => {
				if (s.el) s.el.textContent = "Место под рекламный блок (укажи ID блока РСЯ в config.js)"
			})
			return
		}

		// Загружаем Yandex Ads SDK один раз
		window.yaContextCb = window.yaContextCb || []
		if (!document.getElementById("ya-ads-sdk")) {
			const script = document.createElement("script")
			script.id = "ya-ads-sdk"
			script.src = "https://yandex.ru/ads/system/context.js"
			script.async = true
			document.head.appendChild(script)
		}

		slots.forEach((slot, i) => {
			if (!slot.el || !slot.blockId) return
			const containerId = "yandex_rtb_" + i
			slot.el.innerHTML = '<div id="' + containerId + '"></div>'
			slot.el.classList.add("is-filled")
			window.yaContextCb.push(function () {
				window.Ya.Context.AdvManager.render({
					blockId: slot.blockId,
					renderTo: containerId,
				})
			})
		})
	}

	/* --- Оплата --- */
	async function createPayment(kind, amount) {
		statusEl.textContent = "Создаём платёж..."
		try {
			const res = await fetch(api("/api/payments"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					kind: kind, // "premium" | "donate"
					amount: amount, // рубли, только для donate
					returnUrl: location.origin + location.pathname,
				}),
			})
			const data = await res.json()
			if (!res.ok || !data.confirmationUrl) {
				statusEl.textContent = "Не удалось создать платёж: " + (data.error || res.status)
				return
			}
			if (data.paymentId) localStorage.setItem("payment:last", data.paymentId)
			location.href = data.confirmationUrl
		} catch (e) {
			statusEl.textContent = "Бэкенд оплаты недоступен. Запусти server/ и укажи apiBase в config.js."
		}
	}

	document.getElementById("premiumBtn").addEventListener("click", () => {
		createPayment("premium")
	})

	document.querySelectorAll("[data-donate]").forEach((btn) => {
		btn.addEventListener("click", () => createPayment("donate", Number(btn.dataset.donate)))
	})

	/* --- Возврат с оплаты: проверяем статус --- */
	async function checkReturnedPayment() {
		const paymentId = localStorage.getItem("payment:last")
		if (!paymentId) return
		try {
			const res = await fetch(api("/api/payments/" + encodeURIComponent(paymentId)))
			if (!res.ok) return
			const data = await res.json()
			if (data.status === "succeeded") {
				localStorage.removeItem("payment:last")
				if (data.licenseKey) {
					localStorage.setItem("premium:key", data.licenseKey)
					document.getElementById("premiumBtn").classList.add("is-hidden")
					statusEl.textContent = "Оплата прошла — реклама отключена. Спасибо!"
					renderAds()
				} else {
					statusEl.textContent = "Платёж получен. Спасибо за поддержку!"
				}
			} else if (data.status === "canceled") {
				localStorage.removeItem("payment:last")
				statusEl.textContent = "Платёж отменён."
			}
		} catch (e) {}
	}

	/* --- Старт --- */
	window.Games.initSnake()
	window.Games.initReaction()
	window.Games.initMemory()

	verifyPremium().then((active) => {
		if (active) document.getElementById("premiumBtn").classList.add("is-hidden")
		renderAds()
		checkReturnedPayment()
	})
})()
