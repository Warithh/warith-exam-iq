/**
 * Warith National Exam Master — منطق الواجهة الرئيسية
 * يعتمد على APP_DATA من data.js (أسئلة + قطع + إحصاءات).
 */

(function () {
  "use strict";

  if (typeof APP_DATA === "undefined" || !APP_DATA.questions) {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.innerHTML =
        '<main class="wrap" style="padding:2rem;text-align:center;font-family:Tajawal,sans-serif"><p>تعذّر تحميل بيانات الأسئلة. تأكد من وجود الملف <code>js/data.js</code> ومسار التحميل صحيح.</p></main>';
    });
    return;
  }

  /* ---------- ثوابت ---------- */
  const QUESTIONS = APP_DATA.questions;
  const PASSAGES = APP_DATA.passages || [];
  const SECTION_LABELS = {
    all: "كل الأقسام",
    grammar: "Grammar - القواعد",
    conversation: "Conversations - المحادثات",
    function: "Functions - وظائف اللغة",
    reading: "Reading - القطعة الخارجية",
  };
  const STORE_KEY = "warith_exam_master_progress_v2";

  const state = {
    examQuestions: [],
    timer: null,
    secondsLeft: 0,
    progress: loadProgress(),
  };

  /* ---------- أدوات DOM ---------- */
  function $(sel) {
    return document.querySelector(sel);
  }
  function $$(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  /* ---------- التخزين المحلي ---------- */
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || { attempts: 0, best: 0, wrongMap: {} };
    } catch {
      return { attempts: 0, best: 0, wrongMap: {} };
    }
  }

  function saveProgress() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.progress));
    renderProgressStats();
    renderWeakness();
  }

  /* ---------- مساعدات عامة ---------- */
  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
  }

  function uniqueSources() {
    return ["all", ...new Set(QUESTIONS.map((q) => q.source).filter(Boolean))];
  }

  function fillSectionSelect(sel) {
    sel.innerHTML = Object.entries(SECTION_LABELS)
      .map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`)
      .join("");
  }

  function fillSourceSelect(sel) {
    sel.innerHTML = uniqueSources()
      .map((src) => `<option value="${esc(src)}">${src === "all" ? "كل المصادر" : esc(src)}</option>`)
      .join("");
  }

  function getQuestions(section, source, search) {
    const sec = section || "all";
    const src = source || "all";
    const term = (search || "").trim().toLowerCase();
    return QUESTIONS.filter((q) => {
      const okSection = sec === "all" || q.section === sec;
      const okSource = src === "all" || q.source === src;
      const blob = `${q.question} ${q.prompt || ""} ${q.topic || ""}`.toLowerCase();
      const okSearch = !term || blob.includes(term);
      return okSection && okSource && okSearch;
    });
  }

  /* ---------- وضع الدراسة ---------- */
  function renderStudy() {
    const section = $("#studySection").value;
    const source = $("#studySource").value;
    const search = $("#studySearch").value;
    const list = getQuestions(section, source, search);
    const box = $("#studyList");
    if (!list.length) {
      box.innerHTML = `<div class="empty">لا توجد نتائج بهذا الفلتر.</div>`;
      return;
    }
    box.innerHTML = list
      .map(
        (q) => `
    <article class="card">
      <div class="meta">
        <span class="badge">${esc(SECTION_LABELS[q.section] || q.section)}</span>
        <span class="badge muted">${esc(q.topic || "general")}</span>
        <span class="badge muted">${esc(q.source || "-")}</span>
      </div>
      ${q.prompt ? `<div class="prompt">${esc(q.prompt)}</div>` : ""}
      <h3 class="qtitle">${esc(q.question)}</h3>
      <div class="options">
        ${q.options
          .map(
            (o, i) =>
              `<div class="option ${i === q.answer ? "correct" : ""}"><strong>${String.fromCharCode(65 + i)}.</strong><span>${esc(o)}</span></div>`
          )
          .join("")}
      </div>
      <div class="answer"><strong>الجواب الصحيح:</strong> ${esc(q.options[q.answer] ?? "")}</div>
      <div class="explain"><strong>سبب الاختيار:</strong> ${esc(q.explanation || "راجع الفكرة العامة للسؤال.")}</div>
    </article>
  `
      )
      .join("");
  }

  function renderProgressStats() {
    $("#metricAttempts").textContent = state.progress.attempts || 0;
    $("#metricBest").textContent = `${Math.round(state.progress.best || 0)}%`;
    const wrongCount = Object.keys(state.progress.wrongMap || {}).length;
    $("#metricWrong").textContent = wrongCount;
    $("#statWeak").textContent = wrongCount;
  }

  /* ---------- وضع الامتحان ---------- */
  function startExam() {
    const section = $("#examSection").value;
    const source = $("#examSource").value;
    const count = parseInt($("#examCount").value, 10);
    const minutes = parseInt($("#examMinutes").value, 10);
    const pool = getQuestions(section, source, "").filter((q) => q.options && q.options.length >= 2);
    if (!pool.length) {
      alert("لا توجد أسئلة بهذا الاختيار.");
      return;
    }
    state.examQuestions = shuffle(pool).slice(0, Math.min(count, pool.length));
    state.secondsLeft = minutes * 60;
    $("#examShell").classList.remove("hidden");
    $("#resultBox").classList.add("hidden");
    $("#examInfo").textContent = String(state.examQuestions.length);
    renderExam();
    startTimer();
    document.getElementById("exam").scrollIntoView({ behavior: "smooth" });
  }

  function renderExam() {
    const box = $("#examList");
    box.innerHTML = state.examQuestions
      .map(
        (q, idx) => `
    <article class="card exam-card" data-qid="${esc(q.id)}">
      <div class="meta">
        <span class="badge">${idx + 1}</span>
        <span class="badge muted">${esc(SECTION_LABELS[q.section] || q.section)}</span>
        <span class="badge muted">${esc(q.source)}</span>
      </div>
      ${q.prompt ? `<div class="prompt">${esc(q.prompt)}</div>` : ""}
      <h3 class="qtitle">${esc(q.question)}</h3>
      <div class="options">
        ${q.options
          .map(
            (o, i) => `
          <label class="option">
            <input type="radio" name="exam_${idx}" value="${i}" />
            <span><strong>${String.fromCharCode(65 + i)}.</strong> ${esc(o)}</span>
          </label>
        `
          )
          .join("")}
      </div>
    </article>
  `
      )
      .join("");
  }

  function startTimer() {
    clearInterval(state.timer);
    updateTimer();
    state.timer = setInterval(function () {
      state.secondsLeft -= 1;
      updateTimer();
      if (state.secondsLeft <= 0) {
        clearInterval(state.timer);
        submitExam(true);
      }
    }, 1000);
  }

  function updateTimer() {
    const mins = String(Math.max(0, Math.floor(state.secondsLeft / 60))).padStart(2, "0");
    const secs = String(Math.max(0, state.secondsLeft % 60)).padStart(2, "0");
    $("#timerText").textContent = `${mins}:${secs}`;
  }

  function submitExam(auto) {
    clearInterval(state.timer);
    const review = [];
    let correct = 0;
    state.examQuestions.forEach(function (q, idx) {
      const picked = document.querySelector(`input[name="exam_${idx}"]:checked`);
      const chosen = picked ? parseInt(picked.value, 10) : -1;
      const ok = chosen === q.answer;
      if (ok) correct += 1;
      if (!ok) {
        state.progress.wrongMap[q.id] = {
          id: q.id,
          question: q.question,
          prompt: q.prompt || "",
          section: q.section,
          topic: q.topic || "",
          source: q.source || "",
          options: q.options,
          answer: q.answer,
          explanation: q.explanation || "",
          chosen,
        };
      } else {
        delete state.progress.wrongMap[q.id];
      }
      review.push({ ...q, chosen, ok });
    });
    const pct = state.examQuestions.length ? (correct / state.examQuestions.length) * 100 : 0;
    state.progress.attempts += 1;
    state.progress.best = Math.max(state.progress.best || 0, pct);
    saveProgress();

    const box = $("#resultBox");
    box.classList.remove("hidden");
    box.innerHTML = `
    <div class="summary-card">
      <div class="meta">
        <span class="badge">${auto ? "تم التسليم تلقائيًا" : "تم التسليم"}</span>
        <span class="badge muted">الصحيح: ${correct} / ${state.examQuestions.length}</span>
      </div>
      <div class="score">${Math.round(pct)}%</div>
      <p>راجع الأخطاء بالأسفل. كل خطأ تم حفظه أيضًا في قسم <strong>نقاط الضعف</strong>.</p>
    </div>
    <div class="stack">
      ${review
        .map(
          (q, idx) => `
        <article class="card">
          <div class="meta">
            <span class="badge">${idx + 1}</span>
            <span class="badge ${q.ok ? "" : "muted"}">${q.ok ? "إجابة صحيحة" : "إجابة خاطئة"}</span>
            <span class="badge muted">${esc(SECTION_LABELS[q.section] || q.section)}</span>
          </div>
          ${q.prompt ? `<div class="prompt">${esc(q.prompt)}</div>` : ""}
          <h3 class="qtitle">${esc(q.question)}</h3>
          <div class="options">
            ${q.options
              .map((o, i) => {
                let cls = "";
                if (i === q.answer) cls = "correct";
                if (i === q.chosen && i !== q.answer) cls = "wrong";
                return `<div class="option ${cls}"><strong>${String.fromCharCode(65 + i)}.</strong><span>${esc(o)}</span></div>`;
              })
              .join("")}
          </div>
          <div class="answer"><strong>الجواب الصحيح:</strong> ${esc(q.options[q.answer] ?? "")}</div>
          <div class="explain"><strong>سبب الخطأ / سبب الاختيار:</strong> ${esc(q.explanation || "راجع الفكرة الأساسية لهذا السؤال.")}</div>
        </article>
      `
        )
        .join("")}
    </div>
  `;
    document.getElementById("resultBox").scrollIntoView({ behavior: "smooth" });
  }

  /* ---------- القراءة (قطع) ---------- */
  function renderPassages() {
    const select = $("#passageSelect");
    select.innerHTML = PASSAGES.map((p, i) => `<option value="${i}">${esc(p.title || "قطعة " + (i + 1))}</option>`).join("");
    if (PASSAGES.length) showPassage(0);
  }

  function showPassage(index) {
    const p = PASSAGES[index];
    if (!p) return;
    $("#passageMetaSource").textContent = p.source || "-";
    $("#passageMetaCount").textContent = `${p.question_count || 0} سؤال`;
    $("#passageTitle").textContent = p.title || "Reading passage";
    $("#passageText").textContent = p.text || "";
    const box = $("#passageQuestions");
    if (!p.questions || !p.questions.length) {
      box.innerHTML = `<div class="empty">لا توجد أسئلة محفوظة لهذه القطعة داخل الملف.</div>`;
      return;
    }
    box.innerHTML = p.questions
      .map(
        (q, idx) => `
    <article class="card">
      <h4 class="qtitle">${idx + 1}. ${esc(q.question)}</h4>
      <div class="options">
        ${(q.options || [])
          .map(
            (o, i) =>
              `<div class="option ${q.answer === i ? "correct" : ""}"><strong>${String.fromCharCode(65 + i)}.</strong><span>${esc(o)}</span></div>`
          )
          .join("")}
      </div>
      ${typeof q.answer === "number" ? `<div class="answer"><strong>الإجابة:</strong> ${esc(q.options[q.answer])}</div>` : ""}
    </article>
  `
      )
      .join("");
  }

  /* ---------- نقاط الضعف ---------- */
  function renderWeakness() {
    const entries = Object.values(state.progress.wrongMap || {});
    const box = $("#weaknessBox");
    if (!entries.length) {
      box.innerHTML = `<div class="empty">لا توجد أخطاء محفوظة الآن. هذا ممتاز — استمر.</div>`;
      return;
    }
    box.innerHTML = entries
      .map(
        (q, idx) => `
    <article class="card">
      <div class="meta">
        <span class="badge">${idx + 1}</span>
        <span class="badge muted">${esc(SECTION_LABELS[q.section] || q.section)}</span>
        <span class="badge muted">${esc(q.source || "-")}</span>
      </div>
      ${q.prompt ? `<div class="prompt">${esc(q.prompt)}</div>` : ""}
      <h3 class="qtitle">${esc(q.question)}</h3>
      <div class="options">
        ${q.options
          .map((o, i) => {
            let cls = i === q.answer ? "correct" : "";
            if (i === q.chosen && i !== q.answer) cls = "wrong";
            return `<div class="option ${cls}"><strong>${String.fromCharCode(65 + i)}.</strong><span>${esc(o)}</span></div>`;
          })
          .join("")}
      </div>
      <div class="answer"><strong>الجواب الصحيح:</strong> ${esc(q.options[q.answer] || "")}</div>
      <div class="explain"><strong>ملاحظة سريعة:</strong> ${esc(q.explanation || "")}</div>
    </article>
  `
      )
      .join("");
  }

  /* ---------- تهيئة ---------- */
  function init() {
    const stats = APP_DATA.stats || { questionCount: QUESTIONS.length, passageCount: PASSAGES.length };
    $("#statQuestions").textContent = stats.questionCount ?? QUESTIONS.length;
    $("#statPassages").textContent = stats.passageCount ?? PASSAGES.length;

    fillSectionSelect($("#studySection"));
    fillSectionSelect($("#examSection"));
    fillSourceSelect($("#studySource"));
    fillSourceSelect($("#examSource"));

    $("#studySection").addEventListener("change", renderStudy);
    $("#studySource").addEventListener("change", renderStudy);
    $("#studySearch").addEventListener("input", renderStudy);
    $("#startExamBtn").addEventListener("click", startExam);
    $("#submitExamBtn").addEventListener("click", function () {
      submitExam(false);
    });
    $("#passageSelect").addEventListener("change", function (e) {
      showPassage(parseInt(e.target.value, 10));
    });
    $("#clearWeakBtn").addEventListener("click", function () {
      if (confirm("هل تريد مسح سجل الأخطاء المحفوظ؟")) {
        state.progress.wrongMap = {};
        saveProgress();
      }
    });
    $$(".chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".chip").forEach(function (x) {
          x.classList.remove("active");
        });
        btn.classList.add("active");
        $("#studySection").value = btn.dataset.quick || "all";
        renderStudy();
      });
    });

    renderStudy();
    renderPassages();
    renderProgressStats();
    renderWeakness();

    /* فتح الصفحة = الانتقال مباشرة إلى الدراسة (بدون تسجيل دخول) */
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#study");
      requestAnimationFrame(function () {
        var st = document.getElementById("study");
        if (st) st.scrollIntoView({ block: "start", behavior: "auto" });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
