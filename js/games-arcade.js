/* Три новые игры: шутер, гонки, ферма. Графика рисуется кодом. */
window.GAMES = window.GAMES || {}

;(function () {
	"use strict"
	var K = window.GAMEKIT
	var C = K.C
	var S = window.SFX

	/* ==================== Шутер ==================== */
	window.GAMES.shooter = {
		id: "shooter",
		title: "Орбитальный шутер",
		tagline: "Волны противников, турель с апгрейдом, взрывы и три жизни.",
		meta: "бесконечно · на рефлексы",
		tag: "Новое",
		art:
			'<svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
			'<path d="M160 118l-22-26h44z" fill="currentColor"/>' +
			'<path d="M160 60v28M160 60l-12 16h24z" fill="none" stroke="currentColor" stroke-width="3"/>' +
			'<path d="M160 26v18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
			'<circle cx="104" cy="40" r="11" fill="none" stroke="currentColor" stroke-width="3" opacity=".7"/>' +
			'<circle cx="216" cy="40" r="11" fill="none" stroke="currentColor" stroke-width="3" opacity=".7"/>' +
			'<circle cx="74" cy="92" r="3" fill="currentColor" opacity=".6"/>' +
			'<circle cx="246" cy="104" r="3" fill="currentColor" opacity=".6"/>' +
			'<circle cx="268" cy="58" r="2" fill="currentColor" opacity=".5"/>' +
			"</svg>",
		mount: function (root) {
			var W = 380,
				H = 500,
				KEY = "arcade:shooter:best"

			root.innerHTML =
				'<div class="stat-row">' +
				K.stat("Счёт", "sh-score", 0) +
				K.stat("Волна", "sh-wave", 1) +
				K.stat("Жизни", "sh-lives", 3) +
				K.stat("Рекорд", "sh-best", K.num(KEY)) +
				"</div>" +
				'<div class="board-frame" id="sh-frame"><canvas class="board" id="sh-canvas" width="' +
				W +
				'" height="' +
				H +
				'"></canvas>' +
				K.overlay(
					"sh-ov",
					"Орбитальный шутер",
					"Движение — стрелки, WASD, мышь или палец. Огонь автоматический.",
					"sh-start",
					"В бой",
				) +
				"</div>" +
				'<div class="pad"><button data-dir="left" aria-label="Влево">' +
				K.ARROWS.left +
				'</button><button data-dir="right" aria-label="Вправо">' +
				K.ARROWS.right +
				"</button></div>" +
				'<p class="hint">Каждая волна — быстрее и плотнее. Каждые три волны темп стрельбы растёт.</p>'

			var frame = root.querySelector("#sh-frame")
			var canvas = root.querySelector("#sh-canvas")
			var ctx = canvas.getContext("2d")
			var ov = root.querySelector("#sh-ov")
			var ovT = root.querySelector("#sh-ov-title")
			var ovP = root.querySelector("#sh-ov-text")
			var scoreEl = root.querySelector("#sh-score")
			var waveEl = root.querySelector("#sh-wave")
			var livesEl = root.querySelector("#sh-lives")
			var bestEl = root.querySelector("#sh-best")
			var fx = K.particles()

			var stars = []
			for (var i = 0; i < 70; i++)
				stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 1.6, r: Math.random() * 1.4 + 0.3 })

			var player, bullets, enemies, ebullets, score, wave, lives, playing, fireAcc, spawnAcc, keys, waveLeft, invuln

			function reset() {
				player = { x: W / 2, y: H - 54, w: 26, h: 28, vx: 0 }
				bullets = []
				enemies = []
				ebullets = []
				score = 0
				wave = 1
				lives = 3
				fireAcc = 0
				spawnAcc = 0
				waveLeft = 8
				invuln = 0
				keys = {}
				fx.clear()
			}

			function fireRate() {
				return Math.max(130, 280 - ((wave / 3) | 0) * 30)
			}

			function spawnEnemy() {
				var hp = 1 + ((wave / 4) | 0)
				var kind = Math.random() < 0.22 && wave > 2 ? "heavy" : "scout"
				enemies.push({
					x: 34 + Math.random() * (W - 68),
					y: -30,
					w: kind === "heavy" ? 34 : 24,
					h: kind === "heavy" ? 30 : 22,
					vy: (kind === "heavy" ? 0.032 : 0.05) + wave * 0.0045,
					sway: Math.random() * Math.PI * 2,
					hp: kind === "heavy" ? hp + 2 : hp,
					kind: kind,
					shootAcc: 500 + Math.random() * 1400,
				})
				waveLeft--
			}

			function hitPlayer() {
				if (invuln > 0) return
				lives--
				invuln = 1400
				K.setStat(livesEl, Math.max(0, lives))
				S.explode()
				K.shake(frame)
				fx.burst(player.x, player.y, { count: 26, color: C.danger, speed: 0.22 })
				if (lives <= 0) gameOver()
			}

			function gameOver() {
				playing = false
				K.setStat(bestEl, K.saveMax(KEY, score))
				S.lose()
				ovT.textContent = "Корабль уничтожен"
				ovP.textContent = "Счёт: " + score + " · волна " + wave + " · рекорд " + K.num(KEY)
				ov.hidden = false
			}

			function drawShip(x, y, w, h) {
				ctx.save()
				ctx.translate(x, y)
				var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2)
				g.addColorStop(0, C.goldLight)
				g.addColorStop(1, "rgba(201,163,90,0.55)")
				ctx.fillStyle = g
				ctx.beginPath()
				ctx.moveTo(0, -h / 2)
				ctx.lineTo(w / 2, h / 2)
				ctx.lineTo(0, h / 2 - 7)
				ctx.lineTo(-w / 2, h / 2)
				ctx.closePath()
				ctx.fill()
				ctx.fillStyle = "rgba(10,12,16,0.85)"
				ctx.beginPath()
				ctx.ellipse(0, -1, 3.4, 6, 0, 0, Math.PI * 2)
				ctx.fill()
				/* факел двигателя */
				var fl = 6 + Math.random() * 7
				var fg = ctx.createLinearGradient(0, h / 2 - 6, 0, h / 2 + fl)
				fg.addColorStop(0, "rgba(230,207,154,0.8)")
				fg.addColorStop(1, "rgba(230,207,154,0)")
				ctx.fillStyle = fg
				ctx.beginPath()
				ctx.moveTo(-4, h / 2 - 6)
				ctx.lineTo(0, h / 2 + fl)
				ctx.lineTo(4, h / 2 - 6)
				ctx.closePath()
				ctx.fill()
				ctx.restore()
			}

			function drawEnemy(e) {
				ctx.save()
				ctx.translate(e.x, e.y)
				ctx.strokeStyle = e.kind === "heavy" ? "rgba(208,106,92,0.95)" : "rgba(237,238,241,0.8)"
				ctx.lineWidth = 2
				ctx.fillStyle = e.kind === "heavy" ? "rgba(208,106,92,0.18)" : "rgba(237,238,241,0.08)"
				ctx.beginPath()
				if (e.kind === "heavy") {
					ctx.moveTo(0, e.h / 2)
					ctx.lineTo(e.w / 2, 0)
					ctx.lineTo(e.w / 2 - 6, -e.h / 2)
					ctx.lineTo(-e.w / 2 + 6, -e.h / 2)
					ctx.lineTo(-e.w / 2, 0)
				} else {
					ctx.moveTo(0, e.h / 2)
					ctx.lineTo(e.w / 2, -e.h / 2)
					ctx.lineTo(0, -e.h / 2 + 6)
					ctx.lineTo(-e.w / 2, -e.h / 2)
				}
				ctx.closePath()
				ctx.fill()
				ctx.stroke()
				ctx.restore()
			}

			function update(dt) {
				stars.forEach(function (s) {
					s.y += s.s * dt * 0.06
					if (s.y > H) {
						s.y = -2
						s.x = Math.random() * W
					}
				})
				fx.update(dt)
				if (!playing) return
				if (invuln > 0) invuln -= dt

				var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
				player.vx += (dir * 0.34 - player.vx) * 0.22
				player.x = Math.max(18, Math.min(W - 18, player.x + player.vx * dt))

				fireAcc += dt
				if (fireAcc >= fireRate()) {
					fireAcc = 0
					bullets.push({ x: player.x, y: player.y - 16 })
					S.shoot()
				}

				spawnAcc += dt
				var gap = Math.max(320, 1100 - wave * 60)
				if (spawnAcc > gap && waveLeft > 0) {
					spawnAcc = 0
					spawnEnemy()
				}
				if (waveLeft <= 0 && !enemies.length) {
					wave++
					waveLeft = 7 + wave
					K.setStat(waveEl, wave)
					S.levelUp()
				}

				bullets.forEach(function (b) {
					b.y -= dt * 0.62
				})
				bullets = bullets.filter(function (b) {
					return b.y > -12
				})

				ebullets.forEach(function (b) {
					b.y += dt * 0.24
				})
				ebullets = ebullets.filter(function (b) {
					return b.y < H + 12
				})

				enemies.forEach(function (e) {
					e.sway += dt * 0.003
					e.y += e.vy * dt
					e.x += Math.sin(e.sway) * 0.5
					e.shootAcc -= dt
					if (e.shootAcc <= 0 && e.y > 20 && e.y < H - 120) {
						e.shootAcc = 1400 + Math.random() * 2200
						ebullets.push({ x: e.x, y: e.y + e.h / 2 })
					}
				})

				/* попадания игрока */
				for (var i = enemies.length - 1; i >= 0; i--) {
					var e = enemies[i]
					for (var j = bullets.length - 1; j >= 0; j--) {
						var b = bullets[j]
						if (Math.abs(b.x - e.x) < e.w / 2 + 3 && Math.abs(b.y - e.y) < e.h / 2 + 4) {
							bullets.splice(j, 1)
							e.hp--
							fx.burst(b.x, b.y, { count: 5, speed: 0.1, life: 260 })
							S.hit()
							if (e.hp <= 0) {
								enemies.splice(i, 1)
								score += e.kind === "heavy" ? 50 : 20
								K.setStat(scoreEl, score)
								S.explode()
								fx.burst(e.x, e.y, { count: 24, speed: 0.2, color: e.kind === "heavy" ? C.danger : C.goldLight })
							}
							break
						}
					}
				}

				/* угрозы игроку */
				for (var m = ebullets.length - 1; m >= 0; m--) {
					var eb = ebullets[m]
					if (Math.abs(eb.x - player.x) < 13 && Math.abs(eb.y - player.y) < 15) {
						ebullets.splice(m, 1)
						hitPlayer()
					}
				}
				for (var n = enemies.length - 1; n >= 0; n--) {
					var en = enemies[n]
					if (Math.abs(en.x - player.x) < en.w / 2 + 12 && Math.abs(en.y - player.y) < en.h / 2 + 12) {
						enemies.splice(n, 1)
						hitPlayer()
					} else if (en.y > H + 30) {
						enemies.splice(n, 1)
					}
				}
			}

			function draw() {
				var bg = ctx.createLinearGradient(0, 0, 0, H)
				bg.addColorStop(0, "#0b0e16")
				bg.addColorStop(1, "#080a0d")
				ctx.fillStyle = bg
				ctx.fillRect(0, 0, W, H)
				stars.forEach(function (s) {
					ctx.fillStyle = "rgba(237,238,241," + (0.12 + s.s * 0.16).toFixed(2) + ")"
					ctx.beginPath()
					ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
					ctx.fill()
				})
				ctx.fillStyle = C.goldLight
				bullets.forEach(function (b) {
					ctx.fillRect(b.x - 1.4, b.y - 9, 2.8, 11)
				})
				ctx.fillStyle = C.danger
				ebullets.forEach(function (b) {
					ctx.beginPath()
					ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2)
					ctx.fill()
				})
				enemies.forEach(drawEnemy)
				if (playing && (invuln <= 0 || ((invuln / 120) | 0) % 2 === 0)) drawShip(player.x, player.y, player.w, player.h)
				fx.draw(ctx)
			}

			function start() {
				S.unlock()
				reset()
				playing = true
				K.setStat(scoreEl, 0)
				K.setStat(waveEl, 1)
				K.setStat(livesEl, 3)
				ov.hidden = true
				S.click()
			}

			function onKey(e) {
				var down = e.type === "keydown"
				if (e.code === "ArrowLeft" || e.code === "KeyA") {
					keys.left = down
					e.preventDefault()
				} else if (e.code === "ArrowRight" || e.code === "KeyD") {
					keys.right = down
					e.preventDefault()
				} else if (e.code === "Space" && down) {
					e.preventDefault()
					if (!playing) start()
				}
			}

			function pointer(e) {
				if (!playing) return
				var rect = canvas.getBoundingClientRect()
				var cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
				player.x = Math.max(18, Math.min(W - 18, (cx / rect.width) * W))
			}

			reset()
			playing = false
			root.querySelector("#sh-start").addEventListener("click", start)
			K.bindPad(root, function (d) {
				if (d === "left") player.x = Math.max(18, player.x - 34)
				if (d === "right") player.x = Math.min(W - 18, player.x + 34)
			})
			canvas.addEventListener("mousemove", pointer)
			canvas.addEventListener("touchmove", pointer, { passive: true })
			canvas.addEventListener("touchstart", pointer, { passive: true })
			document.addEventListener("keydown", onKey)
			document.addEventListener("keyup", onKey)

			var stop = K.loop(function (dt) {
				update(dt)
				draw()
			})

			return function () {
				stop()
				canvas.removeEventListener("mousemove", pointer)
				canvas.removeEventListener("touchmove", pointer)
				canvas.removeEventListener("touchstart", pointer)
				document.removeEventListener("keydown", onKey)
				document.removeEventListener("keyup", onKey)
			}
		},
	}

	/* ==================== Гонки ==================== */
	window.GAMES.racing = {
		id: "racing",
		title: "Ночное шоссе",
		tagline: "Трасса без конца, разгон, бонусы за опасные обгоны.",
		meta: "бесконечно · на реакцию",
		tag: "Новое",
		art:
			'<svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
			'<path d="M118 148L140 0M202 148L180 0" stroke="currentColor" stroke-width="3" opacity=".35"/>' +
			'<path d="M160 22v14M160 54v16M160 88v18M160 124v18" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".5"/>' +
			'<rect x="196" y="84" width="34" height="54" rx="9" fill="currentColor" opacity=".9"/>' +
			'<rect x="203" y="94" width="20" height="16" rx="4" fill="#0a0c10" opacity=".7"/>' +
			'<rect x="92" y="26" width="30" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="3" opacity=".7"/>' +
			"</svg>",
		mount: function (root) {
			var W = 320,
				H = 500,
				LANES = 4,
				ROAD = 260,
				X0 = (W - ROAD) / 2,
				LW = ROAD / LANES,
				KEY = "arcade:racing:best"

			root.innerHTML =
				'<div class="stat-row">' +
				K.stat("Счёт", "rr-score", 0) +
				K.stat("Скорость", "rr-speed", "0 км/ч") +
				K.stat("Обгоны", "rr-pass", 0) +
				K.stat("Рекорд", "rr-best", K.num(KEY)) +
				"</div>" +
				'<div class="board-frame" id="rr-frame"><canvas class="board" id="rr-canvas" width="' +
				W +
				'" height="' +
				H +
				'"></canvas>' +
				K.overlay("rr-ov", "Ночное шоссе", "Влево-вправо — стрелки, WASD, свайп или кнопки.", "rr-start", "Старт") +
				"</div>" +
				'<div class="pad"><button data-dir="left" aria-label="Влево">' +
				K.ARROWS.left +
				'</button><button data-dir="right" aria-label="Вправо">' +
				K.ARROWS.right +
				"</button></div>" +
				'<p class="hint">За каждый обгон — очки, за близкий обгон — двойные очки.</p>'

			var frame = root.querySelector("#rr-frame")
			var canvas = root.querySelector("#rr-canvas")
			var ctx = canvas.getContext("2d")
			var ov = root.querySelector("#rr-ov")
			var ovT = root.querySelector("#rr-ov-title")
			var ovP = root.querySelector("#rr-ov-text")
			var scoreEl = root.querySelector("#rr-score")
			var speedEl = root.querySelector("#rr-speed")
			var passEl = root.querySelector("#rr-pass")
			var bestEl = root.querySelector("#rr-best")
			var fx = K.particles()

			var lane, targetX, carX, cars, score, passed, speed, dash, spawnAcc, playing

			function laneX(i) {
				return X0 + LW * i + LW / 2
			}

			function reset() {
				lane = 1
				carX = laneX(lane)
				targetX = carX
				cars = []
				score = 0
				passed = 0
				speed = 0.28
				dash = 0
				spawnAcc = 0
				fx.clear()
			}

			function drawCar(x, y, w, h, enemy) {
				ctx.save()
				ctx.translate(x, y)
				var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2)
				if (enemy) {
					g.addColorStop(0, "rgba(237,238,241,0.22)")
					g.addColorStop(1, "rgba(237,238,241,0.1)")
				} else {
					g.addColorStop(0, C.goldLight)
					g.addColorStop(1, C.gold)
				}
				ctx.fillStyle = g
				K.roundRect(ctx, -w / 2, -h / 2, w, h, 9)
				ctx.fill()
				ctx.strokeStyle = enemy ? "rgba(237,238,241,0.5)" : "rgba(255,255,255,0.35)"
				ctx.lineWidth = 1.4
				ctx.stroke()
				ctx.fillStyle = "rgba(10,12,16,0.75)"
				K.roundRect(ctx, -w / 2 + 5, -h / 2 + 8, w - 10, h * 0.26, 4)
				ctx.fill()
				K.roundRect(ctx, -w / 2 + 5, h / 2 - h * 0.34, w - 10, h * 0.22, 4)
				ctx.fill()
				if (!enemy) {
					ctx.fillStyle = "rgba(230,207,154,0.35)"
					ctx.fillRect(-w / 2 + 3, h / 2 - 3, 6, 3)
					ctx.fillRect(w / 2 - 9, h / 2 - 3, 6, 3)
				}
				ctx.restore()
			}

			function crash() {
				playing = false
				K.setStat(bestEl, K.saveMax(KEY, score))
				S.explode()
				K.shake(frame)
				fx.burst(carX, H - 92, { count: 34, speed: 0.26, color: C.danger })
				ovT.textContent = "Авария"
				ovP.textContent = "Счёт: " + score + " · обгонов: " + passed + " · рекорд: " + K.num(KEY)
				ov.hidden = false
			}

			function move(d) {
				if (!playing) return
				if (d === "left" && lane > 0) lane--
				else if (d === "right" && lane < LANES - 1) lane++
				else return
				targetX = laneX(lane)
				S.move()
			}

			function update(dt) {
				fx.update(dt)
				dash += speed * dt
				if (!playing) return
				speed = Math.min(0.86, speed + dt * 0.000035)
				carX += (targetX - carX) * Math.min(1, dt * 0.016)
				score += dt * speed * 0.06
				scoreEl.textContent = String(score | 0)
				speedEl.textContent = ((speed * 260) | 0) + " км/ч"

				spawnAcc += dt
				var gap = Math.max(340, 900 - speed * 500)
				if (spawnAcc > gap) {
					spawnAcc = 0
					var l = (Math.random() * LANES) | 0
					var tooClose = cars.some(function (c) {
						return c.y < 90 && Math.abs(c.lane - l) < 1
					})
					if (!tooClose) cars.push({ lane: l, y: -70, v: 0.1 + Math.random() * 0.1, scored: false })
				}

				var py = H - 92
				for (var i = cars.length - 1; i >= 0; i--) {
					var c = cars[i]
					c.y += (speed + c.v) * dt * 0.9
					var cx = laneX(c.lane)
					if (Math.abs(cx - carX) < 38 && Math.abs(c.y - py) < 60) return crash()
					if (!c.scored && c.y > py + 30) {
						c.scored = true
						passed++
						var near = Math.abs(cx - carX) < LW * 1.2
						score += near ? 120 : 60
						K.setStat(passEl, passed)
						if (near) {
							S.whoosh()
							K.float(frame, "+120", 24 + Math.random() * 200, 140)
						} else S.coin()
					}
					if (c.y > H + 80) cars.splice(i, 1)
				}
			}

			function draw() {
				ctx.fillStyle = "#07080b"
				ctx.fillRect(0, 0, W, H)
				/* обочина */
				var rg = ctx.createLinearGradient(0, 0, 0, H)
				rg.addColorStop(0, "#12141a")
				rg.addColorStop(1, "#0c0e12")
				ctx.fillStyle = rg
				ctx.fillRect(X0, 0, ROAD, H)
				ctx.strokeStyle = "rgba(230,207,154,0.5)"
				ctx.lineWidth = 2
				ctx.beginPath()
				ctx.moveTo(X0, 0)
				ctx.lineTo(X0, H)
				ctx.moveTo(X0 + ROAD, 0)
				ctx.lineTo(X0 + ROAD, H)
				ctx.stroke()
				/* разметка */
				ctx.strokeStyle = "rgba(237,238,241,0.28)"
				ctx.lineWidth = 3
				ctx.setLineDash([26, 24])
				ctx.lineDashOffset = -dash % 50
				for (var l = 1; l < LANES; l++) {
					ctx.beginPath()
					ctx.moveTo(X0 + LW * l, 0)
					ctx.lineTo(X0 + LW * l, H)
					ctx.stroke()
				}
				ctx.setLineDash([])
				/* свет фар */
				if (playing) {
					var lg = ctx.createLinearGradient(carX, H - 120, carX, 120)
					lg.addColorStop(0, "rgba(230,207,154,0.14)")
					lg.addColorStop(1, "rgba(230,207,154,0)")
					ctx.fillStyle = lg
					ctx.beginPath()
					ctx.moveTo(carX - 14, H - 110)
					ctx.lineTo(carX - 70, 110)
					ctx.lineTo(carX + 70, 110)
					ctx.lineTo(carX + 14, H - 110)
					ctx.closePath()
					ctx.fill()
				}
				cars.forEach(function (c) {
					drawCar(laneX(c.lane), c.y, 44, 74, true)
				})
				if (playing) drawCar(carX, H - 92, 46, 78, false)
				fx.draw(ctx)
			}

			function start() {
				S.unlock()
				reset()
				playing = true
				K.setStat(scoreEl, 0)
				K.setStat(passEl, 0)
				ov.hidden = true
				S.click()
			}

			function onKey(e) {
				var d = K.KEY_DIR[e.code]
				if (d !== "left" && d !== "right") return
				e.preventDefault()
				move(d)
			}

			reset()
			playing = false
			root.querySelector("#rr-start").addEventListener("click", start)
			K.bindPad(root, move)
			document.addEventListener("keydown", onKey)
			var offSwipe = K.swipe(canvas, move)

			var stop = K.loop(function (dt) {
				update(dt)
				draw()
			})

			return function () {
				stop()
				offSwipe()
				document.removeEventListener("keydown", onKey)
			}
		},
	}

	/* ==================== Ферма ==================== */
	window.GAMES.farm = {
		id: "farm",
		title: "Золотая ферма",
		tagline: "Сажай, жди роста, собирай урожай и покупай апгрейды.",
		meta: "спокойно · на расчёт",
		tag: "Новое",
		art:
			'<svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
			'<path d="M40 120h240" stroke="currentColor" stroke-width="3" opacity=".45"/>' +
			'<path d="M96 120V78M96 78l-14 10M96 90l16 8M96 66l-12-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
			'<path d="M160 120V60M160 60l-18 12M160 76l20 10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
			'<circle cx="224" cy="62" r="16" fill="currentColor" opacity=".85"/>' +
			'<path d="M224 78v42" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
			"</svg>",
		mount: function (root) {
			var KEY = "arcade:farm:best"
			var SAVE = "arcade:farm:state"
			var SEED_COST = 10
			var CROPS = [
				{ name: "Пшеница", price: 26, time: 9000 },
				{ name: "Виноград", price: 62, time: 20000 },
				{ name: "Шафран", price: 150, time: 44000 },
			]

			root.innerHTML =
				'<div class="stat-row">' +
				K.stat("Монеты", "fm-coins", 40) +
				K.stat("Собрано", "fm-total", 0) +
				K.stat("Сорт", "fm-crop", CROPS[0].name) +
				K.stat("Рекорд", "fm-best", K.num(KEY)) +
				"</div>" +
				'<div class="board-frame" id="fm-frame"><div class="farm-grid" id="fm-grid"></div></div>' +
				'<div class="shop-row">' +
				'<button class="btn btn-small" id="fm-seed">Сорт: Пшеница · 26 ₽</button>' +
				'<button class="btn btn-small" id="fm-water">Полив − 15% · 120 ₽</button>' +
				'<button class="btn btn-small" id="fm-harvest">Собрать всё</button>' +
				'<button class="btn btn-small" id="fm-reset">Сбросить ферму</button>' +
				"</div>" +
				'<p class="hint" id="fm-hint">Клик по грядке — посадить за 10 ₽. Клик по спелому — собрать урожай.</p>'

			var frame = root.querySelector("#fm-frame")
			var gridEl = root.querySelector("#fm-grid")
			var coinsEl = root.querySelector("#fm-coins")
			var totalEl = root.querySelector("#fm-total")
			var cropEl = root.querySelector("#fm-crop")
			var bestEl = root.querySelector("#fm-best")
			var seedBtn = root.querySelector("#fm-seed")
			var waterBtn = root.querySelector("#fm-water")
			var hintEl = root.querySelector("#fm-hint")

			var st
			try {
				st = JSON.parse(localStorage.getItem(SAVE) || "null")
			} catch (e) {
				st = null
			}
			if (!st || !st.plots || st.plots.length !== 16)
				st = { coins: 40, total: 0, crop: 0, water: 0, plots: new Array(16).fill(null) }

			function save() {
				localStorage.setItem(SAVE, JSON.stringify(st))
				K.saveMax(KEY, st.total)
			}

			function growTime(cropIdx) {
				return CROPS[cropIdx].time * Math.pow(0.85, st.water)
			}

			function sprout(stage) {
				if (stage < 0.34)
					return '<svg viewBox="0 0 40 40"><path d="M20 32v-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity=".8"/><path d="M20 26c-4 0-6-3-6-3s3-1 6 3z" fill="currentColor" opacity=".8"/></svg>'
				if (stage < 0.72)
					return '<svg viewBox="0 0 40 40"><path d="M20 32V16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 24c-6 0-8-5-8-5s5-1 8 5zM20 20c6 0 8-5 8-5s-5-1-8 5z" fill="currentColor" opacity=".65"/></svg>'
				return '<svg viewBox="0 0 40 40"><path d="M20 34V18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="13" r="7" fill="currentColor"/><path d="M20 24c-6 0-8-5-8-5s5-1 8 5z" fill="currentColor" opacity=".6"/></svg>'
			}

			var plotEls = []
			for (var i = 0; i < 16; i++) {
				var b = document.createElement("button")
				b.className = "plot"
				b.type = "button"
				b.innerHTML = '<div class="plot-bar"><span></span></div>'
				;(function (idx, el) {
					el.addEventListener("click", function () {
						tap(idx, el)
					})
				})(i, b)
				gridEl.appendChild(b)
				plotEls.push(b)
			}

			function setStats() {
				coinsEl.textContent = String(st.coins | 0)
				totalEl.textContent = String(st.total | 0)
				cropEl.textContent = CROPS[st.crop].name
				bestEl.textContent = String(K.num(KEY))
				seedBtn.textContent = "Сорт: " + CROPS[st.crop].name + " · " + CROPS[st.crop].price + " ₽"
				waterBtn.textContent = "Полив −15% · " + (120 + st.water * 140) + " ₽"
			}

			function plant(idx) {
				if (st.coins < SEED_COST) {
					hintEl.textContent = "Не хватает монет — соберите спелый урожай."
					S.lose()
					return
				}
				st.coins -= SEED_COST
				st.plots[idx] = { crop: st.crop, at: Date.now(), dur: growTime(st.crop) }
				S.plant()
				setStats()
				save()
			}

			function harvest(idx, el) {
				var p = st.plots[idx]
				if (!p) return
				var price = CROPS[p.crop].price
				st.coins += price
				st.total += price
				st.plots[idx] = null
				S.coin()
				var rect = el.getBoundingClientRect()
				var fRect = frame.getBoundingClientRect()
				K.float(frame, "+" + price + " ₽", rect.left - fRect.left + 8, rect.top - fRect.top)
				K.setStat(coinsEl, st.coins | 0)
				K.setStat(totalEl, st.total | 0)
				K.saveMax(KEY, st.total)
				bestEl.textContent = String(K.num(KEY))
				save()
			}

			function tap(idx, el) {
				S.unlock()
				var p = st.plots[idx]
				if (!p) return plant(idx)
				if (Date.now() - p.at >= p.dur) harvest(idx, el)
				else {
					hintEl.textContent = "Ещё растёт: " + Math.ceil((p.dur - (Date.now() - p.at)) / 1000) + " сек"
					S.move()
				}
			}

			function render() {
				var now = Date.now()
				st.plots.forEach(function (p, i) {
					var el = plotEls[i]
					if (!p) {
						if (el.dataset.stage !== "empty") {
							el.dataset.stage = "empty"
							el.innerHTML = '<div class="plot-bar"><span></span></div>'
							el.classList.remove("ready")
						}
						return
					}
					var k = Math.min(1, (now - p.at) / p.dur)
					var stage = k < 0.34 ? "a" : k < 0.72 ? "b" : "c"
					if (el.dataset.stage !== stage) {
						el.dataset.stage = stage
						el.innerHTML = sprout(k) + '<div class="plot-bar"><span></span></div>'
						if (stage === "c") S.grow()
					}
					var fill = el.querySelector(".plot-bar span")
					if (fill) fill.style.width = (k * 100).toFixed(1) + "%"
					el.classList.toggle("ready", k >= 1)
				})
			}

			seedBtn.addEventListener("click", function () {
				st.crop = (st.crop + 1) % CROPS.length
				S.click()
				hintEl.textContent =
					"Сорт «" +
					CROPS[st.crop].name +
					"»: " +
					CROPS[st.crop].price +
					" ₽ за сбор, рост " +
					Math.round(growTime(st.crop) / 1000) +
					" сек."
				setStats()
				save()
			})

			waterBtn.addEventListener("click", function () {
				var cost = 120 + st.water * 140
				if (st.coins < cost) {
					hintEl.textContent = "Для апгрейда нужно " + cost + " ₽."
					S.lose()
					return
				}
				st.coins -= cost
				st.water++
				S.levelUp()
				hintEl.textContent = "Полив уровня " + st.water + ": рост быстрее на " + (100 - Math.round(Math.pow(0.85, st.water) * 100)) + "%."
				setStats()
				save()
			})

			root.querySelector("#fm-harvest").addEventListener("click", function () {
				var got = 0
				st.plots.forEach(function (p, i) {
					if (p && Date.now() - p.at >= p.dur) {
						got += CROPS[p.crop].price
						st.coins += CROPS[p.crop].price
						st.total += CROPS[p.crop].price
						st.plots[i] = null
					}
				})
				if (!got) {
					hintEl.textContent = "Спелого урожая пока нет."
					S.move()
					return
				}
				S.win()
				K.float(frame, "+" + got + " ₽", 110, 120)
				K.setStat(coinsEl, st.coins | 0)
				K.setStat(totalEl, st.total | 0)
				K.saveMax(KEY, st.total)
				bestEl.textContent = String(K.num(KEY))
				save()
			})

			root.querySelector("#fm-reset").addEventListener("click", function () {
				st = { coins: 40, total: 0, crop: 0, water: 0, plots: new Array(16).fill(null) }
				plotEls.forEach(function (el) {
					el.dataset.stage = ""
				})
				S.click()
				hintEl.textContent = "Ферма сброшена. На старте — 40 ₽."
				setStats()
				save()
			})

			setStats()
			render()
			var timer = setInterval(render, 250)

			return function () {
				clearInterval(timer)
				save()
			}
		},
	}
})()
