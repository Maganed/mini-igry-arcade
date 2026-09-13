/* Оболочка: каталог игр, роутинг, реклама и оплата. */
;(function () {
	"use strict"

	var CFG = window.APP_CONFIG || {}
	var GAMES = window.GAMES || {}
	var ORDER = ["snake", "g2048", "tetris", "memory", "reaction"]

	var home = document.getElementById("home")
	var view = document.getElementById("gameView")
	var mount = document.getElementById("gameMount")
	var titleEl = document.getElementById("gameTitle")
	var gridEl = document.getElementById("gameGrid")
	var statusEl = document.getElementById("payStatus")
	var cleanup = null

	var BEST_KEYS = {
		snake: ["arcade:snake:best", "рекорд"],
		g2048: ["arcade:2048:best", "рекорд"],
		tetris: ["arcade:tetris:best", "рекорд"],
		memory: ["arcade:memory:best", "лучшее — ходов"],
		reaction: ["arcade:reaction:best", "лучший — мс"],
	}

	function bestLabel(id) {
		var info = BEST_KEYS[id]
		if (!info) return ""
		var v = Number(localStorage.getItem(info[0]) || 0)
		if (!v) return "Ещё не играли"
		return "Ваш " + info[1] + ": " + v
	}

	function renderGrid() {
		if (!gridEl) return
		gridEl.innerHTML = ""
		ORDER.forEach(function (id) {
			var g = GAMES[id]
			if (!g) return
			var card = document.createElement("button")
			card.type = "button"
			card.className = "card game-card"
			card.innerHTML =
				'<span class="game-card-art art-' +
				g.accent +
				'">' +
				g.art +
				'</span><span class="game-card-body"><h3>' +
				g.title +
				"</h3><p>" +
				g.tagline +
				'</p><span class="game-card-meta">' +
				g.meta +
				" · " +
				bestLabel(id) +
				"</span></span>"
			card.addEventListener("click", function () {
				location.hash = "#play/" + id
			})
			gridEl.appendChild(card)
		})
	}

	function closeGame() {
		if (cleanup) {
			try {
				cleanup()
			} catch (e) {}
			cleanup = null
		}
		mount.innerHTML = ""
		view.hidden = true
		home.hidden = false
		renderGrid()
	}

	function openGame(id) {
		var g = GAMES[id]
		if (!g) return closeGame()
		if (cleanup) {
			try {
				cleanup()
			} catch (e) {}
			cleanup = null
		}
		home.hidden = true
		view.hidden = false
		titleEl.textContent = g.title
		mount.innerHTML = ""
		cleanup = g.mount(mount) || null
		window.scrollTo({ top: 0, behavior: "auto" })
	}

	function route() {
		var m = /^#play\/(.+)$/.exec(location.hash)
		if (m) openGame(m[1])
		else closeGame()
	}

	var backBtn = document.getElementById("backBtn")
	if (backBtn)
		backBtn.addEventListener("click", function () {
			location.hash = ""
		})

	window.addEventListener("hashchange", route)

	/* ---------- Реклама ---------- */
	function isPremium() {
		return !!localStorage.getItem("arcade:premium:key")
	}

	function renderAds() {
		var slots = document.querySelectorAll("[data-ad-slot]")
		if (isPremium()) {
			slots.forEach(function (s) {
				s.remove()
			})
			return
		}
		var ads = CFG.ads || {}
		var map = { top: ads.blockIdTop, bottom: ads.blockIdBottom }
		var any = false
		slots.forEach(function (slot) {
			var blockId = map[slot.getAttribute("data-ad-slot")]
			if (!blockId) return
			any = true
			var box = document.createElement("div")
			box.id = "yandex_rtb_" + blockId
			slot.innerHTML = ""
			slot.appendChild(box)
			window.yaContextCb = window.yaContextCb || []
			window.yaContextCb.push(function () {
				if (window.Ya && window.Ya.Context)
					window.Ya.Context.AdvManager.render({ blockId: blockId, renderTo: box.id })
			})
		})
		if (!any) return
		var s = document.createElement("script")
		s.src = "https://yandex.ru/ads/system/context.js"
		s.async = true
		document.head.appendChild(s)
	}

	/* ---------- Оплата ---------- */
	function setStatus(text) {
		if (statusEl) statusEl.textContent = text || ""
	}

	function pay(kind, amount) {
		if (!CFG.apiBase) {
			setStatus("Оплата ещё не подключена: укажите apiBase в config.js и запустите сервер из папки server.")
			return
		}
		setStatus("Создаём платёж…")
		fetch(CFG.apiBase.replace(/\/$/, "") + "/api/payments", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ kind: kind, amount: amount, returnUrl: location.origin + location.pathname }),
		})
			.then(function (r) {
				return r.json()
			})
			.then(function (data) {
				if (data && data.confirmationUrl) {
					if (data.id) localStorage.setItem("arcade:payment:last", data.id)
					location.href = data.confirmationUrl
				} else {
					setStatus("Не удалось создать платёж. Попробуйте позже.")
				}
			})
			.catch(function () {
				setStatus("Сервер оплаты недоступен.")
			})
	}

	function checkLastPayment() {
		var id = localStorage.getItem("arcade:payment:last")
		if (!id || !CFG.apiBase) return
		fetch(CFG.apiBase.replace(/\/$/, "") + "/api/payments/" + encodeURIComponent(id))
			.then(function (r) {
				return r.json()
			})
			.then(function (data) {
				if (!data) return
				if (data.status === "succeeded") {
					localStorage.removeItem("arcade:payment:last")
					if (data.kind === "premium") {
						localStorage.setItem("arcade:premium:key", id)
						setStatus("Спасибо! Реклама отключена.")
						renderAds()
					} else {
						setStatus("Спасибо за поддержку!")
					}
				}
			})
			.catch(function () {})
	}

	;[document.getElementById("premiumBtn"), document.getElementById("premiumBtn2")].forEach(function (b) {
		if (!b) return
		if (isPremium()) {
			b.disabled = true
			b.textContent = "Реклама отключена"
			return
		}
		b.addEventListener("click", function () {
			pay("premium", CFG.premiumPriceRub || 149)
		})
	})

	document.querySelectorAll("[data-donate]").forEach(function (b) {
		b.addEventListener("click", function () {
			pay("donation", Number(b.getAttribute("data-donate")))
		})
	})

	var yearEl = document.getElementById("year")
	if (yearEl) yearEl.textContent = String(new Date().getFullYear())

	renderGrid()
	renderAds()
	route()
	checkLastPayment()
})()
