const video = document.getElementById('video')
const loginbox = document.getElementById('loginbox');

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo)

function startVideo() {
    navigator.getUserMedia(
        {video: {}},
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}

video.addEventListener('play', () => {
    const displaySize = {width: video.width, height: video.height}
    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
        handleDetections(detections.length);
    }, 100)
});

let isFormVisible = false;
let changeTimerId = 0;

function handleDetections(detections) {
    let show = detections === 1;
    if (isFormVisible === show) {
        clearTimeout(changeTimerId);
        changeTimerId = 0;
    } else {
        if (!changeTimerId) {
            changeTimerId = setTimeout(() => {
                showHideForm(show);
            }, detections === 0 ? 750 : 250);
        }
    }
}

let lastActiveElement = null;

function showHideForm(show) {
    isFormVisible = show;
    if (show) {
        loginbox.classList.add('ok');
        loginbox.classList.remove('danger');
        if (lastActiveElement) {
            setTimeout(() => lastActiveElement.focus(), 1);
        }
    } else {
        lastActiveElement = document.activeElement;
        loginbox.classList.add('danger');
        loginbox.classList.remove('ok');
    }
}