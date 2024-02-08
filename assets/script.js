const IMAGE_INTERVAL_MS = 42;

const drawObjects = (video, canvas, objects) => {
    const ctx = canvas.getContext('2d');

    ctx.width = video.videoWidth;
    ctx.height = video.videoHeight;

    ctx.beginPath();
    ctx.clearRect(0, 0, ctx.width, ctx.height);
    for (const object of objects.objects) {
        const [x1, y1, x2, y2] = object.box;
        const label = object.label;
        ctx.strokeStyle = '#49fb35';
        ctx.beginPath();
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        ctx.stroke();

        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#ff0000';
        ctx.fillText(label, x1 - 5, y1 - 5);
    }
};

const startObjectDetection = (video, canvas, deviceId) => {
    const socket = new WebSocket(`wss://${location.host}/object-detection`);
    let intervalId;

    socket.addEventListener('open', function () {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId,
                width: { max: 640 },
                height: { max: 480 }
            }
        }).then(function (stream) {
            video.srcObject = stream;
            video.play().then(() => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                intervalId = setInterval(() => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);

                    canvas.toBlob((blob) => socket.send(blob), 'image/jpeg');
                }, IMAGE_INTERVAL_MS);
            });
        });
    });

    socket.addEventListener('message', function (event) {
        drawObjects(video, canvas, JSON.parse(event.data));
    });

    socket.addEventListener('close', function () {
        window.clearInterval(intervalId);
        video.pause();
    });

    return socket;
};

window.addEventListener('DOMContentLoaded', (event) => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraSelect = document.getElementById('camera-select');
    let socket;

    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(() => {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
            for (const device of devices) {
                if (device.kind === 'videoinput' && device.deviceId) {
                    const deviceOption = document.createElement('option');
                    deviceOption.value = device.deviceId;
                    deviceOption.innerText = device.label;
                    cameraSelect.appendChild(deviceOption);
                }
            }
        });
    });

    document.getElementById('form-connect').addEventListener('submit', (event) => {
        event.preventDefault();

        if (socket) {
            socket.close();
        }

        const deviceId = cameraSelect.selectedOptions[0].value;
        socket = startObjectDetection(video, canvas, deviceId);
    });
});