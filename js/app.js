/**
 * Warith Exam — منطق الواجهة
 * 3 أوضاع: الأسئلة الشاملة | أسئلة القطعة | المراجعة العامة
 */
(function () {
  "use strict";

  /* ── حماية ────────────────────────────────── */
  if (typeof APP_DATA === "undefined" || !APP_DATA.questions) {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.innerHTML =
        '<div style="padding:3rem;text-align:center;font-family:Tajawal,sans-serif">' +
        '<p>تعذّر تحميل البيانات. تأكد من ملف <code>js/data.js</code>.</p></div>';
    });
    return;
  }

  /* ── بيانات ────────────────────────────────── */
  const QS = APP_DATA.questions;
  const PASSAGES = (typeof PASSAGES_FULL !== "undefined" ? PASSAGES_FULL : [])
    .concat(APP_DATA.passages || []);

  const SEC = {
    all:          "شامل (Grammar + Functions + Conversations)",
    grammar:      "Grammar — القواعد",
    function:     "Functions — وظائف اللغة",
    conversation: "Conversations — المحادثات",
  };

  /* أقسام الامتحان فقط — القطعة مستبعدة من الشاملة */
  const EXAM_SECTIONS = ["all", "grammar", "function", "conversation"];

  const STORE = "warith_v3";

  /* ── حالة الامتحان ─────────────────────────── */
  let examState = { qs: [], timer: null, secs: 0, submitted: false };

  /* ── مساعدات ───────────────────────────────── */
  function $(s)    { return document.querySelector(s) }
  function $$(s)   { return Array.from(document.querySelectorAll(s)) }
  function esc(v)  {
    return String(v ?? "").replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c];
    });
  }
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function loadProg() {
    try { return JSON.parse(localStorage.getItem(STORE)) || { attempts:0, best:0 }; }
    catch { return { attempts:0, best:0 }; }
  }
  function saveProg(p) { localStorage.setItem(STORE, JSON.stringify(p)); }

  /* ══════════════════════════════════════════════
     وضع 1 — الأسئلة الشاملة (امتحان)
  ══════════════════════════════════════════════ */

  function buildExamSectionOptions() {
    const sel = $("#examSection");
    sel.innerHTML = EXAM_SECTIONS
      .map(function (v) {
        return `<option value="${esc(v)}">${esc(SEC[v] || v)}</option>`;
      }).join("");
  }

  /* ترتيب الأقسام */
  const SEC_ORDER = { grammar: 0, function: 1, conversation: 2, reading: 3 };

  function startExam() {
    const section = $("#examSection").value;
    const count   = parseInt($("#examCount").value, 10);
    const mins    = parseInt($("#examMinutes").value, 10);

    /* "all" = grammar + function + conversation فقط — بدون reading */
    const pool = QS.filter(function (q) {
      if (q.section === "reading") return false;
      return (section === "all" || q.section === section) && q.options?.length >= 2;
    });

    if (!pool.length) { alert("لا توجد أسئلة بهذا القسم."); return; }

    /* خلط ثم ترتيب حسب القسم */
    const sliced = shuffle(pool).slice(0, Math.min(count, pool.length));
    sliced.sort(function (a, b) {
      return (SEC_ORDER[a.section] ?? 9) - (SEC_ORDER[b.section] ?? 9);
    });

    examState.qs        = sliced;
    examState.secs      = mins * 60;
    examState.submitted = false;

    $("#examSetup").classList.add("hidden");
    $("#examRun").classList.remove("hidden");
    $("#examResult").classList.add("hidden");
    $("#examInfo").textContent = examState.qs.length + " سؤال";

    renderExamQuestions();
    startTimer();
  }

  function renderExamQuestions() {
    let html       = "";
    let lastSec    = null;
    let secNum     = 0;
    let globalIdx  = 0;

    examState.qs.forEach(function (q, i) {
      /* رأس قسم جديد */
      if (q.section !== lastSec) {
        if (lastSec !== null) html += "</div>"; /* إغلاق المجموعة السابقة */
        lastSec = q.section;
        secNum++;
        html += `
          <div class="sec-group">
            <div class="sec-header">
              <span class="sec-num">${secNum}</span>
              ${esc(SEC[q.section] || q.section)}
            </div>`;
      }

      html += `
        <article class="qcard" data-qi="${i}">
          <div class="meta">
            <span class="badge num">${i + 1}</span>
          </div>
          ${q.prompt ? `<div class="prompt">${esc(q.prompt)}</div>` : ""}
          <p class="qtitle">${esc(q.question)}</p>
          <div class="options">
            ${q.options.map(function (o, j) {
              return `<label class="option">
                <input type="radio" name="eq_${i}" value="${j}" />
                <span><strong>${String.fromCharCode(65+j)}.</strong> ${esc(o)}</span>
              </label>`;
            }).join("")}
          </div>
        </article>`;
    });

    if (lastSec !== null) html += "</div>"; /* إغلاق آخر مجموعة */
    $("#examList").innerHTML = html;
  }

  function startTimer() {
    clearInterval(examState.timer);
    updateTimerDisplay();
    examState.timer = setInterval(function () {
      examState.secs--;
      updateTimerDisplay();
      if (examState.secs <= 0) { clearInterval(examState.timer); submitExam(true); }
    }, 1000);
  }

  function updateTimerDisplay() {
    const t   = Math.max(0, examState.secs);
    const el  = $("#timerDisplay");
    el.textContent = pad(Math.floor(t/60)) + ":" + pad(t % 60);
    el.parentElement.classList.toggle("urgent", t > 0 && t <= 60);
  }

  function pad(n) { return String(n).padStart(2,"0") }

  function submitExam(auto) {
    if (!auto) {
      const unanswered = examState.qs.filter(function (_, i) {
        return !document.querySelector(`input[name="eq_${i}"]:checked`);
      }).length;
      if (unanswered > 0 && !confirm(`لديك ${unanswered} سؤال بدون إجابة. تسليم الآن؟`)) return;
    }
    clearInterval(examState.timer);
    examState.submitted = true;

    let correct = 0;
    const review = examState.qs.map(function (q, i) {
      const picked  = document.querySelector(`input[name="eq_${i}"]:checked`);
      const chosen  = picked ? parseInt(picked.value, 10) : -1;
      const ok      = chosen === q.answer;
      if (ok) correct++;
      return { ...q, chosen, ok };
    });

    const pct  = examState.qs.length ? Math.round(correct / examState.qs.length * 100) : 0;
    const prog = loadProg();
    prog.attempts++;
    prog.best = Math.max(prog.best || 0, pct);
    saveProg(prog);

    const col = pct >= 70 ? "#0f766e" : pct >= 50 ? "#d97706" : "#dc2626";

    $("#examRun").classList.add("hidden");
    const res = $("#examResult");
    res.classList.remove("hidden");
    res.innerHTML = `
      <div class="result-card">
        <span class="score-num" style="color:${col}">${pct}%</span>
        <span class="score-sub">
          ${auto ? "انتهى الوقت — " : ""}
          أجبت صحيحًا على ${correct} من ${examState.qs.length} سؤال
        </span>
      </div>
      <div class="stack">
        ${review.map(function (q, i) {
          return `
          <article class="qcard ${q.ok ? "qcard-ok" : "qcard-err"}">
            <div class="meta">
              <span class="badge num">${i+1}</span>
              <span class="badge ${q.ok ? "badge-ok" : "badge-err"}">${q.ok ? "✓ صحيحة" : "✗ خاطئة"}</span>
              <span class="badge grey">${esc(SEC[q.section]||q.section)}</span>
            </div>
            ${q.prompt ? `<div class="prompt">${esc(q.prompt)}</div>` : ""}
            <p class="qtitle">${esc(q.question)}</p>
            <div class="options">
              ${q.options.map(function (o, j) {
                let cls = "";
                if (j === q.answer)                   cls = "correct";
                if (j === q.chosen && j !== q.answer) cls = "wrong";
                return `<div class="option ${cls}">
                  <strong>${String.fromCharCode(65+j)}.</strong>
                  <span>${esc(o)}</span>
                </div>`;
              }).join("")}
            </div>
            ${!q.ok ? `
              <div class="wrong-detail">
                ${q.chosen >= 0
                  ? `<div class="chosen-row">❌ اخترت: <strong>${esc(q.options[q.chosen])}</strong></div>`
                  : `<div class="chosen-row">⚠️ لم تختر إجابة</div>`
                }
                <div class="answer-box show">✅ الجواب الصحيح: <strong>${esc(q.options[q.answer]??'')}</strong></div>
                <div class="explain-box show">💡 <strong>الشرح:</strong> ${esc(q.explanation||'راجع الفكرة الأساسية.')}</div>
              </div>
            ` : `<div class="correct-row">✅ أحسنت! إجابتك صحيحة.</div>`}
          </article>`;
        }).join("")}
      </div>
    `;
    res.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  function resetExam() {
    clearInterval(examState.timer);
    examState = { qs:[], timer:null, secs:0, submitted:false };
    $("#examSetup").classList.remove("hidden");
    $("#examRun").classList.add("hidden");
    $("#examResult").classList.add("hidden");
  }

  /* ══════════════════════════════════════════════
     وضع 2 — أسئلة القطعة
  ══════════════════════════════════════════════ */

  function buildPassageList() {
    const sel = $("#passageSelect");
    if (!PASSAGES.length) {
      sel.innerHTML = '<option>لا توجد قطع</option>';
      return;
    }
    sel.innerHTML = PASSAGES.map(function (p, i) {
      return `<option value="${i}">${esc(p.title || "قطعة " + (i+1))}</option>`;
    }).join("");
    showPassage(0);
  }

  function showPassage(idx) {
    const p = PASSAGES[idx];
    if (!p) return;

    $("#passageTitle").textContent   = p.title  || "القطعة";
    $("#passageSource").textContent  = p.source || "-";
    $("#passageBody").textContent    = p.text   || "";

    const qbox = $("#passageQList");

    if (!p.questions || !p.questions.length) {
      qbox.innerHTML = '<div class="empty">لا توجد أسئلة لهذه القطعة.</div>';
      return;
    }

    /* رسم الأسئلة بدون إجابات */
    qbox.innerHTML = p.questions.map(function (q, i) {
      return `
        <article class="qcard" id="pq_card_${idx}_${i}">
          <p class="qtitle">${i + 1}. ${esc(q.question)}</p>
          <div class="options">
            ${(q.options || []).map(function (o, j) {
              return `<label class="option">
                <input type="radio" name="pq_${idx}_${i}" value="${j}" />
                <span><strong>${String.fromCharCode(65 + j)}.</strong> ${esc(o)}</span>
              </label>`;
            }).join("")}
          </div>
          <div class="answer-box"></div>
        </article>`;
    }).join("") + `
      <div style="text-align:center;margin-top:14px">
        <button class="btn btn-primary" id="checkPassageBtn">
          تحقق من الإجابات
        </button>
      </div>`;

    /* زر التحقق */
    document.getElementById("checkPassageBtn").addEventListener("click", function () {
      let correct = 0;
      p.questions.forEach(function (q, i) {
        const card   = document.getElementById("pq_card_" + idx + "_" + i);
        const picked = document.querySelector(`input[name="pq_${idx}_${i}"]:checked`);
        const chosen = picked ? parseInt(picked.value, 10) : -1;
        const aBox   = card.querySelector(".answer-box");

        /* تلوين الخيارات */
        card.querySelectorAll(".option").forEach(function (opt, j) {
          opt.classList.remove("correct", "wrong");
          if (j === q.answer) opt.classList.add("correct");
          if (j === chosen && j !== q.answer) opt.classList.add("wrong");
        });

        /* عرض الإجابة */
        const optText = (q.options && q.options[q.answer]) ? esc(q.options[q.answer]) : "";
        aBox.innerHTML = `<strong>الإجابة الصحيحة:</strong> ${optText}`;
        aBox.classList.add("show");

        if (chosen === q.answer) correct++;
      });

      /* نتيجة صغيرة */
      this.textContent = `أجبت صحيحًا على ${correct} من ${p.questions.length} سؤال`;
      this.disabled = true;
      this.classList.remove("btn-primary");
      this.classList.add("btn-ghost");
    });
  }

  /* ══════════════════════════════════════════════
     وضع 3 — المراجعة العامة
  ══════════════════════════════════════════════ */

  let reviewActiveSec = "all";

  function buildReviewStats() {
    const counts = { all: QS.length };
    QS.forEach(function (q) {
      counts[q.section] = (counts[q.section] || 0) + 1;
    });
    const labels = { all: "الكل", grammar: "Grammar", function: "Functions", conversation: "Conversations" };
    const statsEl = $("#reviewStats");
    if (!statsEl) return;
    statsEl.innerHTML = Object.entries(counts).map(function ([sec, n]) {
      return `<span class="stat-pill ${sec}">
        <span>${labels[sec] || sec}</span>
        <strong>${n}</strong>
      </span>`;
    }).join("");
  }

  function renderReview() {
    const sec  = reviewActiveSec;
    const term = ($("#reviewSearch").value || "").trim().toLowerCase();

    const list = QS.filter(function (q) {
      const okSec  = sec === "all" || q.section === sec;
      const blob   = (q.question + " " + (q.prompt||"") + " " + (q.topic||"")).toLowerCase();
      const okTerm = !term || blob.includes(term);
      return okSec && okTerm;
    });

    /* عداد النتائج */
    const countEl = $("#reviewCount");
    if (countEl) countEl.textContent = list.length + " سؤال";

    const box = $("#reviewList");
    if (!list.length) {
      box.innerHTML = '<div class="empty">لا توجد نتائج.</div>';
      return;
    }

    box.innerHTML = list.map(function (q, i) {
      const rid = "rv_" + i;
      return `
        <article class="qcard" id="${rid}">
          <div class="meta">
            <span class="badge grey">${esc(SEC[q.section]||q.section)}</span>
            <span class="badge grey">${esc(q.topic||"")}</span>
          </div>
          ${q.prompt ? `<div class="prompt">${esc(q.prompt)}</div>` : ""}
          <p class="qtitle">${esc(q.question)}</p>
          <div class="options">
            ${q.options.map(function (o, j) {
              return `<div class="option" data-j="${j}">
                <strong>${String.fromCharCode(65+j)}.</strong>
                <span>${esc(o)}</span>
              </div>`;
            }).join("")}
          </div>
          <div class="reveal-bar">
            <button class="btn-reveal" data-ans="${q.answer}"
                    data-exp="${esc(q.explanation||'راجع الفكرة الأساسية.')}"
                    data-rid="${rid}">
              إظهار الإجابة
            </button>
          </div>
          <div class="answer-box"></div>
          <div class="explain-box"></div>
        </article>`;
    }).join("");

    /* أحداث أزرار الإظهار */
    box.querySelectorAll(".btn-reveal").forEach(function (btn) {
      btn.addEventListener("click", function handleReveal() {
        const card     = document.getElementById(btn.dataset.rid);
        const ansIdx   = parseInt(btn.dataset.ans, 10);
        const exp      = btn.dataset.exp;
        const opts     = card.querySelectorAll(".option");
        const aBox     = card.querySelector(".answer-box");
        const eBox     = card.querySelector(".explain-box");
        const shown    = aBox.classList.contains("show");

        if (shown) {
          /* إخفاء */
          opts.forEach(function (o) { o.classList.remove("correct") });
          aBox.classList.remove("show");
          eBox.classList.remove("show");
          btn.textContent = "إظهار الإجابة";
          btn.classList.remove("shown");
        } else {
          /* إظهار */
          opts.forEach(function (o, j) {
            o.classList.toggle("correct", j === ansIdx);
          });
          aBox.innerHTML = `<strong>الجواب الصحيح:</strong> ${opts[ansIdx]?.querySelector("span")?.textContent||""}`;
          eBox.innerHTML = `<strong>السبب:</strong> ${exp}`;
          aBox.classList.add("show");
          eBox.classList.add("show");
          btn.textContent = "إخفاء الإجابة";
          btn.classList.add("shown");
        }
      });
    });
  }

  /* ══════════════════════════════════════════════
     تبديل الأوضاع
  ══════════════════════════════════════════════ */

  function switchMode(mode) {
    $$(".mode-card").forEach(function (c) {
      c.classList.toggle("active", c.dataset.mode === mode);
    });
    $$(".mode-section").forEach(function (s) {
      s.classList.toggle("active", s.id === "mode-" + mode);
    });

    /* إذا كان الامتحان جارياً وتم التبديل بعيداً — إيقاف المؤقت */
    if (mode !== "exam") clearInterval(examState.timer);
  }

  /* ══════════════════════════════════════════════
     تهيئة
  ══════════════════════════════════════════════ */

  document.addEventListener("DOMContentLoaded", function () {
    /* بطاقات الأوضاع */
    $$(".mode-card").forEach(function (card) {
      card.addEventListener("click", function () {
        switchMode(card.dataset.mode);
      });
    });

    /* ── وضع الامتحان ── */
    buildExamSectionOptions();
    $("#startExamBtn").addEventListener("click", startExam);
    $("#submitExamBtn").addEventListener("click", function () { submitExam(false) });
    $("#retryExamBtn").addEventListener("click", resetExam);

    /* ── وضع القطعة ── */
    buildPassageList();
    $("#passageSelect").addEventListener("change", function (e) {
      showPassage(parseInt(e.target.value, 10));
    });

    /* ── وضع المراجعة ── */
    buildReviewStats();

    /* أزرار التبويبات */
    $$(".chip-btn[data-sec]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".chip-btn[data-sec]").forEach(function (b) { b.classList.remove("active") });
        btn.classList.add("active");
        reviewActiveSec = btn.dataset.sec;
        renderReview();
      });
    });

    $("#reviewSearch").addEventListener("input", renderReview);
    renderReview();

    /* الوضع الافتراضي */
    switchMode("exam");
  });

})();
