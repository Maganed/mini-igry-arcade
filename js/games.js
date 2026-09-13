/* Мини-игры: Змейка, Реакция, Мемори. Чистый JS, без зависимостей. */
(function () {
	"use strict"

	const store = {
		get(key, fallback) {
			try {
				const raw = localStorage.getItem(key)
				return raw === null ? fallback : JSON.parse(raw)
			} catch (e) {
				return fallback
			}
		},
		set(key, value) {
			try {
				localStorage.setItem(key, JSON.stringify(value))
			} catch (e) {}
		},
	}

	/* ---------- Змейка ---------- */
	function initSnake() {
		const canvas = document.getElementById("snakeCanvas")
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		const cells = 21
		const size = canvas.width / cells
		const scoreEl = document.getElementById("snakeScore")
		const bestEl = document.getElementById("snakeBest")

		let snake, dir, nextDir, food, score, timer, alive
		let best = store.get("snake:best", 0)
		bestEl.textContent = best

		function randomFood() {
			let p
			do {
				p = { x: Math.floor(Math.random() * cells), y: Math.floor(Math.random() * cells) }
			} while (snake.some((s) => s.x === p.x && s.y === p.y))
			return p
		}

		function reset() {
			snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
			dir = { x: 1, y: 0 }
			nextDir = dir
			score = 0
			alive = true
			food = randomFood()
			scoreEl.textContent = score
		}

		function draw(message) {
			ctx.fillStyle = "#0c0f1c"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			ctx.fillStyle = "#ff6b6b"
			ctx.fillRect(food.x * size + 2, food.y * size + 2, size - 4, size - 4)

			snake.forEach((part, i) => {
				ctx.fillStyle = i === 0 ? "#38d9a9" : "#2f9e78"
				ctx.fillRect(part.x * size + 1, part.y * size + 1, size - 2, size - 2)
			})

			if (message) {
				ctx.fillStyle = "rgba(12,15,28,0.75)"
				ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80)
				ctx.fillStyle = "#e8eaf6"
				ctx.font = "bold 20px sans-serif"
				ctx.textAlign = "center"
				ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 7)
			}
		}

		function step() {
			if (!alive) return
			dir = nextDir
			const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }

			const hitWall = head.x < 0 || head.y < 0 || head.x >= cells || head.y >= cells
			const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y)
			if (hitWall || hitSelf) {
				alive = false
				clearInterval(timer)
				if (score > best) {
					best = score
					store.set("snake:best", best)
					bestEl.textContent = best
				}
				draw("Игра окончена — счёт " + score)
				return
			}

			snake.unshift(head)
			if (head.x === food.x && head.y === food.y) {
				score += 1
				scoreEl.textContent = score
				food = randomFood()
			} else {
				snake.pop()
			}
			draw()
		}

		function start() {
			clearInterval(timer)
			reset()
			draw()
			timer = setInterval(step, 110)
		}

		function turn(name) {
			const map = {
				up: { x: 0, y: -1 },
				down: { x: 0, y: 1 },
				left: { x: -1, y: 0 },
				right: { x: 1, y: 0 },
			}
			const d = map[name]
			if (!d) return
			if (d.x === -dir.x && d.y === -dir.y) return // нельзя развернуться на 180°
			nextDir = d
		}

		document.getElementById("snakeStart").addEventListener("click", start)

		document.addEventListener("keydown", (e) => {
			const keys = {
				ArrowUp: "up",
				ArrowDown: "down",
				ArrowLeft: "left",
				ArrowRight: "right",
				KeyW: "up",
				KeyS: "down",
				KeyA: "left",
				KeyD: "right",
			}
			const name = keys[e.code]
			if (!name) return
			if (document.getElementById("view-snake").classList.contains("is-active")) {
				e.preventDefault()
				turn(name)
			}
		})

		document.getElementById("snakePad").addEventListener("click", (e) => {
			const btn = e.target.closest("button")
			if (btn) turn(btn.dataset.dir)
		})

		let touchStart = null
		canvas.addEventListener("touchstart", (e) => {
			const t = e.changedTouches[0]
			touchStart = { x: t.clientX, y: t.clientY }
		})
		canvas.addEventListener("touchend", (e) => {
			if (!touchStart) return
			const t = e.changedTouches[0]
			const dx = t.clientX - touchStart.x
			const dy = t.clientY - touchStart.y
			if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return
			turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up")
			touchStart = null
		})

		reset()
		draw("Нажми «Играть»")
	}

	/* ---------- Тест реакции ---------- */
	function initReaction() {
		const box = document.getElementById("reactionBox")
		if (!box) return
		const bestEl = document.getElementById("reactionBest")
		let best = store.get("reaction:best", null)
		let state = "idle"
		let startedAt = 0
		let timeout = null

		bestEl.textContent = best ? best + " мс" : "—"

		box.addEventListener("click", () => {
			if (state === "idle") {
				state = "wait"
				box.className = "reaction-box is-wait"
				box.textContent = "Ждём зелёного..."
				timeout = setTimeout(() => {
					state = "go"
					startedAt = performance.now()
					box.className = "reaction-box is-go"
					box.textContent = "ЖМИ!"
				}, 1000 + Math.random() * 3000)
				return
			}

			if (state === "wait") {
				clearTimeout(timeout)
				state = "idle"
				box.className = "reaction-box"
				box.textContent = "Фальстарт! Нажми, чтобы повторить"
				return
			}

			if (state === "go") {
				const ms = Math.round(performance.now() - startedAt)
				state = "idle"
				box.className = "reaction-box"
				if (best === null || ms < best) {
					best = ms
					store.set("reaction:best", best)
					bestEl.textContent = best + " мс"
					box.textContent = ms + " мс — новый рекорд! Ещё раз?"
				} else {
					box.textContent = ms + " мс. Ещё раз?"
				}
			}
		})
	}

	/* ---------- Мемори ---------- */
	function initMemory() {
		const grid = document.getElementById("memoryGrid")
		if (!grid) return
		const movesEl = document.getElementById("memoryMoves")
		const bestEl = document.getElementById("memoryBest")
		const symbols = ["🍎", "🚀", "🐱", "⚽", "🎸", "🌙", "🍩", "🐸"]
		let best = store.get("memory:best", null)
		let moves = 0
		let first = null
		let locked = false
		let done = 0

		bestEl.textContent = best ? best + " ходов" : "—"

		function shuffle(arr) {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1))
				;[arr[i], arr[j]] = [arr[j], arr[i]]
			}
			return arr
		}

		function build() {
			moves = 0
			done = 0
			first = null
			locked = false
			movesEl.textContent = "0"
			grid.innerHTML = ""
			shuffle(symbols.concat(symbols)).forEach((symbol) => {
				const card = document.createElement("button")
				card.className = "card"
				card.type = "button"
				card.dataset.symbol = symbol
				card.textContent = symbol
				grid.appendChild(card)
			})
		}

		grid.addEventListener("click", (e) => {
			const card = e.target.closest(".card")
			if (!card || locked) return
			if (card.classList.contains("is-open") || card.classList.contains("is-done")) return

			card.classList.add("is-open")

			if (!first) {
				first = card
				return
			}

			moves += 1
			movesEl.textContent = moves

			if (first.dataset.symbol === card.dataset.symbol) {
				first.classList.add("is-done")
				card.classList.add("is-done")
				first.classList.remove("is-open")
				card.classList.remove("is-open")
				first = null
				done += 1
				if (done === symbols.length && (best === null || moves < best)) {
					best = moves
					store.set("memory:best", best)
					bestEl.textContent = best + " ходов"
				}
				return
			}

			locked = true
			const prev = first
			first = null
			setTimeout(() => {
				prev.classList.remove("is-open")
				card.classList.remove("is-open")
				locked = false
			}, 700)
		})

		document.getElementById("memoryRestart").addEventListener("click", build)
		build()
	}

	window.Games = { initSnake, initReaction, initMemory }
})()
