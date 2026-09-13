/* Оболочка: каталог игр, роутинг, звук, реклама и оплата. */
;(function () {
	"use strict"
	var CFG = window.APP_CONFIG || {}
	var S = window.SFX
	var ORDER = ["shooter", "racing", "farm", "tetris", "g2048", "snake", "memory", "reaction"]
	var BEST = {
		shooter: { key: "arcade:shooter:best", label: "Рекорд" },
		racing: { key: "arcade:racing:best", label: "Рекорд" },
		farm: { key: "arcade:farm:best", label: "Заработано" },
		tetris: { key: "arcade:tetris:best", label: "Рекорд" },
		g2048: { key: "arcade:2048:best", label: "Рекорд" },
		snake: { key: "arcade:snake:best", label: "Рекорд" },
		memory: { key: "arcade:memory:best", label: "Лучшее" },
		reaction: { key: "arcade:reaction:best", label: "Лучшее" },
	}

	var gridEl = document.getElementById("gameGrid")
	var homeEl = document.getElementById("home")
	var viewEl = document.getElementById("gameView")
	var mountEl = document.getElementById("gameMount")
	var titleEl = document.getElementById("gameTitle")
	var backBtn = document.getElementById("backBtn")
	var yearEl = document.getElementById("year")
	var soundBtn = document.getElementById("soundBtn")
	var soundLabel = document.getElementById("soundLabel")
	var cleanup = null

	if (yearEl) yearEl.textContent = String(new Date().getFullYear())

	function syncSound() {
		if (!soundBtn) return
		var on = S.enabled
		soundBtn.setAttribute("aria-pressed", on ? "true" : "false")
		soundBtn.classList.toggle("is-off", !on)
		if (soundLabel) soundLabel.textContent = on ? "Звук" : "Без звука"
	}
	if (soundBtn) {
		soundBtn.addEventListener("click", function () {
			S.unlock()
			S.toggle()
			syncSound()
			if (S.enabled) S.click()
		})
		syncSound()
	}
	document.addEventListener(
		"pointerdown",
		function () {
			S.unlock()
		},
		{ once: true },
	)

	function bestText(id) {
		var b = BEST[id]
		if (!b) return "Ещё не играли"
		var v = Number(localStorage.getItem(b.key) || 0)
		if (!v) return "Ещё не играли"
		return b.label + ": " + v
	}

	function renderGrid() {
		if (!gridEl) return
		gridEl.innerHTML = ""
		ORDER.forEach(function (id) {
			var g = window.GAMES[id]
			if (!g) return
			var a = document.createElement("a")
			a.className = "game-card"
			a.href = "#play/" + id
			a.innerHTML =
				'<span class="game-card-art" aria-hidden="true">' +
				g.art +
				"</span>" +
				'<span class="game-card-body">' +
				'<span class="game-card-head"><span class="game-card-title">' +
				g.title +
				"</span>" +
				(g.tag ? '<span class="tag">' + g.tag + "</span>" : "") +
				"</span>" +
				'<span class="game-card-text">' +
				g.tagline +
				"</span>" +
				'<span class="game-card-meta"><span>' +
				g.meta +
				"</span><span>" +
				bestText(id) +
				"</span></span></span>"
			a.addEventListener("click", function () {
				S.unlock()
				S.click()
			})
			gridEl.appendChild(a)
		})
	}

	function closeGame() {
		if (cleanup) {
			try {
				cleanup()
			} catch (e) {}
			cleanup = null
		}
		if (mountEl) mountEl.innerHTML = ""
	}

	function openGame(id) {
		var g = window.GAMES[id]
		if (!g) return showHome()
		closeGame()
		homeEl.hidden = true
		viewEl.hidden = false
		titleEl.textContent = g.title
		document.title = g.title + " — Arcade"
		cleanup = g.mount(mountEl) || null
		window.scrollTo(0, 0)
	}

	function showHome() {
		closeGame()
		viewEl.hidden = true
		homeEl.hidden = false
		document.title = "Arcade — премиальные мини-игры"
		renderGrid()
	}

	function route() {
		var m = (location.hash || "").match(/^#play\/([a-z0-9]+)$/i)
		if (m) openGame(m[1])
		else showHome()
	}

	if (backBtn)
		backBtn.addEventListener("click", function () {
			S.click()
			if (location.hash) location.hash = ""
			else showHome()
		})
	window.addEventListener("hashchange", route)

	function initAds() {
		var ads = CFG.ads || {}
		var slots = document.querySelectorAll("[data-ad-slot]")
		var any = false
		slots.forEach(function (slot) {
			var which = slot.getAttribute("data-ad-slot")
			var blockId = which === "top" ? ads.blockIdTop : ads.blockIdBottom
			if (!blockId) return
			any = true
			var holder = document.createElement("div")
			holder.id = "yandex_rtb_" + blockId
			slot.innerHTML = ""
			slot.appendChild(holder)
			window.yaContextCb = window.yaContextCb || []
			window.yaContextCb.push(function () {
				try {
					window.Ya.Context.AdvManager.render({ blockId: blockId, renderTo: holder.id })
				} catch (e) {}
			})
		})
		if (!any) return
		var s = document.createElement("script")
		s.src = "https://yandex.ru/ads/system/context.js"
		s.async = true
		document.head.appendChild(s)
	}

	var payStatus = document.getElementById("payStatus")
	function setPay(text, kind) {
		if (!payStatus) return
		payStatus.textContent = text
		payStatus.className = "pay-status" + (kind ? " is-" + kind : "")
	}

	function pay(amount, label) {
		if (!CFG.apiBase) {
			setPay("Платёжный сервер пока не подключён. Заполните apiBase в config.js после запуска сервера.", "warn")
			return
		}
		setPay("Создаём платёж…")
		fetch(CFG.apiBase.replace(/\/$/, "") + "/api/payments", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ amount: amount, description: label, returnUrl: location.href }),
		})
			.then(function (res) {
				return res.json().then(function (data) {
					if (!res.ok || !data.confirmationUrl) throw new Error(data.error || "Ошибка платежа")
					return data
				})
			})
			.then(function (data) {
				if (data.paymentKey) localStorage.setItem("arcade:payment:last", data.paymentKey)
				setPay("Переходим к оплате…", "ok")
				location.href = data.confirmationUrl
			})
			.catch(function (e) {
				setPay("Не удалось создать платёж: " + e.message, "warn")
			})
	}

	var premiumBtn = document.getElementById("premiumBtn")
	if (premiumBtn)
		premiumBtn.addEventListener("click", function () {
			S.click()
			pay(CFG.premiumPriceRub || 149, "Arcade Premium")
		})
	document.querySelectorAll("[data-donate]").forEach(function (b) {
		b.addEventListener("click", function () {
			S.click()
			pay(Number(b.getAttribute("data-donate")), "Поддержка проекта")
		})
	})

	initAds()
	route()
})()
