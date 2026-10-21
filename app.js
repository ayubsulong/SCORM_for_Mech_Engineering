(function () {
  "use strict";

  var SECTIONS = ["Welcome", "What is it?", "How it works", "Two properties", "Uses", "Engineer's view", "Quiz", "Summary"];
  var N = SECTIONS.length;
  var PASS = 80;
  var NS = "http://www.w3.org/2000/svg";

  var QUIZ = [
    { q: "Nitinol is an alloy made of roughly equal parts of which two metals?",
      o: ["Iron and carbon", "Nickel and titanium", "Copper and zinc", "Aluminium and magnesium"], a: 1,
      why: "Ni + Ti, roughly 50/50. The name even contains the symbols Ni and Ti." },
    { q: "Which phase is the soft, easily deformed phase of Nitinol?",
      o: ["Austenite", "Ferrite", "Martensite", "Pearlite"], a: 2,
      why: "Martensite is the cold, flexible phase. You can deform it and it keeps the new shape." },
    { q: "What happens when a deformed Nitinol part is heated above its transition temperature?",
      o: ["It melts", "It turns into austenite and returns to its remembered shape", "It becomes permanently softer", "It loses all its nickel"], a: 1,
      why: "Heating above the transition temperature gives austenite, which snaps back to the shape set in manufacturing." },
    { q: "At the atomic level, how does the phase change happen?",
      o: ["Atomic bonds break and re-form randomly", "Atoms evaporate and condense", "Atoms shift their arrangement without breaking bonds", "Electrons leave the metal"], a: 2,
      why: "Like a folding chair opening and closing, the geometry changes while the bonds stay intact." },
    { q: "Eyeglass frames that can be sat on and spring back are using which property?",
      o: ["Superelasticity", "Corrosion resistance", "Magnetism", "Thermal expansion"], a: 0,
      why: "Superelasticity: very large recoverable strain that returns once the load is removed." },
    { q: "A Nitinol wire used as an artificial muscle contracts when electric current flows. What is the real trigger?",
      o: ["The magnetic field", "Heating of the wire", "Light", "Sound"], a: 1,
      why: "The current heats the wire above the transition temperature, so it changes phase and contracts." },
    { q: "Why is Nitinol well suited to medical devices such as stents?",
      o: ["It is the cheapest metal", "Its transition temperature can be tuned to near body temperature (about 37 °C)", "It never reacts with anything", "It is non-metallic"], a: 1,
      why: "The transition temperature can be engineered to match the human body." },
    { q: "Which is a real engineering drawback of Nitinol?",
      o: ["It cannot change shape", "It is more costly and harder to process than ordinary steel", "It is too light to use", "It only works in a vacuum"], a: 1,
      why: "Cost and difficult processing (machining, welding, heat treatment) are real limits. Cooling time also limits actuator speed." }
  ];

  var CLS = [
    { t: "Glasses frames that survive being sat on", a: "se", w: "Superelasticity: large strain recovers when the load is removed." },
    { t: "A robot 'muscle' wire that shortens when current flows", a: "sm", w: "Shape memory: electrical heating triggers the phase change." },
    { t: "A valve that opens when the surrounding water gets hot", a: "sm", w: "Shape memory: the temperature itself is the trigger." },
    { t: "A thin wire that is squeezed flat in a bag and pops back to shape when released", a: "se", w: "Superelasticity: recovery comes from unloading, not from heating." }
  ];

  var state = { cur: 0, visited: [], answers: [], done: false, score: 0 };

  function $(id) { return document.getElementById(id); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function sv(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- SCORM state ---------- */
  function load() {
    try {
      var raw = SCORM.get("cmi.suspend_data");
      if (raw) {
        var d = JSON.parse(raw);
        state.cur = clamp(d.c || 0, 0, N - 1);
        state.visited = d.v || [];
        state.answers = d.a || [];
        state.done = !!d.d;
        state.score = d.s || 0;
      }
    } catch (e) {}
  }
  function save() {
    SCORM.set("cmi.core.lesson_location", state.cur);
    SCORM.set("cmi.suspend_data", JSON.stringify({ c: state.cur, v: state.visited, a: state.answers, d: state.done ? 1 : 0, s: state.score }));
    SCORM.saveTime();
    SCORM.commit();
  }
  function reportResult() {
    SCORM.set("cmi.core.score.min", 0);
    SCORM.set("cmi.core.score.max", 100);
    SCORM.set("cmi.core.score.raw", state.score);
    SCORM.set("cmi.core.lesson_status", state.score >= PASS ? "passed" : "failed");
    save();
  }

  /* ---------- Navigation ---------- */
  function buildDots() {
    var nav = $("dots");
    SECTIONS.forEach(function (name, i) {
      var b = el("button", { "class": "dot", type: "button" }, (i + 1) + ". " + name);
      b.addEventListener("click", function () { show(i); });
      nav.appendChild(b);
    });
  }
  function show(i) {
    state.cur = clamp(i, 0, N - 1);
    if (state.visited.indexOf(state.cur) < 0) state.visited.push(state.cur);
    qa(".panel").forEach(function (p, idx) { p.classList.toggle("active", idx === state.cur); });
    qa(".dot").forEach(function (d, idx) {
      d.classList.toggle("active", idx === state.cur);
      d.classList.toggle("visited", state.visited.indexOf(idx) >= 0 && idx !== state.cur);
    });
    $("bar").style.width = Math.round(state.visited.length / N * 100) + "%";
    $("stepLabel").textContent = "Section " + (state.cur + 1) + " of " + N;
    $("prev").disabled = state.cur === 0;
    var nx = $("next");
    nx.textContent = state.cur === N - 1 ? "Finish ✔" : "Next ▶";
    $("midLabel").textContent = SECTIONS[state.cur];
    if (state.cur === 6) renderQuiz();
    if (state.cur === 7) renderResult();
    window.scrollTo(0, 0);
    save();
  }

  /* ---------- Generic widgets ---------- */
  function initFlips() {
    qa("[data-flip]").forEach(function (b) {
      b.addEventListener("click", function () { b.classList.toggle("open"); });
    });
  }
  function initAccordions() {
    qa("[data-acc]").forEach(function (a) {
      var btn = a.querySelector("button");
      btn.addEventListener("click", function () {
        var open = a.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }
  function initTabs() {
    qa("[data-tab]").forEach(function (t) {
      t.addEventListener("click", function () {
        qa("[data-tab]").forEach(function (x) { x.classList.toggle("active", x === t); });
        qa("#s3 .tabpane").forEach(function (p) { p.classList.toggle("active", p.id === t.getAttribute("data-tab")); });
        if (t.getAttribute("data-tab") === "t-se") drawSS();
      });
    });
    qa("[data-pc]").forEach(function (t) {
      t.addEventListener("click", function () {
        var k = t.getAttribute("data-pc");
        qa("[data-pc]").forEach(function (x) { x.classList.toggle("active", x === t); });
        $("pc-pro").style.display = k === "pro" ? "block" : "none";
        $("pc-con").style.display = k === "con" ? "block" : "none";
      });
    });
  }

  /* ---------- Mini check (section 1) ---------- */
  function initMini() {
    var opts = ["Iron and carbon", "Nickel and titanium", "Copper and zinc", "Aluminium and magnesium"];
    var box = $("mini1");
    opts.forEach(function (o, i) {
      var b = el("button", { "class": "btn secondary", type: "button" }, o);
      b.addEventListener("click", function () {
        $("mini1fb").innerHTML = i === 1 ? '<span class="good">Correct!</span> Ni + Ti, about half each.' : '<span class="bad">Not quite.</span> Look at the name: Ni, Ti + NOL.';
      });
      box.appendChild(b);
    });
  }

  /* ---------- Phase simulator (section 2) ---------- */
  var AS = 25, AF = 33;
  function austFrac(T) { return clamp((T - AS) / (AF - AS), 0, 1); }
  function drawSim() {
    var T = +$("temp").value, f = austFrac(T);
    var lat = $("latSvg"), wire = $("wireSvg");
    while (lat.firstChild) lat.removeChild(lat.firstChild);
    while (wire.firstChild) wire.removeChild(wire.firstChild);

    // lattice
    lat.appendChild(sv("text", { x: 150, y: 18, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "#5b6b7b" }, "Crystal lattice (schematic)"));
    var rows = 5, cols = 6, sp = 42, x0 = 45, y0 = 52, shift = (1 - f) * 13;
    for (var r = 0; r < rows; r++) {
      var off = (r % 2 ? 1 : -1) * shift;
      lat.appendChild(sv("line", { x1: x0 + off - 8, y1: y0 + r * 38, x2: x0 + (cols - 1) * sp + off + 8, y2: y0 + r * 38, stroke: "#c9d6e3", "stroke-width": 2 }));
      for (var c = 0; c < cols; c++) {
        lat.appendChild(sv("circle", { cx: x0 + c * sp + off, cy: y0 + r * 38, r: 11, fill: (r + c) % 2 ? "#f2a33a" : "#3b82c4", stroke: "#fff", "stroke-width": 1.5 }));
      }
    }
    lat.appendChild(sv("text", { x: 150, y: 222, "text-anchor": "middle", "font-size": 12, fill: "#5b6b7b" },
      f === 0 ? "Zig-zag rows: easy to deform" : f === 1 ? "Aligned rows: rigid, remembered shape" : "Rows are straightening…"));

    // wire
    wire.appendChild(sv("text", { x: 150, y: 18, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "#5b6b7b" }, "Nitinol wire"));
    wire.appendChild(sv("rect", { x: 14, y: 168, width: 272, height: 6, rx: 3, fill: "#e3ebf4" }));
    var pts = [], i;
    for (i = 0; i <= 20; i++) {
      pts.push((30 + i * 12) + "," + (150 - 95 * (1 - f) * Math.sin(i * Math.PI / 20)).toFixed(1));
    }
    var hue = 215 - f * 190; // blue -> orange/red
    wire.appendChild(sv("polyline", { points: pts.join(" "), fill: "none", stroke: "hsl(" + hue + ",75%,48%)", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    wire.appendChild(sv("circle", { cx: 30, cy: 150, r: 8, fill: "#1b2733" }));
    wire.appendChild(sv("circle", { cx: 270, cy: 150, r: 8, fill: "#1b2733" }));
    wire.appendChild(sv("text", { x: 150, y: 205, "text-anchor": "middle", "font-size": 12, fill: "#5b6b7b" }, f === 0 ? "Bent while cold" : f === 1 ? "Original straight shape recovered" : "Recovering…"));

    // readouts
    $("rdT").textContent = T + " °C";
    var ph = $("rdPhase");
    ph.textContent = f === 0 ? "Martensite (cold)" : f === 1 ? "Austenite (hot)" : "Mixed phases";
    ph.className = "pill " + (f === 0 ? "cold" : f === 1 ? "hot" : "mix");
    $("rdPct").textContent = Math.round(f * 100) + "% austenite";
    $("simMsg").textContent = f === 0 ? "Cold: the lattice is zig-zag and the wire stays bent. You could still bend it more."
      : f === 1 ? (T >= 36 && T <= 38 ? "At body temperature the structure is fully austenite. This is why a stent can open inside the body." : "Above the transition: fully austenite. The wire has forcefully returned to its original shape.")
      : "In the transition range: martensite is converting to austenite as the temperature rises.";
  }
  function initSim() {
    $("temp").addEventListener("input", drawSim);
    $("btnBody").addEventListener("click", function () { $("temp").value = 37; drawSim(); });
    $("btnCold").addEventListener("click", function () { $("temp").value = 10; drawSim(); });
    drawSim();
  }

  /* ---------- Stress-strain demo (section 3) ---------- */
  var LOAD = [[0, 0], [1.2, 420], [5.5, 470], [6.5, 640]];
  var UNLOAD = [[0, 0], [1.8, 190], [5.6, 240], [6.5, 640]];
  var dir = "load";
  function interp(pts, x) {
    for (var i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return pts[pts.length - 1][1];
  }
  function px(s) { return 40 + s / 8 * 260; }
  function py(m) { return 175 - m / 700 * 150; }
  function pathOf(pts) {
    return pts.map(function (p, i) { return (i ? "L" : "M") + px(p[0]).toFixed(1) + " " + py(p[1]).toFixed(1); }).join(" ");
  }
  function drawSS() {
    var s = $("ssSvg");
    while (s.firstChild) s.removeChild(s.firstChild);
    s.appendChild(sv("line", { x1: 40, y1: 175, x2: 305, y2: 175, stroke: "#5b6b7b", "stroke-width": 1.5 }));
    s.appendChild(sv("line", { x1: 40, y1: 175, x2: 40, y2: 15, stroke: "#5b6b7b", "stroke-width": 1.5 }));
    s.appendChild(sv("text", { x: 175, y: 202, "text-anchor": "middle", "font-size": 11, fill: "#5b6b7b" }, "Strain (%)"));
    var yl = sv("text", { x: 12, y: 95, "text-anchor": "middle", "font-size": 11, fill: "#5b6b7b", transform: "rotate(-90 12 95)" }, "Stress (MPa)");
    s.appendChild(yl);
    [0, 2, 4, 6, 8].forEach(function (t) { s.appendChild(sv("text", { x: px(t), y: 188, "text-anchor": "middle", "font-size": 10, fill: "#5b6b7b" }, String(t))); });
    [0, 200, 400, 600].forEach(function (t) { s.appendChild(sv("text", { x: 34, y: py(t) + 3, "text-anchor": "end", "font-size": 10, fill: "#5b6b7b" }, String(t))); });
    s.appendChild(sv("path", { d: pathOf(LOAD), fill: "none", stroke: "#2a7de1", "stroke-width": 3 }));
    s.appendChild(sv("path", { d: pathOf(UNLOAD), fill: "none", stroke: "#e4572e", "stroke-width": 3, "stroke-dasharray": "6 4" }));
    s.appendChild(sv("text", { x: 150, y: py(470) - 8, "font-size": 11, fill: "#2a7de1", "font-weight": 700 }, "loading plateau"));
    s.appendChild(sv("text", { x: 120, y: py(190) + 15, "font-size": 11, fill: "#e4572e", "font-weight": 700 }, "unloading plateau"));
    var strain = +$("strain").value / 10;
    var stress = interp(dir === "load" ? LOAD : UNLOAD, strain);
    s.appendChild(sv("circle", { cx: px(strain), cy: py(stress), r: 7, fill: "#1b2733", stroke: "#fff", "stroke-width": 2 }));
    $("rdStrain").textContent = "Strain " + strain.toFixed(1) + "%";
    $("rdStress").textContent = "Stress " + Math.round(stress) + " MPa";
  }
  function initSS() {
    $("strain").addEventListener("input", drawSS);
    qa("[data-dir]").forEach(function (b) {
      b.addEventListener("click", function () {
        dir = b.getAttribute("data-dir");
        qa("[data-dir]").forEach(function (x) { x.classList.toggle("active", x === b); });
        $("strain").value = dir === "load" ? 0 : 65;
        drawSS();
      });
    });
    drawSS();
  }

  /* ---------- Classification activity (section 4) ---------- */
  function initClassify() {
    var box = $("classify"), correct = 0, answered = 0;
    CLS.forEach(function (it) {
      var row = el("div", { "class": "cls" });
      row.appendChild(el("div", { "class": "q" }, it.t));
      var opts = el("div", { "class": "opts" });
      [["sm", "Shape memory"], ["se", "Superelasticity"]].forEach(function (p) {
        var b = el("button", { type: "button" }, p[1]);
        b.addEventListener("click", function () {
          if (row.classList.contains("done")) return;
          row.classList.add("done");
          answered++;
          var ok = p[0] === it.a;
          if (ok) correct++;
          b.classList.add(ok ? "right" : "wrong");
          fb.innerHTML = (ok ? '<span class="good">Correct. </span>' : '<span class="bad">Not this one. </span>') + it.w;
          $("clsScore").textContent = "Score: " + correct + " / " + CLS.length + (answered === CLS.length ? " (activity complete)" : "");
        });
        opts.appendChild(b);
      });
      row.appendChild(opts);
      var fb = el("div", { "class": "fb" });
      row.appendChild(fb);
      box.appendChild(row);
    });
  }

  /* ---------- Quiz (section 6) ---------- */
  function renderQuiz() {
    var box = $("quizBox");
    box.innerHTML = "";
    if (state.answers.length >= QUIZ.length) { renderQuizResult(box); return; }
    var qi = Math.min(state.answers.length, QUIZ.length - 1);
    var item = QUIZ[qi];
    var meta = el("div", { "class": "qmeta" });
    meta.appendChild(el("span", null, "Question " + (qi + 1) + " of " + QUIZ.length));
    meta.appendChild(el("span", null, "Pass mark: " + PASS + "%"));
    box.appendChild(meta);
    box.appendChild(el("h3", null, item.q));
    var fb = el("div", { "class": "qfb", "aria-live": "polite" });
    var nextBtn = el("button", { "class": "btn", type: "button", style: "display:none" }, qi === QUIZ.length - 1 ? "See results" : "Next question");
    var btns = [];
    item.o.forEach(function (txt, oi) {
      var b = el("button", { "class": "opt", type: "button" }, txt);
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.disabled = true; });
        var ok = oi === item.a;
        b.classList.add(ok ? "right" : "wrong");
        if (!ok) btns[item.a].classList.add("right");
        fb.style.display = "block";
        fb.innerHTML = (ok ? '<span class="good">Correct! </span>' : '<span class="bad">Not quite. </span>') + item.why;
        state.answers.push(oi);
        if (state.answers.length === QUIZ.length) finishQuiz();
        else save();
        nextBtn.style.display = "inline-block";
      });
      btns.push(b);
      box.appendChild(b);
    });
    box.appendChild(fb);
    nextBtn.addEventListener("click", function () { renderQuiz(); });
    box.appendChild(nextBtn);
  }
  function finishQuiz() {
    var right = 0;
    QUIZ.forEach(function (q, i) { if (state.answers[i] === q.a) right++; });
    state.score = Math.round(right / QUIZ.length * 100);
    state.done = true;
    reportResult();
  }
  function renderQuizResult(box) {
    var right = 0;
    QUIZ.forEach(function (q, i) { if (state.answers[i] === q.a) right++; });
    var pass = state.score >= PASS;
    box.appendChild(el("div", { "class": "score-big " + (pass ? "result-pass" : "result-fail") }, state.score + "%"));
    box.appendChild(el("h3", null, pass ? "Passed. Well done!" : "Not yet. Review and try again."));
    box.appendChild(el("p", null, "You answered " + right + " of " + QUIZ.length + " correctly."));
    var wrong = QUIZ.filter(function (q, i) { return state.answers[i] !== q.a; });
    if (wrong.length) {
      box.appendChild(el("h3", null, "Review"));
      wrong.forEach(function (q) {
        var d = el("div", { "class": "note" });
        d.innerHTML = "<b></b><br>";
        d.firstChild.textContent = q.q;
        d.appendChild(document.createTextNode("Answer: " + q.o[q.a] + ". " + q.why));
        box.appendChild(d);
      });
    }
    var row = el("div", { "class": "btn-row" });
    var retry = el("button", { "class": "btn secondary", type: "button" }, "Retry quiz");
    retry.addEventListener("click", function () { state.answers = []; state.done = false; save(); renderQuiz(); });
    var go = el("button", { "class": "btn", type: "button" }, "Go to summary ▶");
    go.addEventListener("click", function () { show(7); });
    row.appendChild(retry); row.appendChild(go);
    box.appendChild(row);
  }

  /* ---------- Summary ---------- */
  function renderResult() {
    var c = $("resultCard");
    c.innerHTML = "";
    if (state.done) {
      var pass = state.score >= PASS;
      c.appendChild(el("h3", null, "Your result"));
      c.appendChild(el("div", { "class": "score-big " + (pass ? "result-pass" : "result-fail") }, state.score + "%"));
      c.appendChild(el("p", { style: "margin-top:8px" }, pass ? "Status: PASSED. Your score has been recorded." : "Status: not passed yet (pass mark " + PASS + "%). You can retry the quiz."));
    } else {
      c.appendChild(el("h3", null, "Quiz not finished"));
      c.appendChild(el("p", null, "Complete the quiz in section 6 so your result is recorded."));
      var b = el("button", { "class": "btn", type: "button" }, "Go to quiz");
      b.addEventListener("click", function () { show(6); });
      c.appendChild(b);
    }
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    SCORM.init();
    load();
    buildDots();
    initFlips(); initAccordions(); initTabs(); initMini();
    initSim(); initSS(); initClassify();
    $("prev").addEventListener("click", function () { show(state.cur - 1); });
    $("next").addEventListener("click", function () {
      if (state.cur === N - 1) {
        save();
        $("midLabel").textContent = "Progress saved. You can close this window.";
      } else show(state.cur + 1);
    });
    show(state.cur);
  });
})();
