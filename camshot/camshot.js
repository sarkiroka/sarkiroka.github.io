/**
 * Kamera kép bizgerentyű
 * @author sarkiroka
 */
(function ready(onReadyFunction) {
	if (document.readyState != 'loading') {
		onReadyFunction();
	} else {
		document.addEventListener('DOMContentLoaded', onReadyFunction);
	}
})(function onReady() {
	const c = 'click';

	//0. kiválasztjuk a kamerát - több is lehet
	let videoSourcesSelect = document.getElementById('video-source');
	navigator.mediaDevices.enumerateDevices().then((devices) => {
		devices.forEach((device) => {
			let option = new Option();
			option.value = device.deviceId;
			if(device.kind=='videoinput'){
				option.text = device.label || `Camera ${videoSourcesSelect.length + 1}`;
				videoSourcesSelect.appendChild(option);
			}
			console.log(device);
		});
	}).catch(function (e) {
		alert(e.name + ": " + e.message);
	});

	const videoDomElement = document.getElementById('camera-video');
	document.querySelector('#first_step').addEventListener(c, function () {
		const deviceId = videoSourcesSelect.value;
		navigator.mediaDevices.getUserMedia({video: {deviceId}, audio: false}).then(stream => {
			videoDomElement.srcObject = stream;
		});
	});
	const originalCameraShotDomElement = document.getElementById('camera-shot');
	const originalCameraShotContext = originalCameraShotDomElement.getContext('2d');
	document.getElementById('take-a-photo').addEventListener(c, function () {
		originalCameraShotContext.drawImage(videoDomElement, 0, 0, originalCameraShotDomElement.width, originalCameraShotDomElement.height);
	});
	const edgeSettingDomElement = document.getElementById('edge-settings');
	const edgeSettingsContext = edgeSettingDomElement.getContext('2d');
	const userSettingsEdgePoints = [{x: 100, y: 150}, {x: 400, y: 110}, {x: 465, y: 350}, {x: 40, y: 210}];
	document.getElementById('set-edges').addEventListener(c, function () {
		edgeSettingsContext.drawImage(originalCameraShotDomElement, 0, 0);
		edgeSettingsContext.fillStyle = '#00FF00';
		edgeSettingsContext.strokeStyle = '#FF0000';
		// jelölő vonalak
		userSettingsEdgePoints.forEach((point, index) => {
			let previousIndex = index ? (index - 1) : (userSettingsEdgePoints.length - 1);
			edgeSettingsContext.beginPath();
			edgeSettingsContext.moveTo(userSettingsEdgePoints[previousIndex].x, userSettingsEdgePoints[previousIndex].y);
			edgeSettingsContext.lineTo(userSettingsEdgePoints[index].x, userSettingsEdgePoints[index].y);
			edgeSettingsContext.stroke();
		});
		// debug 1 (függőleges segédvonalak)
		const dx1 = (userSettingsEdgePoints[1].x - userSettingsEdgePoints[0].x) / 10;
		const dy1 = (userSettingsEdgePoints[1].y - userSettingsEdgePoints[0].y) / 10;
		const dx2 = (userSettingsEdgePoints[2].x - userSettingsEdgePoints[3].x) / 10;
		const dy2 = (userSettingsEdgePoints[2].y - userSettingsEdgePoints[3].y) / 10;
		const sx0 = userSettingsEdgePoints[0].x;
		const sy0 = userSettingsEdgePoints[0].y;
		const ex0 = userSettingsEdgePoints[3].x;
		const ey0 = userSettingsEdgePoints[3].y;
		for (let i = 0; i < 10; i++) {
			edgeSettingsContext.beginPath();
			edgeSettingsContext.moveTo(sx0 + i * dx1, sy0 + i * dy1);
			edgeSettingsContext.lineTo(ex0 + i * dx2, ey0 + i * dy2);
			edgeSettingsContext.stroke();
		}
		// debug 2 (vizszintes segédvonalak)
		const dx3 = (userSettingsEdgePoints[3].x - userSettingsEdgePoints[0].x) / 10;
		const dy3 = (userSettingsEdgePoints[3].y - userSettingsEdgePoints[0].y) / 10;
		const dx4 = (userSettingsEdgePoints[2].x - userSettingsEdgePoints[1].x) / 10;
		const dy4 = (userSettingsEdgePoints[2].y - userSettingsEdgePoints[1].y) / 10;
		const sx1 = userSettingsEdgePoints[0].x;
		const sy1 = userSettingsEdgePoints[0].y;
		const ex1 = userSettingsEdgePoints[1].x;
		const ey1 = userSettingsEdgePoints[1].y;
		for (let i = 0; i < 10; i++) {
			edgeSettingsContext.beginPath();
			edgeSettingsContext.moveTo(sx1 + i * dx3, sy1 + i * dy3);
			edgeSettingsContext.lineTo(ex1 + i * dx4, ey1 + i * dy4);
			edgeSettingsContext.stroke();
		}
		// jelölő pöttyök
		userSettingsEdgePoints.forEach(point => {
			edgeSettingsContext.beginPath();
			edgeSettingsContext.arc(point.x, point.y, 10, 0, 2 * Math.PI);
			edgeSettingsContext.fill();
		});
	});
	// const resultDomElement = document.getElementById('result');
	const resultDomElement = document.createElement('canvas');
	resultDomElement.width = 480;
	resultDomElement.height = 360;
	const resultContext = resultDomElement.getContext('2d');
	document.getElementById('show-selection').addEventListener(c, function () {
		const targetWidth = resultDomElement.width;
		const targetHeight = resultDomElement.height;
		// lépésközök a vizszintes szakaszokon (1==fent, 2==lent)
		const dx1 = (userSettingsEdgePoints[1].x - userSettingsEdgePoints[0].x) / targetWidth;
		const dy1 = (userSettingsEdgePoints[1].y - userSettingsEdgePoints[0].y) / targetWidth;
		const dx2 = (userSettingsEdgePoints[2].x - userSettingsEdgePoints[3].x) / targetWidth;
		const dy2 = (userSettingsEdgePoints[2].y - userSettingsEdgePoints[3].y) / targetWidth;
		// a könnyebb kódírás végett pár segédáltozó a referenciapontoknak
		const sx0 = userSettingsEdgePoints[0].x;
		const sy0 = userSettingsEdgePoints[0].y;
		const ex0 = userSettingsEdgePoints[3].x;
		const ey0 = userSettingsEdgePoints[3].y;

		const QUALITY = 1; // minél nagyobb annál pocsékabb

		for (let x = 0; x < targetWidth; x += QUALITY) {
			// referenciapontok fent és lent
			const sx = sx0 + x * dx1;
			const sy = sy0 + x * dy1;
			const ex = ex0 + x * dx2;
			const ey = ey0 + x * dy2;
			// lépésközök
			const dx = (ex - sx) / targetHeight;
			const dy = (ey - sy) / targetHeight;

			function drawSomeData(progressY, x, sx, sy, dx, dy, targetHeight, onEnd) {
				const toY = Math.min(progressY + 20, targetHeight)
				for (let y = progressY; y < toY; y += QUALITY) {
					const sourceX = sx + y * dx;
					const sourceY = sy + y * dy;
					const rgb = edgeSettingsContext.getImageData(sourceX, sourceY, QUALITY, QUALITY);
					resultContext.putImageData(rgb, x, y);
				}
				if (toY < targetHeight) {
					setTimeout(drawSomeData, 0, toY, x, sx, sy, dx, dy, targetHeight, onEnd);
				} else {
					if (x >= targetWidth-1) {
						onEnd();
					}
				}
			}

			drawSomeData(0, x, sx, sy, dx, dy, targetHeight, () => {
				document.body.removeChild(document.getElementById('result'));
				document.body.appendChild(resultDomElement);
			});
		}
	});
});
