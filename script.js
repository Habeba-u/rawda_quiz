const QUIZ_SIZE = 6;
const RESULTS_KEY = 'rawda_quiz_results_v1';

const state = {
  allQuestions: [],
  questions: [],
  currentIndex: 0,
  score: 0,
  selected: null,
  answered: false,
  studentName: '',
};

const letters = ['A', 'B', 'C', 'D'];
const screens = {
  start: document.getElementById('startScreen'),
  quiz: document.getElementById('quizScreen'),
  result: document.getElementById('resultScreen'),
};

const els = {
  studentForm: document.getElementById('studentForm'),
  studentName: document.getElementById('studentName'),
  startBtn: document.getElementById('startBtn'),
  loadMessage: document.getElementById('loadMessage'),
  showRecordsBtn: document.getElementById('showRecordsBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  clearRecordsBtn: document.getElementById('clearRecordsBtn'),
  recordsPanel: document.getElementById('recordsPanel'),
  topicPill: document.getElementById('topicPill'),
  questionCounter: document.getElementById('questionCounter'),
  progressBar: document.getElementById('progressBar'),
  reaction: document.getElementById('reaction'),
  questionText: document.getElementById('questionText'),
  optionsGrid: document.getElementById('optionsGrid'),
  feedbackBox: document.getElementById('feedbackBox'),
  submitBtn: document.getElementById('submitBtn'),
  nextBtn: document.getElementById('nextBtn'),
  studentResultText: document.getElementById('studentResultText'),
  scoreText: document.getElementById('scoreText'),
  performanceText: document.getElementById('performanceText'),
  resultEmoji: document.getElementById('resultEmoji'),
  resultMeterFill: document.getElementById('resultMeterFill'),
  restartBtn: document.getElementById('restartBtn'),
};

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[name].classList.add('active');
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function prepareQuestion(q) {
  const options = Object.entries(q.options).map(([key, text]) => ({
    originalKey: key,
    text,
    isCorrect: key === q.correct,
  }));
  return { ...q, shuffledOptions: shuffleArray(options) };
}

function pickRandomQuestions() {
  return shuffleArray(state.allQuestions)
    .slice(0, QUIZ_SIZE)
    .map(prepareQuestion);
}

async function loadQuestions() {
  try {
    const response = await fetch('questions.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Cannot load questions.json');
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== 60) {
      throw new Error('Question bank must contain exactly 60 questions.');
    }
    state.allQuestions = data;
    els.startBtn.disabled = false;
    els.loadMessage.textContent = 'تم تحميل بنك الأسئلة: 60 سؤال، وسيظهر لكل طالب 6 أسئلة عشوائية ✅';
  } catch (error) {
    els.startBtn.disabled = true;
    els.loadMessage.textContent = 'تعذر تحميل ملف questions.json. افتحي المشروع من GitHub Pages أو Live Server.';
    console.error(error);
  }
}

function playTone(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = type === 'correct' ? 740 : 210;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

function renderQuestion() {
  const total = state.questions.length;
  const q = state.questions[state.currentIndex];

  state.selected = null;
  state.answered = false;

  els.topicPill.textContent = q.topic || 'ICT';
  els.questionCounter.textContent = `السؤال ${state.currentIndex + 1} من ${total}`;
  els.progressBar.style.width = `${(state.currentIndex / total) * 100}%`;
  els.questionText.textContent = q.question;
  els.optionsGrid.innerHTML = '';
  els.feedbackBox.className = 'feedback-box';
  els.feedbackBox.textContent = '';
  els.reaction.textContent = '';
  els.reaction.classList.remove('pop');
  els.submitBtn.disabled = true;
  els.submitBtn.classList.remove('hidden');
  els.nextBtn.classList.add('hidden');
  els.nextBtn.textContent = state.currentIndex === total - 1 ? 'عرض النتيجة 🏁' : 'السؤال التالي ➜';

  q.shuffledOptions.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.type = 'button';
    btn.dataset.index = index;
    btn.innerHTML = `<span class="letter">${letters[index]}</span><span>${option.text}</span>`;
    btn.addEventListener('click', () => selectAnswer(index));
    els.optionsGrid.appendChild(btn);
  });
}

function selectAnswer(index) {
  if (state.answered) return;
  state.selected = index;
  document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
  document.querySelector(`.option-btn[data-index="${index}"]`).classList.add('selected');
  els.submitBtn.disabled = false;
}

function submitAnswer() {
  if (state.selected === null || state.answered) return;

  const q = state.questions[state.currentIndex];
  const selectedOption = q.shuffledOptions[state.selected];
  state.answered = true;

  document.querySelectorAll('.option-btn').forEach((btn, index) => {
    btn.classList.add('locked');
    const option = q.shuffledOptions[index];
    if (option.isCorrect) btn.classList.add('correct');
    if (index === state.selected && !option.isCorrect) btn.classList.add('wrong');
  });

  if (selectedOption.isCorrect) {
    state.score++;
    els.feedbackBox.className = 'feedback-box show good';
    els.feedbackBox.textContent = 'إجابة رائعة! ممتاز يا بطل/بطلة ✅';
    els.reaction.textContent = '✅✨';
    playTone('correct');
    launchConfetti(45);
  } else {
    const correct = q.shuffledOptions.find(opt => opt.isCorrect);
    els.feedbackBox.className = 'feedback-box show bad';
    els.feedbackBox.textContent = `محاولة جميلة! الإجابة الصحيحة: ${correct.text} ❌`;
    els.reaction.textContent = '❌💡';
    playTone('wrong');
  }

  els.reaction.classList.remove('pop');
  void els.reaction.offsetWidth;
  els.reaction.classList.add('pop');

  els.submitBtn.classList.add('hidden');
  els.nextBtn.classList.remove('hidden');
}

