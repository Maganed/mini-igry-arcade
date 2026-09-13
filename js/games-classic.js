/* Общие хелперы + пять классических игр с анимацией и звуком. */
window.GAMES = window.GAMES || {}

window.GAMEKIT = (function () {
	"use strict"
	var C = {
		gold: "#c9a35a",
		goldLight: "#e6cf9a",
		ink: "#0a0c10",
		line: "rgba(255,255,255,0.07)",
		text: "#edeef1",
		muted: "#9096a1",
		danger: "#d06a5c",
	}

	function num(key) {
		return Number(localStorage.getItem(key) || 0)
	}

	function saveMax(key, v) {
		if (v > num(key)) localStorage.setItem(key, String(v))
		return num(key)
	}

	function saveMin(key, v) {
		var cur = num(key)
		if (!cur || v < cur) localStorage.setItem(key, String(v))
		return num(key)
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

	function setStat(el, value) {
		if (!el) return
		el.textContent = String(value)
		el.classList.remove("bump")
		void el.offsetWidth
		el.classList.add("bump")
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

	var ARROWS = {
		up: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 19V6m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		down: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v13m0 0l6-6m-6 6l-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		left: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 12H6m0 0l6-6m-6 6l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		right: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h13m0 0l-6-6m6 6l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		rotate:
			'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 4v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	}

	function pad(upIcon) {
		return (
			'<div class="pad">' +
			'<button data-dir="up" aria-label="Вверх">' +
			(upIcon === "rotate" ? ARROWS.rotate : ARROWS.up) +
			"</button>" +
			'<button data-dir="left" aria-label="Влево">' +
			ARROWS.left +
			"</button>" +
			'<button data-dir="down" aria-label="Вниз">' +
			ARROWS.down +
			"</button>" +
			'<button data-dir="right" aria-label="Вправо">' +
			ARROWS.right +
			"</button>" +
			"</div>"
		)
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

	function bindPad(root, handler) {
		root.querySelectorAll(".pad button").forEach(function (b) {
			b.addEventListener("click", function () {
				handler(b.getAttribute("data-dir"))
			})
		})
	}

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
			if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return
			handler(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up")
		}
		el.addEventListener("touchstart", start, { passive: true })
		el.addEventListener("touchend", end, { passive: true })
		return function () {
			el.removeEventListener("touchstart", start)
			el.removeEventListener("touchend", end)
		}
	}

	/* Цикл анимации */
	function loop(fn) {
		var raf = 0,
			last = performance.now(),
			stopped = false
		function frame(now) {
			if (stopped) return
			var dt = Math.min(50, now - last)
			last = now
			fn(dt, now)
			raf = requestAnimationFrame(frame)
		}
		raf = requestAnimationFrame(frame)
		return function () {
			stopped = true
			cancelAnimationFrame(raf)
		}
	}

	/* Частицы */
	function particles() {
		var list = []
		return {
			burst: function (x, y, opts) {
				var o = opts || {}
				var n = o.count || 14
				for (var i = 0; i < n; i++) {
					var a = Math.random() * Math.PI * 2
					var sp = (o.speed || 0.16) * (0.4 + Math.random())
					list.push({
						x: x,
						y: y,
						vx: Math.cos(a) * sp,
						vy: Math.sin(a) * sp,
						life: o.life || 480,
						max: o.life || 480,
						r: o.size || 2.4,
						color: o.color || C.goldLight,
						grav: o.grav || 0,
					})
				}
			},
			update: function (dt) {
				for (var i = list.length - 1; i >= 0; i--) {
					var p = list[i]
					p.life -= dt
					if (p.life <= 0) {
						list.splice(i, 1)
						continue
					}
					p.vy += p.grav * dt
					p.x += p.vx * dt
					p.y += p.vy * dt
				}
			},
			draw: function (ctx) {
				list.forEach(function (p) {
					ctx.globalAlpha = Math.max(0, p.life / p.max)
					ctx.fillStyle = p.color
					ctx.beginPath()
					ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
					ctx.fill()
				})
				ctx.globalAlpha = 1
			},
			clear: function () {
				list.length = 0
			},
		}
	}

	function roundRect(ctx, x, y, w, h, r) {
		ctx.beginPath()
		if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
		else {
			ctx.moveTo(x + r, y)
			ctx.arcTo(x + w, y, x + w, y + h, r)
			ctx.arcTo(x + w, y + h, x, y + h, r)
			ctx.arcTo(x, y + h, x, y, r)
			ctx.arcTo(x, y, x + w, y, r)
			ctx.closePath()
		}
	}

	function float(frame, text, x, y) {
		var el = document.createElement("span")
		el.className = "float"
		el.textContent = text
		el.style.left = x + "px"
		el.style.top = y + "px"
		frame.appendChild(el)
		setTimeout(function () {
			el.remove()
		}, 800)
	}

	function shake(el) {
		el.classList.remove("shake")
		void el.offsetWidth
		el.classList.add("shake")
	}

	return {
		C: C,
		num: num,
		saveMax: saveMax,
		saveMin: saveMin,
		stat: stat,
		setStat: setStat,
		overlay: overlay,
		pad: pad,
		ARROWS: ARROWS,
		KEY_DIR: KEY_DIR,
		bindPad: bindPad,
		swipe: swipe,
		loop: loop,
		particles: particles,
		roundRect: roundRect,
		float: float,
		shake: shake,
	}
})()

;(function () {
	"use strict"
	var K = window.GAMEKIT
	var C = K.C
	var S = window.SFX

	/* ==================== Змейка ==================== */
	window.GAMES.snake = {
		id: "snake",
		title: "Змейка",
		tagline: "Плавное скольжение, растущая скорость и искры на каждом яблоке.",
		meta: "1–3 минуты",
		art:
			'<svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
			'<path d="M60 104h58a16 16 0 0 0 16-16V60a16 16 0 0 1 16-16h44" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" opacity=".9"/>' +
			'<circle cx="200" cy="44" r="9" fill="currentColor"/>' +
			'<circle cx="246" cy="92" r="12" fill="none" stroke="currentColor" stroke-width="3.5" opacity=".8"/>' +
			'<path d="M246 80v-8" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>' +
			"</svg>",
		mount: function (root) {
			var N = 18,
				CELL = 22,
				SIZE = N * CELL,
				KEY = "arcade:snake:best"

			root.innerHTML =
				'<div class="stat-row">' +
				K.stat("Счёт", "sn-score", 0) +
				K.stat("Длина", "sn-len", 3) +
				K.stat("Рекорд", "sn-best", K.num(KEY)) +
				"</div>" +
				'<div class="board-frame" id="sn-frame"><canvas class="board" id="sn-canvas" width="' +
				SIZE +
				'" height="' +
				SIZE +
				'"></canvas>' +
				K.overlay("sn-ov", "Змейка", "Стрелки, WASD или свайпы.", "sn-start", "Играть") +
				"</div>" +
				K.pad() +
				'<p class="hint">Каждое яблоко — +10 очков и немного скорости.</p>'

			var frame = root.querySelector("#sn-frame")
			var canvas = root.querySelector("#sn-canvas")
			var ctx = canvas.getContext("2d")
			var ov = root.querySelector("#sn-ov")
			var ovT = root.querySelector("#sn-ov-title")
			var ovP = root.querySelector("#sn-ov-text")
			var scoreEl = root.querySelector("#sn-score")
			var lenEl = root.querySelector("#sn-len")
			var bestEl = root.querySelector("#sn-best")
			var fx = K.particles()

			var snake, prev, dir, queued, food, score, interval, acc, playing, t

			function place() {
				while (true) {
					var p = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }
					var hit = snake.some(function (s) {
						return s.x === p.x && s.y === p.y
					})
					if (!hit) return p
				}
			}

			function reset() {
				snake = [
					{ x: 8, y: 9 },
					{ x: 7, y: 9 },
					{ x: 6, y: 9 },
				]
				prev = snake.map(function (s) {
					return { x: s.x, y: s.y }
				})
				dir = { x: 1, y: 0 }
				queued = null
				score = 0
				interval = 150
				acc = 0
				t = 0
				food = place()
				fx.clear()
			}

			function gameOver() {
				playing = false
				K.setStat(bestEl, K.saveMax(KEY, score))
				K.shake(frame)
				S.lose()
				fx.burst(snake[0].x * CELL + CELL / 2, snake[0].y * CELL + CELL / 2, {
					count: 26,
					color: C.danger,
					speed: 0.22,
				})
				ovT.textContent = "Игра окончена"
				ovP.textContent = "Счёт: " + score + " · рекорд: " + K.num(KEY)
				ov.hidden = false
			}

			function step() {
				if (queued) {
					dir = queued
					queued = null
				}
				prev = snake.map(function (s) {
					return { x: s.x, y: s.y }
				})
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
					K.setStat(scoreEl, score)
					S.pick()
					fx.burst(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, { count: 16 })
					food = place()
					interval = Math.max(72, interval - 3.4)
					prev.unshift({ x: head.x, y: head.y })
				} else {
					snake.pop()
				}
				K.setStat(lenEl, snake.length)
			}

			function draw(p) {
				ctx.fillStyle = C.ink
				ctx.fillRect(0, 0, SIZE, SIZE)
				ctx.strokeStyle = "rgba(255,255,255,0.045)"
				ctx.lineWidth = 1
				for (var i = 1; i < N; i++) {
					ctx.beginPath()
					ctx.moveTo(i * CELL, 0)
					ctx.lineTo(i * CELL, SIZE)
					ctx.moveTo(0, i * CELL)
					ctx.lineTo(SIZE, i * CELL)
					ctx.stroke()
				}

				/* яблоко с пульсацией */
				var pulse = 1 + Math.sin(t / 260) * 0.12
				var fxc = food.x * CELL + CELL / 2,
					fyc = food.y * CELL + CELL / 2
				var grd = ctx.createRadialGradient(fxc, fyc, 1, fxc, fyc, CELL)
				grd.addColorStop(0, "rgba(230,207,154,0.5)")
				grd.addColorStop(1, "rgba(230,207,154,0)")
				ctx.fillStyle = grd
				ctx.fillRect(fxc - CELL, fyc - CELL, CELL * 2, CELL * 2)
				ctx.fillStyle = C.goldLight
				ctx.beginPath()
				ctx.arc(fxc, fyc, (CELL / 2 - 4) * pulse, 0, Math.PI * 2)
				ctx.fill()

				/* змейка — интерполяция между шагами */
				for (var s = snake.length - 1; s >= 0; s--) {
					var cur = snake[s]
					var old = prev[Math.min(s, prev.length - 1)] || cur
					var x = (old.x + (cur.x - old.x) * p) * CELL
					var y = (old.y + (cur.y - old.y) * p) * CELL
					var k = 1 - s / (snake.length + 6)
					ctx.fillStyle = s === 0 ? C.goldLight : "rgba(201,163,90," + (0.35 + k * 0.5).toFixed(2) + ")"
					var inset = s === 0 ? 2.5 : 3.5
					K.roundRect(ctx, x + inset, y + inset, CELL - inset * 2, CELL - inset * 2, s === 0 ? 7 : 5)
					ctx.fill()
					if (s === 0) {
						ctx.fillStyle = "#0a0c10"
						var ex = x + CELL / 2 + dir.x * 3.5,
							ey = y + CELL / 2 + dir.y * 3.5
						ctx.beginPath()
						ctx.arc(ex - (dir.x ? 0 : 3), ey - (dir.y ? 0 : 3), 1.7, 0, Math.PI * 2)
						ctx.arc(ex + (dir.x ? 0 : 3), ey + (dir.y ? 0 : 3), 1.7, 0, Math.PI * 2)
						ctx.fill()
					}
				}
				fx.draw(ctx)
			}

			function turn(d) {
				if (!playing) return
				var map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
				var nd = map[d]
				var base = queued || dir
				if (!nd || (nd.x === -base.x && nd.y === -base.y) || (nd.x === base.x && nd.y === base.y)) return
				queued = nd
				S.move()
			}

			function start() {
				S.unlock()
				reset()
				playing = true
				K.setStat(scoreEl, 0)
				K.setStat(lenEl, 3)
				ov.hidden = true
				S.click()
			}

			function onKey(e) {
				var d = K.KEY_DIR[e.code]
				if (!d) return
				e.preventDefault()
				turn(d)
			}

			reset()
			playing = false
			root.querySelector("#sn-start").addEventListener("click", start)
			K.bindPad(root, turn)
			document.addEventListener("keydown", onKey)
			var offSwipe = K.swipe(canvas, turn)

			var stop = K.loop(function (dt) {
				t += dt
				fx.update(dt)
				if (playing) {
					acc += dt
					while (acc >= interval) {
						acc -= interval
						if (playing) step()
					}
				}
				draw(playing ? Math.min(1, acc / interval) : 1)
			})

			return function () {
				stop()
				offSwipe()
				document.removeEventListener("keydown", onKey)
			}
		},
	}

	/* ==================== 2048 ==================== */
	window.GAMES.g2048 = {
		id: "g2048",
		title: "2048",
		tagline: "Золотые плитки, анимация слияния и растущие ставки.",
		meta: "3–10 минут",
		art:
			'<svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
			'<rect x="96" y="26" width="44" height="44" rx="8" fill="none" stroke="currentColor" stroke-width="3" opacity=".55"/>' +
			'<rect x="148" y="26" width="44" height="44" rx="8" fill="none" stroke="currentColor" stroke-width="3" opacity=".8"/>' +
			'<rect x="96" y="78" width="44" height="44" rx="8" fill="currentColor" opacity=".9"/>' +
			'<rect x="148" y="78" width="44" height="44" rx="8" fill="none" stroke="currentColor" stroke-width="3"/>' +
			'<path d="M206 48h34m0 0l-10-10m10 10l-10 10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
			"</svg>",
		mount: function (root) {
			var KEY = "arcade:2048:best"
			root.innerHTML =
				'<div class="stat-row">' +
				K.stat("Счёт", "tf-score", 0) +
				K.stat("Максимум", "tf-max", 2) +
				K.stat("Рекорд", "tf-best", K.num(KEY)) +
				"</div>" +
				'<div class="board-frame" id="tf-frame"><div class="grid2048" id="tf-grid"></div>' +
				K.overlay("tf-ov", "Игра окончена", "", "tf-again", "Заново") +
				"</div>" +
				K.pad() +
				'<div class="action-row"><button class="btn btn-small" id="tf-new">Начать заново</button></div>' +
				'<p class="hint">Стрелки, WASD или свайпы. Две одинаковые плитки складываются.</p>'

			var frame = root.querySelector("#tf-frame")
			var gridEl = root.querySelector("#tf-grid")
			var ov = root.querySelector("#tf-ov")
			var ovT = root.querySelector("#tf-ov-title")
			var ovP = root.querySelector("#tf-ov-text")
			var scoreEl = root.querySelector("#tf-score")
			var maxEl = root.querySelector("#tf-max")
			var bestEl = root.querySelector("#tf-best")
			var cells = []
			for (var i = 0; i < 16; i++) {
				var d = document.createElement("div")
				d.className = "tile"
				gridEl.appendChild(d)
				cells.push(d)
			}

			var board, score, won, mergedAt, newAt

			function render() {
				var max = 0
				for (var i = 0; i < 16; i++) {
					var v = board[i]
					var el = cells[i]
					el.textContent = v ? String(v) : ""
					if (v) el.setAttribute("data-v", String(v))
					else el.removeAttribute("data-v")
					el.classList.remove("appear", "merged")
					if (mergedAt.indexOf(i) >= 0) {
						void el.offsetWidth
						el.classList.add("merged")
					} else if (newAt.indexOf(i) >= 0) {
						void el.offsetWidth
						el.classList.add("appear")
					}
					if (v > max) max = v
				}
				scoreEl.textContent = String(score)
				maxEl.textContent = String(max || 2)
				bestEl.textContent = String(K.num(KEY))
			}

			function addTile() {
				var free = []
				board.forEach(function (v, i) {
					if (!v) free.push(i)
				})
				if (!free.length) return
				var idx = free[(Math.random() * free.length) | 0]
				board[idx] = Math.random() < 0.9 ? 2 : 4
				newAt.push(idx)
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

			function collapse(idx) {
				var vals = idx
					.map(function (i) {
						return board[i]
					})
					.filter(Boolean)
				var out = [],
					mergedPos = []
				for (var i = 0; i < vals.length; i++) {
					if (vals[i] === vals[i + 1]) {
						out.push(vals[i] * 2)
						mergedPos.push(out.length - 1)
						score += vals[i] * 2
						S.merge(Math.log2(vals[i] * 2))
						if (vals[i] * 2 >= 2048) won = true
						i++
					} else out.push(vals[i])
				}
				while (out.length < 4) out.push(0)
				var moved = false
				idx.forEach(function (b, k) {
					if (board[b] !== out[k]) moved = true
					board[b] = out[k]
					if (mergedPos.indexOf(k) >= 0) mergedAt.push(b)
				})
				return moved
			}

			function hasMoves() {
				if (
					board.some(function (v) {
						return !v
					})
				)
					return true
				for (var r = 0; r < 4; r++)
					for (var c = 0; c < 4; c++) {
						var v = board[r * 4 + c]
						if (c < 3 && v === board[r * 4 + c + 1]) return true
						if (r < 3 && v === board[(r + 1) * 4 + c]) return true
					}
				return false
			}

			function move(dir) {
				if (!ov.hidden) return
				S.unlock()
				var before = score
				mergedAt = []
				newAt = []
				var moved = false
				lines(dir).forEach(function (row) {
					if (collapse(row)) moved = true
				})
				if (!moved) return
				if (score === before) S.move()
				else K.float(frame, "+" + (score - before), 120, 130)
				addTile()
				K.saveMax(KEY, score)
				render()
				if (won) {
					S.win()
					ovT.textContent = "2048 собрано"
					ovP.textContent = "Счёт: " + score + ". Можно сыграть ещё."
					ov.hidden = false
				} else if (!hasMoves()) {
					S.lose()
					K.shake(frame)
					ovT.textContent = "Ходов больше нет"
					ovP.textContent = "Счёт: " + score + " · рекорд: " + K.num(KEY)
					ov.hidden = false
				}
			}

			function start() {
				S.unlock()
				board = new Array(16).fill(0)
				score = 0
				won = false
				mergedAt = []
				newAt = []
				addTile()
				addTile()
				ov.hidden = true
				render()
				S.click()
			}

			function onKey(e) {
				var d = K.KEY_DIR[e.code]
				if (!d) return
				e.preventDefault()
				move(d)
			}

			root.querySelector("#tf-new").addEventListener("click", start)
			root.querySelector("#tf-again").addEventListener("click", start)
			K.bindPad(root, move)
			document.addEventListener("keydown", onKey)
			var offSwipe = K.swipe(gridEl, move)
			start()

			return function () {
				document.removeEventListener("keydown", onKey)
				offSwipe()
			}
		},
	}

	/* ==================== Тетрис ==================== */
	window.GAMES.tetris = {
		id: "tetris",
		title: "Тетрис",
		tagline: "Тень падения, вспышка на строках и девять уровней скорости.",
		meta: "5–15 минут",
		art:
			'<svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
			'<rect x="120" y="18" width="28" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="3" opacity=".5"/>' +
			'<rect x="148" y="46" width="28" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="3" opacity=".7"/>' +
			'<rect x="92" y="90" width="28" height="28" rx="5" fill="currentColor" opacity=".85"/>' +
			'<rect x="120" y="90" width="28" height="28" rx="5" fill="currentColor" opacity=".6"/>' +
			'<rect x="148" y="90" width="28" height="28" rx="5" fill="currentColor"/>' +
			'<rect x="176" y="90" width="28" height="28" rx="5" fill="currentColor" opacity=".6"/>' +
			"</svg>",
		mount: function (root) {
			var COLS = 10,
				ROWS = 20,
				CELL = 24,
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
			var SHADE = { I: 1, O: 0.82, T: 0.66, S: 0.5, Z: 0.9, J: 0.74, L: 0.58 }
			var NAMES = Object.keys(SHAPES)

			root.innerHTML =
				'<div class="stat-row">' +
				K.stat("Счёт", "tt-score", 0) +
				K.stat("Строки", "tt-lines", 0) +
				K.stat("Уровень", "tt-level", 1) +
				K.stat("Рекорд", "tt-best", K.num(KEY)) +
				"</div>" +
				'<div class="board-frame" id="tt-frame"><canvas class="board" id="tt-canvas" width="' +
				COLS * CELL +
				'" height="' +
				ROWS * CELL +
				'"></canvas>' +
				K.overlay("tt-ov", "Тетрис", "Стрелки — движение, вверх — поворот, пробел — сброс.", "tt-start", "Играть") +
				"</div>" +
				K.pad("rotate") +
				'<div class="action-row"><button class="btn btn-small" id="tt-drop">Сбросить</button></div>' +
				'<p class="hint">Четыре строки за раз — 800 очков на уровень.</p>'

			var frame = root.querySelector("#tt-frame")
			var canvas = root.querySelector("#tt-canvas")
			var ctx = canvas.getContext("2d")
			var ov = root.querySelector("#tt-ov")
			var ovT = root.querySelector("#tt-ov-title")
			var ovP = root.querySelector("#tt-ov-text")
			var scoreEl = root.querySelector("#tt-score")
			var linesEl = root.querySelector("#tt-lines")
			var levelEl = root.querySelector("#tt-level")
			var bestEl = root.querySelector("#tt-best")
			var fx = K.particles()

			var grid, piece, score, lines, level, acc, playing, flash

			function empty() {
				var g = []
				for (var r = 0; r < ROWS; r++) g.push(new Array(COLS).fill(null))
				return g
			}

			function spawn() {
				var name = NAMES[(Math.random() * NAMES.length) | 0]
				var m = SHAPES[name].map(function (r) {
					return r.slice()
				})
				return { name: name, m: m, x: ((COLS - m[0].length) / 2) | 0, y: 0 }
			}

			function collide(p) {
				for (var r = 0; r < p.m.length; r++)
					for (var c = 0; c < p.m[r].length; c++) {
						if (!p.m[r][c]) continue
						var x = p.x + c,
							y = p.y + r
						if (x < 0 || x >= COLS || y >= ROWS) return true
						if (y >= 0 && grid[y][x]) return true
					}
				return false
			}

			function block(x, y, shade, ghost) {
				var px = x * CELL,
					py = y * CELL
				if (ghost) {
					ctx.strokeStyle = "rgba(230,207,154,0.28)"
					ctx.lineWidth = 1.4
					K.roundRect(ctx, px + 2.5, py + 2.5, CELL - 5, CELL - 5, 4)
					ctx.stroke()
					return
				}
				var g = ctx.createLinearGradient(px, py, px, py + CELL)
				g.addColorStop(0, "rgba(230,207,154," + (0.35 + shade * 0.6).toFixed(2) + ")")
				g.addColorStop(1, "rgba(201,163,90," + (0.25 + shade * 0.45).toFixed(2) + ")")
				ctx.fillStyle = g
				K.roundRect(ctx, px + 1.5, py + 1.5, CELL - 3, CELL - 3, 4)
				ctx.fill()
				ctx.strokeStyle = "rgba(255,255,255,0.12)"
				ctx.lineWidth = 1
				ctx.stroke()
			}

			function ghostY() {
				var test = { m: piece.m, x: piece.x, y: piece.y, name: piece.name }
				while (!collide(test)) test.y++
				return test.y - 1
			}

			function draw(dt) {
				ctx.fillStyle = C.ink
				ctx.fillRect(0, 0, canvas.width, canvas.height)
				ctx.strokeStyle = "rgba(255,255,255,0.04)"
				ctx.lineWidth = 1
				for (var i = 1; i < COLS; i++) {
					ctx.beginPath()
					ctx.moveTo(i * CELL, 0)
					ctx.lineTo(i * CELL, canvas.height)
					ctx.stroke()
				}
				for (var r = 0; r < ROWS; r++)
					for (var c = 0; c < COLS; c++) if (grid[r][c]) block(c, r, SHADE[grid[r][c]])
				if (piece && playing) {
					var gy = ghostY()
					piece.m.forEach(function (row, r) {
						row.forEach(function (v, c) {
							if (v) block(piece.x + c, gy + r, 0, true)
						})
					})
					piece.m.forEach(function (row, r) {
						row.forEach(function (v, c) {
							if (v && piece.y + r >= 0) block(piece.x + c, piece.y + r, SHADE[piece.name])
						})
					})
				}
				if (flash > 0) {
					ctx.fillStyle = "rgba(230,207,154," + (flash / 260) * 0.35 + ")"
					ctx.fillRect(0, 0, canvas.width, canvas.height)
					flash -= dt
				}
				fx.draw(ctx)
			}

			function clearLines() {
				var cleared = 0
				for (var r = ROWS - 1; r >= 0; r--) {
					if (
						grid[r].every(function (v) {
							return v
						})
					) {
						for (var c = 0; c < COLS; c++)
							fx.burst(c * CELL + CELL / 2, r * CELL + CELL / 2, { count: 5, speed: 0.1, life: 420 })
						grid.splice(r, 1)
						grid.unshift(new Array(COLS).fill(null))
						cleared++
						r++
					}
				}
				if (!cleared) return
				flash = 260
				S.clear(cleared)
				lines += cleared
				score += { 1: 100, 2: 300, 3: 500, 4: 800 }[cleared] * level
				var newLevel = Math.min(9, 1 + ((lines / 10) | 0))
				if (newLevel !== level) {
					level = newLevel
					S.levelUp()
				}
				K.setStat(scoreEl, score)
				K.setStat(linesEl, lines)
				K.setStat(levelEl, level)
				K.float(frame, "+" + { 1: 100, 2: 300, 3: 500, 4: 800 }[cleared] * level, 90, 150)
			}

			function lock() {
				piece.m.forEach(function (row, r) {
					row.forEach(function (v, c) {
						if (v && piece.y + r >= 0) grid[piece.y + r][piece.x + c] = piece.name
					})
				})
				S.land()
				clearLines()
				piece = spawn()
				if (collide(piece)) gameOver()
			}

			function gameOver() {
				playing = false
				K.setStat(bestEl, K.saveMax(KEY, score))
				K.shake(frame)
				S.lose()
				ovT.textContent = "Игра окончена"
				ovP.textContent = "Счёт: " + score + " · строк: " + lines
				ov.hidden = false
			}

			function softDrop() {
				piece.y++
				if (collide(piece)) {
					piece.y--
					lock()
				}
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
					if (!collide(piece)) {
						S.rotate()
						return
					}
				}
				piece.m = old
				piece.x = oldX
			}

			function hardDrop() {
				if (!playing) return
				while (!collide(piece)) piece.y++
				piece.y--
				S.whoosh()
				lock()
			}

			function act(d) {
				if (!playing) return
				if (d === "left") {
					piece.x--
					if (collide(piece)) piece.x++
					else S.move()
				} else if (d === "right") {
					piece.x++
					if (collide(piece)) piece.x--
					else S.move()
				} else if (d === "up") rotate()
				else if (d === "down") {
					softDrop()
					acc = 0
				}
			}

			function start() {
				S.unlock()
				grid = empty()
				score = 0
				lines = 0
				level = 1
				acc = 0
				flash = 0
				fx.clear()
				piece = spawn()
				playing = true
				K.setStat(scoreEl, 0)
				K.setStat(linesEl, 0)
				K.setStat(levelEl, 1)
				ov.hidden = true
				S.click()
			}

			function onKey(e) {
				if (e.code === "Space") {
					e.preventDefault()
					hardDrop()
					return
				}
				var d = K.KEY_DIR[e.code]
				if (!d) return
				e.preventDefault()
				act(d)
			}

			grid = empty()
			playing = false
			flash = 0
			root.querySelector("#tt-start").addEventListener("click", start)
			root.querySelector("#tt-drop").addEventListener("click", hardDrop)
			K.bindPad(root, act)
			document.addEventListener("keydown", onKey)
			var offSwipe = K.swipe(canvas, act)

			var stop = K.loop(function (dt) {
				fx.update(dt)
				if (playing) {
					acc += dt
					var speed = Math.max(105, 640 - level * 58)
					while (acc >= speed && playing) {
						acc -= speed
						softDrop()
					}
				}
				draw(dt)
			})

			return function () {
				stop()
				offSwipe()
				document.removeEventListener("keydown", onKey)
			}
		},
	}

	/* ==================== Мемори ==================== */
	window.GAMES.memory = {
		id: "memory",
		title: "Мемори",
		tagline: "Восемь гравированных пар и настоящий 3D-переворот карт.",
		meta: "2–4 минуты",
		art:
			'<svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
			'<rect x="92" y="30" width="56" height="84" rx="9" fill="none" stroke="currentColor" stroke-width="3" opacity=".6" transform="rotate(-7 120 72)"/>' +
			'<rect x="160" y="30" width="56" height="84" rx="9" fill="currentColor" opacity=".16" transform="rotate(6 188 72)"/>' +
			'<rect x="160" y="30" width="56" height="84" rx="9" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(6 188 72)"/>' +
			'<path d="M178 72h20M188 62v20" stroke="currentColor" stroke-width="3" stroke-linecap="round" transform="rotate(6 188 72)"/>' +
			"</svg>",
		mount: function (root) {
			var KEY = "arcade:memory:best"
			var ICONS = [
				'<path d="M12 3l2.6 6.2 6.7.5-5.1 4.4 1.5 6.6L12 17.2 6.3 20.7l1.5-6.6L2.7 9.7l6.7-.5z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
				'<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
				'<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
				'<path d="M12 4l8 8-8 8-8-8z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
				'<path d="M5 19V9l7-5 7 5v10z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 19v-6h4v6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
				'<path d="M4 16c3 0 3-8 8-8s5 8 8 8" fill="none" stroke="currentColor" stroke-width="1.6"/>',
				'<path d="M12 21s-7-4.7-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.3-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
				'<path d="M6 20V7m0 0l6-4 6 4v13" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 13h12" stroke="currentColor" stroke-width="1.6"/>',
			]

			root.innerHTML =
				'<div class="stat-row">' +
				K.stat("Ходы", "mm-moves", 0) +
				K.stat("Пары", "mm-pairs", "0/8") +
				K.stat("Лучшее", "mm-best", K.num(KEY) || "—") +
				"</div>" +
				'<div class="board-frame" id="mm-frame"><div class="memory-grid" id="mm-grid"></div>' +
				K.overlay("mm-ov", "Готово", "", "mm-again", "Заново") +
				"</div>" +
				'<div class="action-row"><button class="btn btn-small" id="mm-new">Новая раскладка</button></div>' +
				'<p class="hint">Чем меньше ходов — тем лучше результат.</p>'

			var gridEl = root.querySelector("#mm-grid")
			var ov = root.querySelector("#mm-ov")
			var ovP = root.querySelector("#mm-ov-text")
			var movesEl = root.querySelector("#mm-moves")
			var pairsEl = root.querySelector("#mm-pairs")
			var bestEl = root.querySelector("#mm-best")
			var moves, pairs, open, locked, pending

			function start() {
				S.unlock()
				moves = 0
				pairs = 0
				open = []
				locked = false
				clearTimeout(pending)
				movesEl.textContent = "0"
				pairsEl.textContent = "0/8"
				bestEl.textContent = String(K.num(KEY) || "—")
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
						'<span class="memory-inner">' +
						'<span class="memory-face memory-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></span>' +
						'<span class="memory-face memory-front"><svg viewBox="0 0 24 24" aria-hidden="true">' +
						card.ic +
						"</svg></span></span>"
					b.addEventListener("click", function () {
						flip(b)
					})
					gridEl.appendChild(b)
				})
				S.click()
			}

			function flip(b) {
				if (locked || b.classList.contains("is-open") || b.classList.contains("is-done")) return
				b.classList.add("is-open")
				S.move()
				open.push(b)
				if (open.length < 2) return
				moves++
				K.setStat(movesEl, moves)
				var a = open[0],
					c = open[1]
				if (a.getAttribute("data-i") === c.getAttribute("data-i")) {
					a.classList.add("is-done")
					c.classList.add("is-done")
					open = []
					pairs++
					S.pick()
					pairsEl.textContent = pairs + "/8"
					if (pairs === 8) {
						var best = K.saveMin(KEY, moves)
						K.setStat(bestEl, best)
						S.win()
						ovP.textContent = "Все пары за " + moves + " ходов · лучшее: " + best
						ov.hidden = false
					}
					return
				}
				locked = true
				pending = setTimeout(function () {
					a.classList.remove("is-open")
					c.classList.remove("is-open")
					open = []
					locked = false
				}, 700)
			}

			root.querySelector("#mm-new").addEventListener("click", start)
			root.querySelector("#mm-again").addEventListener("click", start)
			start()

			return function () {
				clearTimeout(pending)
			}
		},
	}

	/* ==================== Тест реакции ==================== */
	window.GAMES.reaction = {
		id: "reaction",
		title: "Тест реакции",
		tagline: "Жди золотого сигнала и жми. Средний человек — 250 мс.",
		meta: "30 секунд",
		art:
			'<svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
			'<circle cx="160" cy="74" r="44" fill="none" stroke="currentColor" stroke-width="3" opacity=".35"/>' +
			'<circle cx="160" cy="74" r="28" fill="none" stroke="currentColor" stroke-width="3" opacity=".65"/>' +
			'<circle cx="160" cy="74" r="9" fill="currentColor"/>' +
			'<path d="M160 18v-10M160 140v-10M96 74H86M234 74h-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".6"/>' +
			"</svg>",
		mount: function (root) {
			var KEY = "arcade:reaction:best"
			root.innerHTML =
				'<div class="stat-row">' +
				K.stat("Последний", "rc-last", "—") +
				K.stat("Средний", "rc-avg", "—") +
				K.stat("Лучший", "rc-best", K.num(KEY) || "—") +
				K.stat("Попытки", "rc-tries", 0) +
				"</div>" +
				'<button class="reaction-pad" id="rc-pad" type="button">Нажми, чтобы начать</button>' +
				'<p class="hint">Когда поле станет золотым — клик или пробел. Фальстарт не считается.</p>'

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
				S.unlock()
				setState("wait", "Жди сигнала…")
				clearTimeout(timer)
				timer = setTimeout(function () {
					startedAt = performance.now()
					setState("go", "Жми")
					S.tone({ freq: 880, dur: 0.1, type: "triangle", vol: 0.16 })
				}, 900 + Math.random() * 2600)
			}

			function hit() {
				if (state === "idle" || state === "fail" || state === "done") return arm()
				if (state === "wait") {
					clearTimeout(timer)
					S.lose()
					return setState("fail", "Фальстарт · нажми ещё раз")
				}
				var ms = Math.round(performance.now() - startedAt)
				results.push(ms)
				var best = K.saveMin(KEY, ms)
				K.setStat(lastEl, ms + " мс")
				K.setStat(
					avgEl,
					Math.round(
						results.reduce(function (a, b) {
							return a + b
						}, 0) / results.length,
					) + " мс",
				)
				K.setStat(bestEl, best + " мс")
				K.setStat(triesEl, results.length)
				if (ms === best) S.win()
				else S.pick()
				setState("done", ms + " мс · ещё попытка")
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
