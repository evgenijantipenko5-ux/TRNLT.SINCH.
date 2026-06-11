const videoInput = document.getElementById('videoInput');
const fileInput = document.getElementById('fileInput');
const videoPlayer = document.querySelector('.video__player');
const submitBtn = document.querySelector('.dropdown-toggle');
const fileOption = document.querySelector('.dropdown-item');

let selectedFile = null;

fileOption.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        selectedFile = file;
        videoInput.value = file.name;
    }
});

function getEmbedUrl(url) {
    if (!url) return null;

    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1`;

    match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1`;

    match = url.match(/vimeo\.com\/(\d+)/);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;

    match = url.match(/rutube\.ru\/video\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://rutube.ru/play/embed/${match[1]}`;

    return null;
}

function loadVideo(url) {
    const embedUrl = getEmbedUrl(url.trim());
    if (!embedUrl) {
        videoPlayer.innerHTML = '<p style="color:red;">Неподдерживаемая ссылка</p>';
        return;
    }
    videoPlayer.innerHTML = `
        <iframe src="${embedUrl}"
            frameborder="0"
            allow="autoplay; encrypted-media; fullscreen"
            allowfullscreen>
        </iframe>
    `;
}

function loadLocalFile(file) {
    const url = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio/');
    if (isAudio) {
        videoPlayer.innerHTML = `
            <audio controls autoplay style="width:100%;">
                <source src="${url}" type="${file.type}">
            </audio>
        `;
    } else {
        videoPlayer.innerHTML = `
            <video controls autoplay>
                <source src="${url}" type="${file.type}">
            </video>
        `;
    }
    const el = videoPlayer.querySelector(isAudio ? 'audio' : 'video');
    if (el) el.onended = () => URL.revokeObjectURL(url);
}

function handleSubmit() {
    const val = videoInput.value.trim();
    if (!val) return;

    if (selectedFile) {
        loadLocalFile(selectedFile);
    } else {
        loadVideo(val);
    }
}

submitBtn.addEventListener('click', handleSubmit);

videoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
});

videoInput.addEventListener('input', () => {
    selectedFile = null;
});

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const playBtn = document.getElementById('playBtn');
const recordingStatus = document.getElementById('recordingStatus');
const dictaphoneAudio = document.getElementById('dictaphoneAudio');
const transcriptionText = document.getElementById('transcriptionText');
const recognitionLang = document.getElementById('recognitionLang');

let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let recognition = null;

recordBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
playBtn.addEventListener('click', playRecording);

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        transcriptionText.value = '';

        audioContext = new AudioContext();
        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const dest = audioContext.createMediaStreamDestination();
        source.connect(dest);

        await new Promise(r => setTimeout(r, 500));

        mediaRecorder = new MediaRecorder(dest.stream);

        mediaRecorder.addEventListener('dataavailable', (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        });

        mediaRecorder.addEventListener('stop', () => {
            stream.getTracks().forEach(track => track.stop());
            if (audioContext) {
                audioContext.close().catch(() => {});
                audioContext = null;
            }
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            dictaphoneAudio.src = url;
            playBtn.disabled = false;
            recordingStatus.textContent = 'Готово к воспроизведению';
        });

        mediaRecorder.start(100);
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        playBtn.disabled = true;
        recordBtn.classList.add('dictaphone__btn--recording');
        recordingStatus.textContent = 'Идёт запись...';

        startRecognition();
    } catch (err) {
        recordingStatus.textContent = 'Ошибка доступа к микрофону';
    }
}

function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        transcriptionText.placeholder = 'Распознавание не поддерживается браузером';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = recognitionLang.value;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
                text += e.results[i][0].transcript;
            }
        }
        transcriptionText.value = text;
    };

    recognition.onerror = () => {
        transcriptionText.placeholder = 'Ошибка распознавания';
    };

    recognition.start();
}

function stopRecording() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        recordBtn.classList.remove('dictaphone__btn--recording');
        recordingStatus.textContent = 'Запись остановлена';
    }
}

function playRecording() {
    if (dictaphoneAudio.src) {
        dictaphoneAudio.hidden = false;
        dictaphoneAudio.play();
        recordingStatus.textContent = 'Воспроизведение...';
        dictaphoneAudio.onended = () => {
            recordingStatus.textContent = 'Готово к воспроизведению';
        };
    }
}
