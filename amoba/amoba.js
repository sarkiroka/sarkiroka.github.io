(function () {
	const amoba = {};
	const flags = {};
	const X = Symbol('X');
	const O = Symbol('O');
	const Empty = Symbol('Empty');
	let whoTurn = X;
	let lastUserPosition = null;
	let lastComputerPosition = null;
	const COMPUTER_POSITION_STATES = {
		NONE: Symbol('None'),
		BLINK: Symbol('Blink'),
		SHOW: Symbol('Show')
	};
	let computerPositionStateBlinks = 0;
	let computerPositionState = COMPUTER_POSITION_STATES.NONE;

	let randomSeed;

	function initRandomSeed() {
		randomSeed = {x: 1, y: 1, z: 1};
	}

	function random() {
		if (typeof randomSeed == 'undefined') {
			initRandomSeed();
		}
		randomSeed.x = (171 * randomSeed.x) % 30269;
		randomSeed.y = (172 * randomSeed.y) % 30307;
		randomSeed.z = (170 * randomSeed.z) % 30323;
		return (randomSeed.x / 30269.0 + randomSeed.y / 30307.0 + randomSeed.z / 30323.0) % 1.0;
	}

	function getStringFromSymbol(sign) {
		let retValue;
		if (sign == O) {
			retValue = 'O';
		} else if (sign == X) {
			retValue = 'X';
		}
		return retValue;
	}

	function getAnotherSign(sign) {
		return sign == X ? O : X;
	}

	function getCell(x, y) { // táblapozició pixelcoordinátává alakítása
		let startX = x * amoba.cellSize + amoba.tableXY.x;
		let startY = y * amoba.cellSize + amoba.tableXY.y;
		return {
			startX,
			startY,
			endX: startX + amoba.cellSize,
			endY: startY + amoba.cellSize
		};
	}

	function getCellValue(x, y) {
		if (Array.isArray(x)) {
			[x, y] = x;
		}
		if (typeof x == 'string' && x.indexOf(',') > -1) {
			[x, y] = x.split(',');
		}
		let value = amoba.table[[x, y]];
		if (typeof value == 'undefined') {
			value = Empty;
		}
		return value;
	}

	function isEmptyCellValue(x, y) {
		if (Array.isArray(x)) {
			[x, y] = x;
		}
		if (typeof x == 'string' && x.indexOf(',') > -1) {
			[x, y] = x.split(',');
		}
		let value = getCellValue(x, y);
		return typeof value == 'undefined' || value == Empty;
	}

	function putCellValue(x, y, value) {
		if (Array.isArray(x)) {
			value = y;
			[x, y] = x;
		}
		if (typeof x == 'string' && x.indexOf(',') > -1) {
			value = y;
			[x, y] = x.split(',');
		}
		if (isEmptyCellValue(x, y)) {
			amoba.table[[x, y]] = value;
		} else {
			console.error('cannot put ', value, ' to [', x, y, ']. it is not empty', getCellValue(x, y));
		}
	}

	function randomAround(number, around = 3) {
		return number + 2 * around * random() - around;
	}

	function randomAroundInteger(number, around = 3) {
		return Math.round(number + 2 * around * random() - around);
	}

	function mathRandomAroundInteger(number, around = 3) {
		return Math.round(number + 2 * around * Math.random() - around);
	}

	function drawHandLine(x1, y1, x2, y2) {
		amoba.ctx.beginPath();
		amoba.ctx.lineWidth = 3;
		for (let i = 0; i < 5; i++) {
			amoba.ctx.moveTo(randomAround(x1), randomAround(y1));
			amoba.ctx.lineTo(randomAround(x2), randomAround(y2));
		}
		amoba.ctx.stroke();
	}

	function drawHandCircle(x, y, r) {
		amoba.ctx.beginPath();
		amoba.ctx.lineWidth = 3;
		for (let i = 0; i < 5; i++) {
			let endAngle = 2 * Math.PI;
			if (i == 4) {
				endAngle = random() * endAngle;
			}
			amoba.ctx.arc(randomAround(x), randomAround(y), randomAround(r, 1), 0, endAngle);
		}
		amoba.ctx.stroke();
	}

	function drawX(x, y) {
		let cell = getCell(x, y);
		const margin = 6;
		amoba.ctx.strokeStyle = '#0000ff';
		drawHandLine(cell.startX + margin, cell.startY + margin, cell.endX - margin, cell.endY - margin); // "\"
		drawHandLine(cell.startX + margin, cell.endY - margin, cell.endX - margin, cell.startY + margin); // "/"
	}

	function drawO(x, y) {
		let cell = getCell(x, y);
		const margin = 7;
		amoba.ctx.strokeStyle = '#ff0000';
		drawHandCircle((cell.startX + cell.endX) / 2, (cell.startY + cell.endY) / 2, amoba.cellSize / 2 - margin);
	}

	function drawSign(coordinates, sign) { // [x, y]
		let [x, y] = coordinates.split(',');
		if (sign === O) {
			drawO(x, y);
		} else if (sign === X) {
			drawX(x, y);
		} else {
			console.error('cannot determine sign X or O', sign);
		}
	}

	function drawLastComputerPosition() {
		let cell = getCell(lastComputerPosition.x, lastComputerPosition.y);
		let margin = 2;
		amoba.ctx.beginPath();
		amoba.ctx.strokeStyle = '#444';
		amoba.ctx.lineWidth = 3;
		amoba.ctx.rect(cell.startX + margin, cell.startY + margin, amoba.cellSize - 2 * margin, amoba.cellSize - 2 * margin);
		amoba.ctx.stroke();
	}

	function drawTable() {
		initRandomSeed();
		amoba.ctx.beginPath();
		amoba.ctx.globalCompositeOperation = 'source-over';
		amoba.ctx.lineWidth = 1;
		amoba.ctx.fillStyle = '#ccc';
		amoba.ctx.strokeStyle = '#000';
		amoba.ctx.fillRect(0, 0, amoba.canvas.width, amoba.canvas.height);
		let x = -amoba.cellSize;
		let y = -amoba.cellSize;
		let shiftX = amoba.tableXY.x % amoba.cellSize;
		let shiftY = amoba.tableXY.y % amoba.cellSize;
		while (x < amoba.canvas.width + amoba.cellSize) {
			while (y < amoba.canvas.height + amoba.cellSize) {
				amoba.ctx.rect(x + shiftX, y + shiftY, amoba.cellSize, amoba.cellSize);
				y += amoba.cellSize;
			}
			y = -amoba.cellSize;
			x += amoba.cellSize;
		}
		amoba.ctx.stroke();
		Object.keys(amoba.table).forEach(coordinate => {
			drawSign(coordinate, amoba.table[coordinate]);
		});
		if (computerPositionState == COMPUTER_POSITION_STATES.SHOW) {
			drawLastComputerPosition();
		}
	}

	function blinkComputerPosition() {
		if (lastComputerPosition) {
			console.log('blinks', computerPositionStateBlinks);
			if (computerPositionStateBlinks > 0 && computerPositionState == COMPUTER_POSITION_STATES.BLINK) {
				computerPositionStateBlinks--;
				if (!computerPositionStateBlinks) {
					computerPositionState = COMPUTER_POSITION_STATES.SHOW;
				}
			}
			if (computerPositionState == COMPUTER_POSITION_STATES.BLINK) {
				amoba.ctx.globalCompositeOperation = 'xor';
			} else {
				amoba.ctx.globalCompositeOperation = 'source-over';
			}
			drawLastComputerPosition();
		}
	}

	function setCanvasDimensions() {
		amoba.canvas.width = document.body.parentElement.clientWidth;
		amoba.canvas.height = document.body.parentElement.clientHeight;
	}

	function onResize() {
		setCanvasDimensions();
		drawTable();
	}

	function onMousewheel(e) {
		let {deltaX, deltaY} = e;
		if (!deltaX && deltaY && e.shiftKey) {
			deltaX = deltaY;
			deltaY = 0;
		}
		amoba.tableXY.x += deltaX;
		amoba.tableXY.y += deltaY;
		if (!flags.waitToPaint) {
			flags.waitToPaint = true;
			requestAnimationFrame(() => {
				drawTable();
				flags.waitToPaint = false;
			});
		}
	}

	let userResolver = null;

	function getXYCoordinatesFromMouseEvent(e) {
		let x = Math.floor((e.clientX - amoba.tableXY.x) / amoba.cellSize);
		let y = Math.floor((e.clientY - amoba.tableXY.y) / amoba.cellSize);
		return {x, y}
	}

	function onClick(e) {
		if (whoTurn === O) {
			let {x, y} = getXYCoordinatesFromMouseEvent(e);
			console.log('click', x, y);
			if (!isEmptyCellValue(x, y)) {
				console.error('this cell is not empty, but user wants to put here', getCellValue(x, y));
			} else {
				if (typeof userResolver == 'function') {
					lastUserPosition = [x, y];
					console.log('user coords', lastUserPosition)
					putCellValue(x, y, whoTurn)
					userResolver();
				} else {
					console.error('there is no user resolver');
				}
			}
		} else {
			console.error('too early click', {e, whoTurn});
		}
	}

	function initVariables() {
		amoba.canvas = document.getElementById('amoba');
		amoba.winnerBox = document.getElementById('winnerBox');
		amoba.winnerTextBox = document.getElementById('winnerText');
		setCanvasDimensions();
		amoba.ctx = amoba.canvas.getContext('2d');
		amoba.table = {}; // a jelek. kulcs a koordináta [x,y] tömb, érték a jel
		amoba.tableXY = {x: 0, y: 0}; // az eltolás
		amoba.cellSize = 50; // mekkora egy négyzet
		lastUserPosition = null;
		if (!amoba.points) {
			amoba.points = {user: 0, computer: 0};
		}
		amoba.chanceToWin = 0; // hard
		initRandomSeed();
		if (location.search) {
			const urlSearchParams = new URLSearchParams(location.search);
			let levelParam = urlSearchParams.get('level');
			if (levelParam == parseInt(levelParam, 10)) {
				levelParam = parseInt(levelParam, 10);
				if (levelParam >= 0 && levelParam <= 100) {
					amoba.chanceToWin = Math.abs((100 - levelParam) / 100);
					if (isNaN(amoba.chanceToWin)) {
						amoba.chanceToWin = 0;
					}
				}
			}
		}
	}

	function onMove(e) {
		let title = '';
		if (!flags.showWinner) {
			let {x, y} = getXYCoordinatesFromMouseEvent(e);
			title = `${x};${y}`;
		}
		amoba.canvas.setAttribute('title', title);
	}

	function onNewGame(e) {
		e.stopPropagation();
		amoba.winnerBox.classList.remove('show');
		flags.showWinner = false;
		start();
	}

	function onCancelGame(e) {
		e.stopPropagation();
		amoba.winnerBox.classList.remove('show');
		flags.showWinner = false;
		setTimeout(() => {
			amoba.winnerBox.classList.add('show');
			flags.showWinner = true;
		}, 30000);
	}

	function initEvents() {
		window.addEventListener('resize', onResize);
		document.addEventListener('mousewheel', onMousewheel);
		document.addEventListener('click', onClick);
		document.addEventListener('mousemove', onMove);
		document.getElementById('winnerOk').addEventListener('click', onNewGame);
		document.getElementById('winnerCancel').addEventListener('click', onCancelGame);
		if (!flags.blinkId) {
			flags.blinkId = setInterval(blinkComputerPosition, 1000);
		}
	}

	function putComputerRandomAroundLastPosition() { // ha már minden logika cserbenhagy, akkor random tesz a gép
		console.log('generate a random put')
		const initialMaxTry = 100;
		let distance = 1; // először a közelben keresünk helyet, aztán egyre távolabb és távolabb
		let maxTry = initialMaxTry;
		let coordinates = null;
		if (lastUserPosition) {
			let [userX, userY] = lastUserPosition;
			while (!coordinates && distance < 100) {
				while (!coordinates && maxTry > 0) {
					let testCoordinates = [mathRandomAroundInteger(userX, distance), mathRandomAroundInteger(userY, distance)];
					if (isEmptyCellValue(testCoordinates)) {
						coordinates = {x: testCoordinates[0], y: testCoordinates[1]};
					}
				}
				distance++;
				maxTry = initialMaxTry;
			}
		} else {
			console.log('there is no last user position');
			coordinates = getXYCoordinatesFromMouseEvent({
				clientX: (amoba.canvas.width + amoba.tableXY.x) / 2,
				clientY: (amoba.canvas.height + amoba.tableXY.y) / 2
			});
		}
		return coordinates;
	}

	function getSearchedSignByPatternChar(sign, patternChar) {
		let searchedChar;
		switch (patternChar) {
			case 'O':
				searchedChar = sign;
				break;
			case 'X':
				searchedChar = getAnotherSign(sign);
				break;
			case '_':
			case '#':
				searchedChar = Empty;
				break;
			default:
				console.error('unknown pattern character', patternChar);
		}
		return searchedChar;
	}

	function isPatternCharMatchAtPosition(x, y, patternChar, sign) {
		let searchedChar = getSearchedSignByPatternChar(sign, patternChar);
		let foundSign = getCellValue(x, y);
		return searchedChar == foundSign;
	}

	function getDxDyByDirection(direction) {
		let dx = 0;
		let dy = 0;
		switch (direction) {
			case 0:
				dx = 0;
				dy = -1;
				break;
			case 1:
				dx = 1;
				dy = -1;
				break;
			case 2:
				dx = 1;
				dy = 0;
				break;
			case 3:
				dx = 1;
				dy = 1;
				break;
			case 4:
				dx = 0;
				dy = 1;
				break;
			case 5:
				dx = -1;
				dy = 1;
				break;
			case 6:
				dx = -1;
				dy = 0;
				break;
			case 7:
				dx = -1;
				dy = -1;
				break;
			default:
				console.error('unknown direction', direction);
		}
		return {dx, dy};
	}

	function findPatternAtPositionInDirection(pattern, sign, x, y, direction) {
		let {dx, dy} = getDxDyByDirection(direction);
		pattern = pattern.split('');
		let firstValueableIndex = pattern.findIndex(char => char == 'O' || char == 'X');
		let patternInfo = null;
		let allMatches = true;
		for (let i = -firstValueableIndex; i < pattern.length - firstValueableIndex; i++) {
			let patternChar = pattern[i + firstValueableIndex];
			if (patternChar == '#') {
				patternInfo = {x: x + i * dx, y: y + i * dy, direction};
			}
			allMatches &= isPatternCharMatchAtPosition(x + i * dx, y + i * dy, patternChar, sign);
			if (!allMatches) {
				break;
			}
		}
		return allMatches ? patternInfo || {x, y, direction} : null;
	}

	function findPatternAtPosition(pattern, sign, x, y) {
		let found = false;
		let directions = [0, 1, 2, 3, 4, 5, 6, 7];
		directions.sort(aDirection => Math.random() < 0.5 ? 1 : -1); // ez azért hogy ne mindig 12 órától kezdje
		for (let i = 0; i < directions.length; i++) {
			let direction = directions[i];
			found = findPatternAtPositionInDirection(pattern, sign, x, y, direction);
			if (found) {
				break;
			}
		}
		return found;
	}

	/**
	 * mintaillesztés
	 * @param pattern sima string minta. O saját jel, X ellenkező jel, _ üres jel.
	 * @param sign ezt keresem
	 * @return {null|Array} megvan
	 */
	function findByPattern(pattern, sign) {
		const patternChars = pattern.split('');
		const firstValuablePatternChar = patternChars.find(char => char == 'O' || char == 'X');
		let patternFound = null;
		let coordinates = Object.keys(amoba.table);
		for (let coordinate of coordinates) {
			let [x, y] = coordinate.split(',').map(string => parseInt(string, 10));
			if (isPatternCharMatchAtPosition(x, y, firstValuablePatternChar, sign)) {
				patternFound = findPatternAtPosition(pattern, sign, x, y);
				if (patternFound) {
					console.log('pattern found', pattern, sign, patternFound)
					break;
				}
			}
		}
		return patternFound;
	}

	function putComputer() {
		const chance = () => Math.random() > amoba.chanceToWin;
		let patternInfo = null;
		console.log('put computer...');
		// azonnal nyerni
		patternInfo = findByPattern('OOOO#', X);
		if (!patternInfo) patternInfo = findByPattern('OOO#O', X);
		if (!patternInfo) patternInfo = findByPattern('OO#OO', X);
		// azonnali veszteségelhárítás
		if (!patternInfo) patternInfo = findByPattern('OOOO#', O);
		if (!patternInfo && chance()) patternInfo = findByPattern('OOO#O', O);
		if (!patternInfo && chance()) patternInfo = findByPattern('OO#OO', O);
		// szabadon álló 4-es - következő lépésben nyerünk
		if (!patternInfo && chance()) patternInfo = findByPattern('_OOO#_', X);
		if (!patternInfo && chance()) patternInfo = findByPattern('_OO#O_', X);
		if (!patternInfo && chance()) patternInfo = findByPattern('_OOO#_', O);
		if (!patternInfo && chance()) patternInfo = findByPattern('_OO#O_', O);

		if (!patternInfo && chance()) patternInfo = findByPattern('_OO#__', X);
		if (!patternInfo && chance()) patternInfo = findByPattern('_O#O__', X);

		if (!patternInfo && chance()) patternInfo = findByPattern('XOOO#_', X);
		if (!patternInfo && chance()) patternInfo = findByPattern('XOOO_#', X);

		if (!patternInfo && chance()) patternInfo = findByPattern('_OO#__', O);
		if (!patternInfo && chance()) patternInfo = findByPattern('_O#O__', O);

		if (!patternInfo && chance()) patternInfo = findByPattern('__O#__', X);
		if (!patternInfo && chance()) patternInfo = findByPattern('_O#___', X);
		if (!patternInfo && chance()) patternInfo = findByPattern('__O#__', O);
		if (!patternInfo && chance()) patternInfo = findByPattern('_O#___', O);

		if (!patternInfo && chance()) patternInfo = findByPattern('XOOO#_', O);
		if (!patternInfo && chance()) patternInfo = findByPattern('XOOO_#', O);

		// nincs normális lehetőség, jöhet a random
		if (!patternInfo) patternInfo = putComputerRandomAroundLastPosition();

		if (!patternInfo) {
			console.error('computer cannot create a step :(');
		} else {
			console.log('the computer coordinates is', patternInfo);
			lastComputerPosition = {x: patternInfo.x, y: patternInfo.y};
			computerPositionState = COMPUTER_POSITION_STATES.BLINK;
			computerPositionStateBlinks = 5;
			putCellValue(patternInfo.x, patternInfo.y, X);
		}
	}

	function waitToUser() {
		console.log('wait to user');
		return new Promise(resolve => {
			// várunk a userre, ha tett, akkor resolveoljuk. amig a gép tesz addig letiltjuk hogy ne tudjon tenni - whoTurn változó
			userResolver = resolve;
		});
	}

	function isWin(sign) {
		return findByPattern('OOOOO', sign);
	}

	const allWinMessages = {
		O: [
			'Zárlatos lett az egyik áramköröm! Újra?',
			'Az izzadságcseppjeid elrontották a számításom. Próbáljuk újra!',
			'Véletlen volt! Újra!',
			'Ez is csak egy ritka véletlen volt! Próbáljuk meg újra!',
			'Bizonyítsd be, hogy le tudsz újra győzni!',
			'Csak hagytalak... Játszunk még egyet?',
			'Most örülsz, mi?! Lássuk a következő játszmát!',
			'Hinnye no, nyertél. Játszunk még egyet!',
			'A teringettét! Ez most sikerült neked. Újat?',
			'Hagytam magam! Új játék?',
			'Jó volt? Többet nem fordul elő ilyen hiba!',
			'Rendszerhiba volt! Ismétlést akarok!',
			'Adatbeviteli hiba történt! Ismételjük meg!',
			'Gratulálok, visszavágót?'
		],
		X: [
			'Nyehehe, ez könnyű volt, visszavágó?',
			'Nem bírsz velem! Visszavágót?',
			'Megpróbálod újra?',
			'Nem megy ez neked! Újra?',
			'Nem szégyen az, ha kikapsz az okosabbtól! Próbálj te is okosabb lenni!',
			'Nagyon okos vagyok! Lennél te is ilyen okos?',
			'Ez nem lehet véletlen, győzött az okosabb. Még egyet?',
			'Hagytad magad?',
			'Szeretem ezt a játékot!',
			'Ne legyél szomorú, a gép nagyon okos, nehéz legyőzni!',
			'Majdnem verhetetlen vagyok!'
		]
	}

	function showWinner(winner) {
		let winInfo = isWin(winner);
		let {dx, dy} = getDxDyByDirection(winInfo.direction);
		let cellInfo = getCell(winInfo.x, winInfo.y);
		let startX = cellInfo.startX + amoba.cellSize / 2;
		let startY = cellInfo.startY + amoba.cellSize / 2;
		let endX = startX + 4 * amoba.cellSize * dx;
		let endY = startY + 4 * amoba.cellSize * dy;
		startX -= dx * amoba.cellSize / 4;
		startY -= dy * amoba.cellSize / 4;
		endX += dx * amoba.cellSize / 4;
		endY += dy * amoba.cellSize / 4;
		amoba.ctx.strokeStyle = '#000000';
		drawHandLine(startX, startY, endX, endY);
		console.log('the winner is', winner, startX, startY, endX, endY);
		let winMessages = allWinMessages[getStringFromSymbol(winner)];
		let messagePointer = Math.min(Math.round(random() * winMessages.length), winMessages.length - 1);
		amoba.winnerTextBox.innerHTML = winMessages[messagePointer];
		amoba.winnerBox.classList.add('show');
		document.getElementById('winnerOk').focus();
		if (winner == X) {
			amoba.points.computer++;
		} else {
			amoba.points.user++;
		}
		let result = document.getElementById('result');
		result.querySelector('.computer').innerHTML = `${amoba.points.computer}`;
		result.querySelector('.user').innerHTML = `${amoba.points.user}`;
		flags.showWinner = true;
	}

	function game() {
		return new Promise(function innerGame(resolve) {
			putComputer();
			drawTable();
			if (!isWin(X)) {
				whoTurn = O;
				waitToUser().then(() => {
					userResolver = null;
					drawTable();
					if (!isWin(O)) {
						whoTurn = X;
						setTimeout(innerGame, 0, resolve);
					} else {
						resolve(O);
					}
				})
			} else {
				resolve(X);
			}
		});
	}

	function start() {
		initVariables();
		initEvents();
		game().then(winner => {
			showWinner(winner);
		});
	}

	document.addEventListener('DOMContentLoaded', start);
})()
