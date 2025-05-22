// script.js

// --- Elements ---
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx    = overlay.getContext('2d');

// --- In-memory log ---
let log = [];

// --- Chart.js contexts & instances ---
const attCtx = document.getElementById('attentionChart').getContext('2d');
const emoCtx = document.getElementById('emotionChart').getContext('2d');

const attentionChart = new Chart(attCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Attentive',     data: [], fill: false },
      { label: 'Not Attentive', data: [], fill: false }
    ]
  },
  options: { animation: false, scales: { x: { display: false } } }
});

const emotionChart = new Chart(emoCtx, {
  type: 'bar',
  data: {
    labels: ['happy','neutral','sad','angry','surprised','fearful','disgusted','None'],
    datasets: [{ label: 'Count', data: Array(8).fill(0) }]
  },
  options: { animation: false, indexAxis: 'y' }
});

console.log('📊 Charts initialized:', attentionChart, emotionChart);

// --- Logging helper ---
function logEmotion(emotion, attention) {
  const now = new Date().toLocaleTimeString();
  log.push({ time: now, emotion, attention });

  // Update attentionChart (last 20)
  const recent = log.slice(-20);
  const attCount = recent.filter(e => e.attention === 'Attentive').length;
  const notCount = recent.length - attCount;
  attentionChart.data.labels.push(now);
  attentionChart.data.datasets[0].data.push(attCount);
  attentionChart.data.datasets[1].data.push(notCount);
  if (attentionChart.data.labels.length > 20) {
    attentionChart.data.labels.shift();
    attentionChart.data.datasets.forEach(ds => ds.data.shift());
  }
  attentionChart.update();

  // Update emotionChart (last 50)
  const counts = { happy:0, neutral:0, sad:0, angry:0, surprised:0, fearful:0, disgusted:0, None:0 };
  log.slice(-50).forEach(e => { if (counts[e.emotion] !== undefined) counts[e.emotion]++; });
  emotionChart.data.datasets[0].data = Object.values(counts);
  emotionChart.update();

  console.log(`Logged: ${now}, ${emotion}, ${attention}`);
}

// --- CSV download ---
function downloadLog() {
  let csv = 'Time,Emotion,Attention\n';
  log.forEach(e => csv += `${e.time},${e.emotion},${e.attention}\n`);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'emotion_attention_log.csv';
  a.click();
}

// --- Main: load models & start ---
async function start() {
  try {
    console.log('🔄 Loading models...');
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    console.log('✅ Models loaded');

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.addEventListener('play', () => {
      console.log('▶️ Video playing');
      overlay.width  = video.videoWidth;
      overlay.height = video.videoHeight;

      const loop = async () => {
        const det = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        ctx.clearRect(0, 0, overlay.width, overlay.height);

        let status = 'Not attentive';
        if (det) {
          status = 'Attentive';
          const top = Object.entries(det.expressions).reduce((a,b)=>a[1]>b[1]?a:b)[0];
          const box = det.detection.box;

          // Draw box & label
          ctx.strokeStyle = 'lime'; ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.fillStyle = 'lime'; ctx.font = '20px Arial';
          ctx.fillText(top, box.x, box.y - 10);

          logEmotion(top, status);
        } else {
          logEmotion('None', status);
        }

        // Draw status
        ctx.fillStyle = 'yellow'; ctx.font = '24px Arial';
        ctx.fillText(`Status: ${status}`, 10, 30);

        requestAnimationFrame(loop);
      };
      loop();
    });
  } catch (e) {
    console.error('❌ Error starting tracker:', e);
  }
}

start();
