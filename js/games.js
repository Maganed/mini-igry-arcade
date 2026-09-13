/* Игры. Каждая регистрируется в window.GAMES и возвращает функцию очистки из mount(). */
window.GAMES = window.GAMES || {}

;(function () {
	"use strict"

	function cssVar(name) {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888"
	}

	function num(key) {
		return Number(localStorage.getItem(key) || 0)
	}

	function stat(label, id, value) {
		return (
			'<div class="stat"><span class="stat-label">' +
			label +
			'</span><span class="stat-value" id="' +
			id +
			'">' +
			value +
			"</span></div>"
		)
	}

	function overlay(id, title, text, btnId, btnText) {
		return (
			'<div class="overlay" id="' +
			id +
			'"><div class="overlay-card"><h3 id="' +
			id +
			'-title">' +
			title +
			'</h3><p id="' +
			id +
			'-text">' +
			text +
			'</p><button class="btn btn-primary" id="' +
			btnId +
			'">' +
			btnText +
			"</button></div></div>"
		)
	}

	var ARROW_PAD =
		'<div class="pad">' +
		'<button data-dir="up" aria-label="Вверх">▲</button>' +
		'<button data-dir="left" aria-label="Влево">◀</button>' +
		'<button data-dir="down" aria-label="Вниз">▼</button>' +
		'<button data-dir="right" aria-label="Вправо">▶</button>' +
		"</div>"

	function swipe(el, handler) {
		var sx = 0,
			sy = 0
		function start(e) {
			sx = e.changedTouches[0].clientX
			sy = e.changedTouches[0].clientY
		}
		function end(e) {
			var dx = e.changedTouches[0].clientX - sx
			var dy = e.changedTouches[0].clientY - sy
			if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
			handler(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up")
		}
		el.addEventListener("touchstart", start, { passive: true })
		el.addEventListener("touchend", end, { passive: true })
		return function () {
			el.removeEventListener("touchstart", start)
			el.removeEventListener("touchend", end)
		}
	}

	var KEY_DIR = {
		ArrowUp: "up",
		ArrowDown: "down",
		ArrowLeft: "left",
		ArrowRight: "right",
		KeyW: "up",
		KeyS: "down",
		KeyA: "left",
		KeyD: "right",
	}

	/* ================= Змейка ================= */
	window.GAMES.snake = {
		id: "snake",
		title: "Змейка",
		tagline: "Собирай яблоки и не врезайся в себя. Скорость растёт со счётом.",
		meta: "1–3 минуты · на реакцию",
		accent: "green",
		art:
			'<svg viewBox="0 0 48 48" aria-hidden="true">' +
			'<rect x="6" y="32" width="9" height="9" rx="2.5" fill="currentColor" opacity="0.4" />' +
			'<rect x="17" y="32" width="9" height="9" rx="2.5" fill="currentColor" opacity="0.65" />' +
			'<rect x="28" y="32" width="9" height="9" rx="2.5" fill="currentColor" opacity="0.85" />' +
			'<rect x="28" y="21" width="9" height="9" rx="2.5" fill="currentColor" />' +
			'<circle cx="13" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="3" />' +
			"</svg>",
		mount: function (root) {
			var N = 18,
				CELL = 20,
				SIZE = N * CELL,
				KEY = "arcade:snake:best"

			root.innerHTML =
				'<div class="stat-row">' +
				stat("Счёт", "sn-score", 0) +
				stat("Рекорд", "sn-best", num(KEY)) +
				stat("Длина", "sn-len", 3) +
				"</div>" +
				'<div class="board-frame"><canvas class="board" id="sn-canvas" width="' +
				SIZE +
				'" height="' +
				SIZE +
				'"></canvas>' +
				overlay("sn-ov", "Змейка", "Стрелки, WASD или свайпы. Собери как можно больше яблок.", "sn-start", "Играть") +
				"</div>" +
				ARROW_PAD +
				'<p class="hint">С каждым яблоком змейка становится длиннее и быстрее.</p>'

			var canvas = root.querySelector("#sn-canvas")
			var ctx = canvas.getContext("2d")
			var ov = root.querySelector("#sn-ov")
			var ovTitle = root.querySelector("#sn-ov-title")
			var ovText = root.querySelector("#sn-ov-text")
			var scoreEl = root.querySelector("#sn-score")
			var bestEl = root.querySelector("#sn-best")
			var lenEl = root.querySelector("#sn-len")

			var snake, dir, queued, food, score, timer, playing

			function place() {
				while (true) {
					var p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }
					var hit = snake.some(function (s) {
						return s.x === p.x && s.y === p.y
					})
					if (!hit) return p
				}
			}

			function cell(x, y, color, r) {
				ctx.fillStyle = color
				var px = x * CELL + 2,
					py = y * CELL + 2,
					w = CELL - 4
				ctx.beginPath()
				if (ctx.roundRect) ctx.roundRect(px, py, w, w, r || 4)
				else ctx.rect(px, py, w, w)
				ctx.fill()
			}

			function draw() {
				ctx.fillStyle = cssVar("--board-cell")
				ctx.fillRect(0, 0, SIZE, SIZE)
				cell(food.x, food.y, cssVar("--red"), 9)
				var green = cssVar("--green")
				snake.forEach(function (s, i) {
					ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i * 0.03)
					cell(s.x, s.y, green, i === 0 ? 6 : 4)
				})
				ctx.globalAlpha = 1
			}

			function gameOver() {
				playing = false
				clearInterval(timer)
				if (score > num(KEY)) localStorage.setItem(KEY, String(score))
				bestEl.textContent = String(num(KEY))
				ovTitle.textContent = "Игра окончена"
				ovText.textContent = "Счёт: " + score + ". Рекорд: " + num(KEY) + "."
				ov.hidden = false
			}

			function step() {
				if (queued) {
					dir = queued
					queued = null
				}
				var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
				if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N) return gameOver()
				if (
					snake.some(function (s) {
						return s.x === head.x && s.y === head.y
					})
				)
					return gameOver()
				snake.unshift(head)
				if (head.x === food.x && head.y === food.y) {
					score += 10
					scoreEl.textContent = String(score)
					food = place()
					clearInterval(timer)
					timer = setInterval(step, Math.max(70, 145 - score * 2))
				} else {
					snake.pop()
				}
				lenEl.textContent = String(snake.length)
				draw()
			}

			function start() {
				snake = [
					{ x: 8, y: 9 },
					{ x: 7, y: 9 },
					{ x: 6, y: 9 },
				]
				dir = { x: 1, y: 0 }
				queued = null
				score = 0
				playing = true
				scoreEl.textContent = "0"
				lenEl.textContent = "3"
				food = place()
				ov.hidden = true
				draw()
				clearInterval(timer)
				timer = setInterval(step, 145)
			}

			function turn(d) {
				if (!playing) return
				var map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
				var nd = map[d]
				if (!nd || (nd.x === -dir.x && nd.y === -dir.y) || (nd.x === dir.x && nd.y === dir.y)) return
				queued = nd
			}

			function onKey(e) {
				var d = KEY_DIR[e.code]
				if (!d) return
				e.preventDefault()
				turn(d)
			}

			root.querySelector("#sn-start").addEventListener("click", start)
			root.querySelectorAll(".pad button").forEach(function (b) {
				b.addEventListener("click", function () {
					turn(b.getAttribute("data-dir"))
				})
			})
			document.addEventListener("keydown", onKey)
			var offSwipe = swipe(canvas, turn)
			ctx.fillStyle = cssVar("--board-cell")
			ctx.fillRect(0, 0, SIZE, SIZE)

			return function () {
				clearInterval(timer)
				document.removeEventListener("keydown", onKey)
				offSwipe()
			}
		},
	}

	/* ================= 2048 ================= */
	window.GAMES.g2048 = {
		id: "g2048",
		title: "2048",
		tagline: "Складывай одинаковые плитки и дойди до 2048.",
		meta: "3–10 минут · на логику",
		accent: "orange",
		art:
			'<svg viewBox="0 0 48 48" aria-hidden="true">' +
			'<rect x="7" y="7" width="15" height="15" rx="3" fill="currentColor" opacity="0.45" />' +
			'<rect x="26" y="7" width="15" height="15" rx="3" fill="currentColor" opacity="0.7" />' +
			'<rect x="7" y="26" width="15" height="15" rx="3" fill="currentColor" />' +
			'<rect x="26" y="26" width="15" height="15" rx="3" fill="currentColor" opacity="0.85" />' +
			"</svg>",
		mount: function (root) {
			var KEY = "arcade:2048:best"
			root.innerHTML =
				'<div class="stat-row">' +
				stat("Счёт", "tf-score", 0) +
				stat("Рекорд", "tf-best", num(KEY)) +
				stat("Макс. плитка", "tf-max", 2) +
				"</div>" +
				'<div class="board-frame"><div class="grid2048" id="tf-grid"></div>' +
				overlay("tf-ov", "Игра окончена", "", "tf-again", "Заново") +
				"</div>" +
				ARROW_PAD +
				'<button class="btn btn-small" id="tf-new">Начать заново</button>' +
				'<p class="hint">Стрелки, WASD или свайпы. При столкновении двух одинаковых плиток числа складываются.</p>'

			var gridEl = root.querySelector("#tf-grid")
			var ov = root.querySelector("#tf-ov")
			var ovText = root.querySelector("#tf-ov-text")
			var ovTitle = root.querySelector("#tf-ov-title")
			var scoreEl = root.querySelector("#tf-score")
			var bestEl = root.querySelector("#tf-best")
			var maxEl = root.querySelector("#tf-max")
			var cells = []
			for (var i = 0; i < 16; i++) {
				var d = document.createElement("div")
				d.className = "tile"
				gridEl.appendChild(d)
				cells.push(d)
			}

			var board, score, won

			function render() {
				var max = 0
				for (var i = 0; i < 16; i++) {
					var v = board[i]
					cells[i].textContent = v ? String(v) : ""
					if (v) cells[i].setAttribute("data-v", String(v))
					else cells[i].removeAttribute("data-v")
					if (v > max) max = v
				}
				scoreEl.textContent = String(score)
				maxEl.textContent = String(max || 2)
				bestEl.textContent = String(num(KEY))
			}

			function addTile() {
				var free = []
				board.forEach(function (v, i) {
					if (!v) free.push(i)
				})
				if (!free.length) return
				board[free[Math.floor(Math.random() * free.length)]] = Math.random() < 0.9 ? 2 : 4
			}

			function line(idx) {
				var vals = idx
					.map(function (i) {
						return board[i]
					})
					.filter(Boolean)
				var out = []
				for (var i = 0; i < vals.length; i++) {
					if (vals[i] === vals[i + 1]) {
						out.push(vals[i] * 2)
						score += vals[i] * 2
						if (vals[i] * 2 >= 2048) won = true
						i++
					} else out.push(vals[i])
				}
				while (out.length < 4) out.push(0)
				var moved = false
				idx.forEach(function (b, k) {
					if (board[b] !== out[k]) moved = true
					board[b] = out[k]
				})
				return moved
			}

			function lines(dir) {
				var all = []
				for (var k = 0; k < 4; k++) {
					var row = []
					for (var j = 0; j < 4; j++) {
						if (dir === "left") row.push(k * 4 + j)
						else if (dir === "right") row.push(k * 4 + (3 - j))
						else if (dir === "up") row.push(j * 4 + k)
						else row.push((3 - j) * 4 + k)
					}
					all.push(row)
				}
				return all
			}

			function hasMoves() {
				if (
					board.some(function (v) {
						return !v
					})
				)
					return true
				for (var r = 0; r < 4; r++) {
					for (var c = 0; c < 4; c++) {
						var v = board[r * 4 + c]
						if (c < 3 && v === board[r * 4 + c + 1]) return true
						if (r < 3 && v === board[(r + 1) * 4 + c]) return true
					}
				}
				return false
			}

			function move(dir) {
				if (!ov.hidden) return
				var moved = false
				lines(dir).forEach(function (row) {
					if (line(row)) moved = true
				})
				if (!moved) return
				addTile()
				if (score > num(KEY)) localStorage.setItem(KEY, String(score))
				render()
				if (won) {
					ovTitle.textContent = "2048 собрано!"
					ovText.textContent = "Счёт: " + score + ". Можно сыграть ещё раз."
					ov.hidden = false
				} else if (!hasMoves()) {
					ovTitle.textContent = "Ходов больше нет"
					ovText.textContent = "Счёт: " + score + ". Рекорд: " + num(KEY) + "."
					ov.hidden = false
				}
			}

			function start() {
				board = new Array(16).fill(0)
				score = 0
				won = false
				addTile()
				addTile()
				ov.hidden = true
				render()
			}

			function onKey(e) {
				var d = KEY_DIR[e.code]
				if (!d) return
				e.preventDefault()
				move(d)
			}

			root.querySelector("#tf-new").addEventListener("click", start)
			root.querySelector("#tf-again").addEventListener("click", start)
			root.querySelectorAll(".pad button").forEach(function (b) {
				b.addEventListener("click", function () {
					move(b.getAttribute("data-dir"))
				})
			})
			document.addEventListener("keydown", onKey)
			var offSwipe = swipe(gridEl, move)
			start()

			return function () {
				document.removeEventListener("keydown", onKey)
				offSwipe()
			}
		},
	}

	/* ================= Тетрис ================= */
	window.GAMES.tetris = {
		id: "tetris",
		title: "Тетрис",
		tagline: "Собирай строки из падающих фигур. С каждым уровнем быстрее.",
		meta: "5–15 минут · классика",
		accent: "blue",
		art:
			'<svg viewBox="0 0 48 48" aria-hidden="true">' +
			'<rect x="18" y="6" width="10" height="10" rx="2" fill="currentColor" opacity="0.45" />' +
			'<rect x="28" y="16" width="10" height="10" rx="2" fill="currentColor" opacity="0.7" />' +
			'<rect x="8" y="26" width="10" height="10" rx="2" fill="currentColor" />' +
			'<rect x="18" y="26" width="10" height="10" rx="2" fill="currentColor" opacity="0.85" />' +
			"</svg>",
		mount: function (root) {
			var COLS = 10,
				ROWS = 20,
				CELL = 22,
				KEY = "arcade:tetris:best"
			var SHAPES = {
				I: [[1, 1, 1, 1]],
				O: [
					[1, 1],
					[1, 1],
				],
				T: [
					[0, 1, 0],
					[1, 1, 1],
				],
				S: [
					[0, 1, 1],
					[1, 1, 0],
				],
				Z: [
					[1, 1, 0],
					[0, 1, 1],
				],
				J: [
					[1, 0, 0],
					[1, 1, 1],
				],
				L: [
					[0, 0, 1],
					[1, 1, 1],
				],
			}
			var COLORS = { I: "--blue", O: "--orange", T: "--purple", S: "--green", Z: "--red", J: "--blue", L: "--orange" }
			var NAMES = Object.keys(SHAPES)

			root.innerHTML =
				'<div class="stat-row">' +
				stat("Счёт", "tt-score", 0) +
				stat("Строки", "tt-lines", 0) +
				stat("Уровень", "tt-level", 1) +
				stat("Рекорд", "tt-best", num(KEY)) +
				"</div>" +
				'<div class="board-frame"><canvas class="board" id="tt-canvas" width="' +
				COLS * CELL +
				'" height="' +
				ROWS * CELL +
				'"></canvas>' +
				overlay("tt-ov", "Тетрис", "Стрелки — движение, вверх — поворот, пробел — сбросить.", "tt-start", "Играть") +
				"</div>" +
				'<div class="pad">' +
				'<button data-dir="up" aria-label="Поворот"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><path d="M20 4v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>' +
				'<button data-dir="left" aria-label="Влево">◀</button>' +
				'<button data-dir="down" aria-label="Вниз">▼</button>' +
				'<button data-dir="right" aria-label="Вправо">▶</button>' +
				"</div>" +
				'<p class="hint">За четыре строки за раз — 800 очков на уровень.</p>'

			var canvas = root.querySelector("#tt-canvas")
			var ctx = canvas.getContext("2d")
			var ov = root.querySelector("#tt-ov")
			var ovTitle = root.querySelector("#tt-ov-title")
			var ovText = root.querySelector("#tt-ov-text")
			var scoreEl = root.querySelector("#tt-score")
			var linesEl = root.querySelector("#tt-lines")
			var levelEl = root.querySelector("#tt-level")
			var bestEl = root.querySelector("#tt-best")

			var grid, piece, score, lines, level, timer, playing

			function empty() {
				var g = []
				for (var r = 0; r < ROWS; r++) g.push(new Array(COLS).fill(null))
				return g
			}

			function spawn() {
				var name = NAMES[Math.floor(Math.random() * NAMES.length)]
				var m = SHAPES[name].map(function (r) {
					return r.slice()
				})
				return { name: name, m: m, x: Math.floor((COLS - m[0].length) / 2), y: 0 }
			}

			function collide(p) {
				for (var r = 0; r < p.m.length; r++) {
					for (var c = 0; c < p.m[r].length; c++) {
						if (!p.m[r][c]) continue
						var x = p.x + c,
							y = p.y + r
						if (x < 0 || x >= COLS || y >= ROWS) return true
						if (y >= 0 && grid[y][x]) return true
					}
				}
				return false
			}

			function draw() {
				ctx.fillStyle = cssVar("--board-cell")
				ctx.fillRect(0, 0, canvas.width, canvas.height)
				function block(x, y, varName) {
					ctx.fillStyle = cssVar(varName)
					ctx.beginPath()
					if (ctx.roundRect) ctx.roundRect(x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3, 3)
					else ctx.rect(x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3)
					ctx.fill()
				}
				for (var r = 0; r < ROWS; r++)
					for (var c = 0; c < COLS; c++) if (grid[r][c]) block(c, r, COLORS[grid[r][c]])
				if (piece)
					piece.m.forEach(function (row, r) {
						row.forEach(function (v, c) {
							if (v && piece.y + r >= 0) block(piece.x + c, piece.y + r, COLORS[piece.name])
						})
					})
			}

			function clearLines() {
				var cleared = 0
				for (var r = ROWS - 1; r >= 0; r--) {
					if (
						grid[r].every(function (v) {
							return v
						})
					) {
						grid.splice(r, 1)
						grid.unshift(new Array(COLS).fill(null))
						cleared++
						r++
					}
				}
				if (!cleared) return
				lines += cleared
				score += { 1: 100, 2: 300, 3: 500, 4: 800 }[cleared] * level
				level = Math.min(9, 1 + Math.floor(lines / 10))
				scoreEl.textContent = String(score)
				linesEl.textContent = String(lines)
				levelEl.textContent = String(level)
				clearInterval(timer)
				timer = setInterval(tick, Math.max(110, 620 - level * 55))
			}

			function lock() {
				piece.m.forEach(function (row, r) {
					row.forEach(function (v, c) {
						if (v && piece.y + r >= 0) grid[piece.y + r][piece.x + c] = piece.name
					})
				})
				clearLines()
				piece = spawn()
				if (collide(piece)) gameOver()
			}

			function gameOver() {
				playing = false
				clearInterval(timer)
				if (score > num(KEY)) localStorage.setItem(KEY, String(score))
				bestEl.textContent = String(num(KEY))
				ovTitle.textContent = "Игра окончена"
				ovText.textContent = "Счёт: " + score + " · строк: " + lines
				ov.hidden = false
			}

			function tick() {
				if (!playing) return
				piece.y++
				if (collide(piece)) {
					piece.y--
					lock()
				}
				draw()
			}

			function rotate() {
				var m = piece.m
				var rotated = m[0].map(function (_, i) {
					return m
						.map(function (row) {
							return row[i]
						})
						.reverse()
				})
				var old = piece.m,
					oldX = piece.x
				piece.m = rotated
				var kicks = [0, -1, 1, -2, 2]
				for (var i = 0; i < kicks.length; i++) {
					piece.x = oldX + kicks[i]
					if (!collide(piece)) return
				}
				piece.m = old
				piece.x = oldX
			}

			function shift(dx) {
				piece.x += dx
				if (collide(piece)) piece.x -= dx
			}

			function hardDrop() {
				while (!collide(piece)) piece.y++
				piece.y--
				lock()
			}

			function act(d) {
				if (!playing) return
				if (d === "left") shift(-1)
				else if (d === "right") shift(1)
				else if (d === "up") rotate()
				else if (d === "down") tick()
				draw()
			}

			function start() {
				grid = empty()
				score = 0
				lines = 0
				level = 1
				playing = true
				scoreEl.textContent = "0"
				linesEl.textContent = "0"
				levelEl.textContent = "1"
				piece = spawn()
				ov.hidden = true
				draw()
				clearInterval(timer)
				timer = setInterval(tick, 620 - level * 55)
			}

			function onKey(e) {
				if (e.code === "Space") {
					e.preventDefault()
					if (playing) {
						hardDrop()
						draw()
					}
					return
				}
				var d = KEY_DIR[e.code]
				if (!d) return
				e.preventDefault()
				act(d)
			}

			grid = empty()
			draw()
			root.querySelector("#tt-start").addEventListener("click", start)
			root.querySelectorAll(".pad button").forEach(function (b) {
				b.addEventListener("click", function () {
					act(b.getAttribute("data-dir"))
				})
			})
			document.addEventListener("keydown", onKey)
			var offSwipe = swipe(canvas, act)

			return function () {
				clearInterval(timer)
				document.removeEventListener("keydown", onKey)
				offSwipe()
			}
		},
	}

	/* ================= Мемори ================= */
	window.GAMES.memory = {
		id: "memory",
		title: "Мемори",
		tagline: "Найди все восемь пар за минимум ходов.",
		meta: "2–4 минуты · на память",
		accent: "purple",
		art:
			'<svg viewBox="0 0 48 48" aria-hidden="true">' +
			'<rect x="7" y="11" width="14" height="26" rx="3" fill="currentColor" opacity="0.45" />' +
			'<rect x="26" y="11" width="14" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="3" />' +
			'<circle cx="33" cy="24" r="3" fill="currentColor" />' +
			"</svg>",
		mount: function (root) {
			var KEY = "arcade:memory:best"
			var ICONS = [
				['<circle cx="12" cy="12" r="8" fill="currentColor" />', "--blue"],
				['<rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" />', "--green"],
				['<path d="M12 3l9 17H3z" fill="currentColor" />', "--orange"],
				['<path d="M12 2l10 10-10 10L2 12z" fill="currentColor" />', "--red"],
				['<path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />', "--purple"],
				['<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3.5" />', "--blue"],
				['<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill="currentColor" />', "--green"],
				['<path d="M12 3l2.6 6.2 6.7.5-5.1 4.4 1.5 6.6L12 17.2 6.3 20.7l1.5-6.6L2.7 9.7l6.7-.5z" fill="currentColor" />', "--orange"],
			]

			root.innerHTML =
				'<div class="stat-row">' +
				stat("Ходы", "mm-moves", 0) +
				stat("Пары", "mm-pairs", "0/8") +
				stat("Лучшее", "mm-best", num(KEY) || "—") +
				"</div>" +
				'<div class="board-frame"><div class="memory-grid" id="mm-grid"></div>' +
				overlay("mm-ov", "Готово!", "", "mm-again", "Заново") +
				"</div>" +
				'<button class="btn btn-small" id="mm-new">Новая раскладка</button>' +
				'<p class="hint">Открывай по две карточки. Чем меньше ходов — тем лучше.</p>'

			var gridEl = root.querySelector("#mm-grid")
			var ov = root.querySelector("#mm-ov")
			var ovText = root.querySelector("#mm-ov-text")
			var movesEl = root.querySelector("#mm-moves")
			var pairsEl = root.querySelector("#mm-pairs")
			var bestEl = root.querySelector("#mm-best")
			var moves, pairs, open, lockBoard, pending

			function start() {
				moves = 0
				pairs = 0
				open = []
				lockBoard = false
				clearTimeout(pending)
				movesEl.textContent = "0"
				pairsEl.textContent = "0/8"
				bestEl.textContent = String(num(KEY) || "—")
				ov.hidden = true
				var deck = []
				ICONS.forEach(function (ic, i) {
					deck.push({ i: i, ic: ic })
					deck.push({ i: i, ic: ic })
				})
				deck.sort(function () {
					return Math.random() - 0.5
				})
				gridEl.innerHTML = ""
				deck.forEach(function (card) {
					var b = document.createElement("button")
					b.className = "memory-card"
					b.type = "button"
					b.setAttribute("data-i", String(card.i))
					b.innerHTML =
						'<svg viewBox="0 0 24 24" aria-hidden="true" style="color:' + cssVar(card.ic[1]) + '">' + card.ic[0] + "</svg>"
					b.addEventListener("click", function () {
						flip(b)
					})
					gridEl.appendChild(b)
				})
			}

			function flip(b) {
				if (lockBoard || b.classList.contains("is-open") || b.classList.contains("is-done")) return
				b.classList.add("is-open")
				open.push(b)
				if (open.length < 2) return
				moves++
				movesEl.textContent = String(moves)
				var a = open[0],
					c = open[1]
				if (a.getAttribute("data-i") === c.getAttribute("data-i")) {
					a.classList.add("is-done")
					c.classList.add("is-done")
					open = []
					pairs++
					pairsEl.textContent = pairs + "/8"
					if (pairs === 8) {
						var best = num(KEY)
						if (!best || moves < best) localStorage.setItem(KEY, String(moves))
						bestEl.textContent = String(num(KEY))
						ovText.textContent = "Все пары найдены за " + moves + " ходов. Лучшее: " + num(KEY) + "."
						ov.hidden = false
					}
					return
				}
				lockBoard = true
				pending = setTimeout(function () {
					a.classList.remove("is-open")
					c.classList.remove("is-open")
					open = []
					lockBoard = false
				}, 650)
			}

			root.querySelector("#mm-new").addEventListener("click", start)
			root.querySelector("#mm-again").addEventListener("click", start)
			start()

			return function () {
				clearTimeout(pending)
			}
		},
	}

	/* ================= Тест реакции ================= */
	window.GAMES.reaction = {
		id: "reaction",
		title: "Тест реакции",
		tagline: "Жди зелёного и жми. Средний человек — 250 мс.",
		meta: "30 секунд · на скорость",
		accent: "red",
		art:
			'<svg viewBox="0 0 48 48" aria-hidden="true">' +
			'<circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="3" opacity="0.45" />' +
			'<circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" stroke-width="3" opacity="0.7" />' +
			'<circle cx="24" cy="24" r="4" fill="currentColor" />' +
			"</svg>",
		mount: function (root) {
			var KEY = "arcade:reaction:best"
			root.innerHTML =
				'<div class="stat-row">' +
				stat("Последний", "rc-last", "—") +
				stat("Средний", "rc-avg", "—") +
				stat("Лучший", "rc-best", num(KEY) || "—") +
				stat("Попытки", "rc-tries", 0) +
				"</div>" +
				'<button class="reaction-pad" id="rc-pad" type="button">Нажми, чтобы начать</button>' +
				'<p class="hint">Когда поле станет зелёным — кликни или нажми пробел. Рано нажать нельзя.</p>'

			var pad = root.querySelector("#rc-pad")
			var lastEl = root.querySelector("#rc-last")
			var avgEl = root.querySelector("#rc-avg")
			var bestEl = root.querySelector("#rc-best")
			var triesEl = root.querySelector("#rc-tries")
			var state = "idle",
				startedAt = 0,
				timer = null,
				results = []

			function setState(s, text) {
				state = s
				pad.classList.remove("is-wait", "is-go", "is-fail")
				if (s === "wait") pad.classList.add("is-wait")
				if (s === "go") pad.classList.add("is-go")
				if (s === "fail") pad.classList.add("is-fail")
				pad.textContent = text
			}

			function arm() {
				setState("wait", "Жди зелёного…")
				clearTimeout(timer)
				timer = setTimeout(function () {
					startedAt = performance.now()
					setState("go", "Жми!")
				}, 900 + Math.random() * 2600)
			}

			function hit() {
				if (state === "idle" || state === "fail" || state === "done") return arm()
				if (state === "wait") {
					clearTimeout(timer)
					return setState("fail", "Рано! Нажми, чтобы повторить")
				}
				var ms = Math.round(performance.now() - startedAt)
				results.push(ms)
				var best = num(KEY)
				if (!best || ms < best) localStorage.setItem(KEY, String(ms))
				lastEl.textContent = ms + " мс"
				avgEl.textContent =
					Math.round(
						results.reduce(function (a, b) {
							return a + b
						}, 0) / results.length,
					) + " мс"
				bestEl.textContent = num(KEY) + " мс"
				triesEl.textContent = String(results.length)
				setState("done", ms + " мс · нажми для новой попытки")
			}

			function onKey(e) {
				if (e.code !== "Space") return
				e.preventDefault()
				hit()
			}

			pad.addEventListener("click", hit)
			document.addEventListener("keydown", onKey)

			return function () {
				clearTimeout(timer)
				document.removeEventListener("keydown", onKey)
			}
		},
	}
})()