function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
  } else {
    showResult();
  }
}

function getResults() {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function saveResult() {
  const total = state.questions.length;
  const percent = Math.round((state.score / total) * 100);
  const record = {
    name: state.studentName,
    score: state.score,
    total,
    percent,
    date: new Date().toLocaleString('ar-EG'),
  };
  const results = getResults();
  results.push(record);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  return record;
}

function showResult() {
  const total = state.questions.length;
  const percent = Math.round((state.score / total) * 100);
  saveResult();

  showScreen('result');
  els.studentResultText.textContent = `اسم الطالب: ${state.studentName}`;
  els.scoreText.textContent = `درجتك: ${state.score} من ${total} (${percent}%)`;
  els.resultMeterFill.style.width = '0%';
  setTimeout(() => { els.resultMeterFill.style.width = `${percent}%`; }, 120);

  if (percent >= 85) {
    els.resultEmoji.textContent = '🏆🌟';
    els.performanceText.textContent = 'Excellent — أداء ممتاز! واضح إنك فاهم Scratch و Python بشكل رائع.';
    launchConfetti(130);
  } else if (percent >= 60) {
    els.resultEmoji.textContent = '👏😊';
    els.performanceText.textContent = 'Good — نتيجة جيدة، راجع السؤال بهدوء وستتحسن أكثر.';
    launchConfetti(75);
  } else {
    els.resultEmoji.textContent = '💪📚';
    els.performanceText.textContent = 'Try Again — لا تقلق، أعد المحاولة وستجد أن الأمر أصبح أسهل.';
  }
}

function startQuiz(event) {
  event.preventDefault();
  const name = els.studentName.value.trim();
  if (name.length < 2) {
    els.studentName.focus();
    els.loadMessage.textContent = 'من فضلك اكتبي اسم الطالب أولًا.';
    return;
  }

  state.studentName = name;
  state.currentIndex = 0;
  state.score = 0;
  state.questions = pickRandomQuestions();
  els.recordsPanel.classList.add('hidden');
  showScreen('quiz');
  renderQuestion();
}

function restartQuiz() {
  state.currentIndex = 0;
  state.score = 0;
  state.questions = [];
  state.selected = null;
  state.answered = false;
  els.studentName.value = '';
  els.progressBar.style.width = '0%';
  showScreen('start');
  els.studentName.focus();
}

function renderRecords() {
  const results = getResults();
  if (results.length === 0) {
    els.recordsPanel.innerHTML = '<p class="tiny-note">لا توجد نتائج محفوظة حتى الآن.</p>';
    els.recordsPanel.classList.remove('hidden');
    return;
  }

  const rows = results.slice().reverse().map((r, i) => `
    <tr>
      <td>${results.length - i}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.score} / ${r.total}</td>
      <td>${r.percent}%</td>
      <td>${escapeHtml(r.date)}</td>
    </tr>
  `).join('');

  els.recordsPanel.innerHTML = `
    <h4>سجل النتائج المحفوظ على هذا الجهاز</h4>
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>اسم الطالب</th><th>الدرجة</th><th>النسبة</th><th>التاريخ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  els.recordsPanel.classList.toggle('hidden');
}

function exportCsv() {
  const results = getResults();
  if (results.length === 0) {
    alert('لا توجد نتائج لتصديرها بعد.');
    return;
  }
  const header = ['اسم الطالب', 'الدرجة', 'الإجمالي', 'النسبة', 'التاريخ'];
  const lines = [header, ...results.map(r => [r.name, r.score, r.total, `${r.percent}%`, r.date])]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rawda-quiz-results.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearRecords() {
  const ok = confirm('هل تريدين مسح سجل النتائج من هذا الجهاز؟');
  if (!ok) return;
  localStorage.removeItem(RESULTS_KEY);
  els.recordsPanel.innerHTML = '<p class="tiny-note">تم مسح سجل النتائج.</p>';
  els.recordsPanel.classList.remove('hidden');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const canvas = document.getElementById('confettiCanvas');
const ctx = canvas.getContext('2d');
let confettiPieces = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function launchConfetti(count = 80) {
  const colors = ['#7c3aed', '#ec4899', '#facc15', '#06b6d4', '#22c55e', '#fb923c'];
  for (let i = 0; i < count; i++) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.25,
      size: 6 + Math.random() * 8,
      speed: 2 + Math.random() * 4,
      rotation: Math.random() * 360,
      spin: -7 + Math.random() * 14,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 120 + Math.random() * 60,
    });
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiPieces = confettiPieces.filter(p => p.life > 0 && p.y < canvas.height + 30);
  confettiPieces.forEach(p => {
    p.y += p.speed;
    p.x += Math.sin(p.y * 0.018) * 1.4;
    p.rotation += p.spin;
    p.life--;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
    ctx.restore();
  });
  requestAnimationFrame(animateConfetti);
}
animateConfetti();

els.studentForm.addEventListener('submit', startQuiz);
els.submitBtn.addEventListener('click', submitAnswer);
els.nextBtn.addEventListener('click', nextQuestion);
els.restartBtn.addEventListener('click', restartQuiz);
els.showRecordsBtn.addEventListener('click', renderRecords);
els.exportCsvBtn.addEventListener('click', exportCsv);
els.clearRecordsBtn.addEventListener('click', clearRecords);
els.startBtn.disabled = true;
loadQuestions();
