/* Звуковой движок на WebAudio: никаких внешних файлов, всё синтезируется. */
window.SFX = (function () {
	"use strict"
	var ctx = null
	var master = null
	var enabled = localStorage.getItem("arcade:sound") !== "off"

	function ac() {
		if (!ctx) {
			var AC = window.AudioContext || window.webkitAudioContext
			if (!AC) return null
			ctx = new AC()
			master = ctx.createGain()
			master.gain.value = 0.5
			master.connect(ctx.destination)
		}
		if (ctx.state === "suspended") ctx.resume()
		return ctx
	}

	function tone(o) {
		if (!enabled) return
		var c = ac()
		if (!c) return
		var t = c.currentTime + (o.delay || 0)
		var osc = c.createOscillator()
		var gain = c.createGain()
		var dur = o.dur || 0.12
		osc.type = o.type || "sine"
		osc.frequency.setValueAtTime(o.freq || 440, t)
		if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + dur)
		gain.gain.setValueAtTime(0.0001, t)
		gain.gain.linearRampToValueAtTime(o.vol == null ? 0.18 : o.vol, t + 0.012)
		gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
		osc.connect(gain)
		gain.connect(master)
		osc.start(t)
		osc.stop(t + dur + 0.03)
	}

	function noise(o) {
		if (!enabled) return
		var c = ac()
		if (!c) return
		var dur = o.dur || 0.2
		var t = c.currentTime + (o.delay || 0)
		var len = Math.floor(c.sampleRate * dur)
		var buf = c.createBuffer(1, len, c.sampleRate)
		var data = buf.getChannelData(0)
		for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
		var src = c.createBufferSource()
		src.buffer = buf
		var filter = c.createBiquadFilter()
		filter.type = o.type || "lowpass"
		filter.frequency.setValueAtTime(o.freq || 900, t)
		if (o.to) filter.frequency.exponentialRampToValueAtTime(Math.max(80, o.to), t + dur)
		var gain = c.createGain()
		gain.gain.setValueAtTime(o.vol == null ? 0.16 : o.vol, t)
		gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
		src.connect(filter)
		filter.connect(gain)
		gain.connect(master)
		src.start(t)
	}

	var api = {
		get enabled() {
			return enabled
		},
		toggle: function () {
			enabled = !enabled
			localStorage.setItem("arcade:sound", enabled ? "on" : "off")
			if (enabled) api.click()
			return enabled
		},
		unlock: function () {
			ac()
		},
		click: function () {
			tone({ freq: 520, to: 660, dur: 0.07, type: "triangle", vol: 0.12 })
		},
		move: function () {
			tone({ freq: 240, to: 300, dur: 0.05, type: "square", vol: 0.05 })
		},
		pick: function () {
			tone({ freq: 760, to: 1180, dur: 0.11, type: "triangle", vol: 0.16 })
		},
		coin: function () {
			tone({ freq: 980, dur: 0.07, type: "square", vol: 0.12 })
			tone({ freq: 1480, dur: 0.12, type: "square", vol: 0.1, delay: 0.06 })
		},
		merge: function (n) {
			var base = 330 * Math.pow(1.09, n || 1)
			tone({ freq: base, to: base * 1.5, dur: 0.13, type: "sine", vol: 0.17 })
		},
		land: function () {
			noise({ dur: 0.09, freq: 420, to: 140, vol: 0.12 })
		},
		clear: function (rows) {
			var n = rows || 1
			for (var i = 0; i < n; i++) tone({ freq: 520 + i * 160, dur: 0.14, type: "triangle", vol: 0.15, delay: i * 0.06 })
		},
		rotate: function () {
			tone({ freq: 380, to: 520, dur: 0.06, type: "square", vol: 0.07 })
		},
		shoot: function () {
			tone({ freq: 900, to: 260, dur: 0.08, type: "sawtooth", vol: 0.09 })
		},
		hit: function () {
			noise({ dur: 0.14, freq: 1600, to: 300, vol: 0.13 })
		},
		explode: function () {
			noise({ dur: 0.42, freq: 1100, to: 90, vol: 0.2 })
			tone({ freq: 130, to: 50, dur: 0.34, type: "sine", vol: 0.14 })
		},
		whoosh: function () {
			noise({ dur: 0.22, freq: 600, to: 1800, vol: 0.07, type: "bandpass" })
		},
		plant: function () {
			noise({ dur: 0.12, freq: 700, to: 220, vol: 0.09 })
		},
		grow: function () {
			tone({ freq: 440, to: 720, dur: 0.16, type: "sine", vol: 0.09 })
		},
		levelUp: function () {
			;[523, 659, 784, 1046].forEach(function (f, i) {
				tone({ freq: f, dur: 0.16, type: "triangle", vol: 0.14, delay: i * 0.08 })
			})
		},
		win: function () {
			;[523, 784, 1046, 1318].forEach(function (f, i) {
				tone({ freq: f, dur: 0.22, type: "sine", vol: 0.15, delay: i * 0.1 })
			})
		},
		lose: function () {
			;[440, 330, 247, 165].forEach(function (f, i) {
				tone({ freq: f, dur: 0.24, type: "triangle", vol: 0.14, delay: i * 0.11 })
			})
		},
		tone: tone,
		noise: noise,
	}
	return api
})()
