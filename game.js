const col = 10;
const row = 20;
const game = document.getElementById("game");
const scoreText = document.getElementById("score");
const levelText = document.getElementById("level");
const linesText = document.getElementById("lines");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const levelChoices = document.getElementById("levelChoices");
const levelIntro = document.getElementById("levelIntro");
const levelDescription = document.getElementById("levelDescription");
const levelInfo = {
    1: {
        name: "CƠ BẢN",
        description: "Xếp các khối gạch và xóa đủ 10 hàng để thắng."
    },
    2: {
        name: "GIÓ THỔI",
        description: "Cứ 5 giây, gió sẽ đẩy khối sang trái hoặc phải."
    },
    3: {
        name: "HÀNG RÁC",
        description: "Cứ 30 giây, một hàng rác sẽ xuất hiện từ dưới lên."
    },
    4: {
        name: "SƯƠNG MÙ",
        description: "Cứ 5 giây, bảng chơi sẽ bị che trong 2 giây."
    },
    5: {
        name: "CHƯỚNG NGẠI",
        description: "Có 4 ô cản ở phía dưới. Hãy xếp gạch khéo léo để vượt qua."
    },
    6: {
        name: "ĐÓNG BĂNG",
        description: "Cứ 10 giây, một vùng 3×3 sẽ đóng băng trong 5 giây."
    },
    7: {
        name: "CỔNG DỊCH CHUYỂN",
        description: "Chạm cổng A/B để dịch chuyển. Hai cổng đổi vị trí mỗi 15 giây."
    },
    8: {
        name: "GẠCH BIẾN MẤT",
        description: "Gạch tự biến mất sau 30 giây. Xóa 10 hàng trong 5 phút!"
    }
};
let pendingLevel = 1;
let pendingResetScore = false;
const LEVEL8_DURATION = 300000;
const PORTAL_INTERVAL = 15000;
let portals = null;
let portalTimer = null;
let portalElapsed = 0;
let portalLastTick = 0;
let portalCooldown = false;
let level8CountdownTimer = null;
let level8EndTime = 0;
let obstacles = [];
let board = [];
let piece = [];
let nextBlockId = 0;
let shapeIndex = 0;
let rotation = 0;
let score = 0;
let level = 1;
let lines = 0;
let timer = null;
let windTimer = null;
let fogTimer = null;
let fogHideTimer = null;
let garbageTimer = null;
let vanishingTimer = null;
let freezeTimer = null;
let freezeElapsed = 0;
let freezeRemaining = 0;
let freezeLastTick = 0;
let frozenZone = null;
const FREEZE_INTERVAL = 10000;
const FREEZE_DURATION = 5000;
let pauseStartedAt = 0;
const VANISH_TIME = 30000;
let paused = false;
let running = false;
const shapes = [
    { name: "I", cells: [[0,1],[1,1],[2,1],[3,1]] },
    { name: "J", cells: [[0,0],[0,1],[1,1],[2,1]] },
    { name: "L", cells: [[2,0],[0,1],[1,1],[2,1]] },
    { name: "O", cells: [[0,0],[1,0],[0,1],[1,1]] },
    { name: "T", cells: [[1,0],[0,1],[1,1],[2,1]] },
    { name: "S", cells: [[1,0],[2,0],[0,1],[1,1]] },
    { name: "Z", cells: [[0,0],[1,0],[1,1],[2,1]] }
];
function initGame() {
    game.innerHTML = "";
    board = [];
    for (let i = 0; i < row; i++) {
        const tr = document.createElement("tr");
        board[i] = [];
        for (let j = 0; j < col; j++) {
            const td = document.createElement("td");
            td.id = "cell_" + i + "_" + j;
            td.classList.add("cell");
            tr.appendChild(td);
            board[i][j] = "";
        }
        game.appendChild(tr);
    }
}
function initObstacles() {
    obstacles = [];
    if (level !== 5) return;
    while (obstacles.length < 4) {
        const x = Math.floor(Math.random() * col);
        const y = Math.floor(Math.random() * 6) + 14;
        if (!obstacles.some(o => o.x === x && o.y === y)) {
            obstacles.push({ x, y });
        }
    }
}
function initPiece() {
    shapeIndex = Math.floor(Math.random() * shapes.length);
    rotation = 0;
    portalCooldown = false;
    piece = shapes[shapeIndex].cells.map(([x, y]) => ({
        x: x+3 ,
        y: y
    }));
    if (!canMove(0, 0, piece)) {
        endGame();
    }
}
function render() {
    for (let y = 0; y < row; y++) {
        for (let x = 0; x < col; x++) {
            const td = document.getElementById("cell_" + y + "_" + x);
            td.className = "cell";
            const block = board[y][x];
            if (block === "#") {
                td.classList.add("obstacle");
            } else if (block !== "") {
                if (typeof block === "object") {
                    td.classList.add(block.type);
                    if (level === 6 && block.frozen) {
                        td.classList.add("frozen-block");
                    }
                    if (level === 8 && Date.now() - block.createdAt >= VANISH_TIME - 5000) {
                        td.classList.add("vanishing-soon");
                    }
                } else {
                    td.classList.add(block);
                }
            }
        }
    }
    for (const cell of piece) {
        if (cell.y >= 0 && cell.y < row &&
            cell.x >= 0 && cell.x < col) {
            const td = document.getElementById("cell_" + cell.y + "_" + cell.x);
            td.classList.add(shapes[shapeIndex].name);
        }
    }
    for (const obstacle of obstacles) {
        const td = document.getElementById("cell_" + obstacle.y + "_" + obstacle.x);
        td.classList.add("obstacle");
        td.textContent = "";
    }
    if (level === 6 && frozenZone) {
        for (let y = frozenZone.y; y < frozenZone.y + 3; y++) {
            for (let x = frozenZone.x; x < frozenZone.x + 3; x++) {
                document.getElementById(`cell_${y}_${x}`).classList.add("frozen-zone");
            }
        }
    }
    if (level === 7 && portals) {
        document.getElementById(`cell_${portals.a.y}_${portals.a.x}`).classList.add("portal-a");
        document.getElementById(`cell_${portals.b.y}_${portals.b.x}`).classList.add("portal-b");
    }
}
function canMove(dx, dy, newPiece = piece) {
    return newPiece.every(cell => {
        const x = cell.x + dx;
        const y = cell.y + dy;
        return x >= 0 && x < col &&
            y >= 0 && y < row &&
            !board[y][x] && !obstacles.some(o => o.x === x && o.y === y) && !isFrozenPosition(x, y);
    });
}
function move(dx, dy) {
    if (!running || paused) return;
    if (canMove(dx, dy)) {
        piece = piece.map(cell => ({
            x: cell.x + dx,
            y: cell.y + dy
        }));
        tryTeleport();
        render();
    } else if (dy === 1) {
        lockPiece();
    }
}
function lockPiece() {
    const now = Date.now();
    const groupId = ++nextBlockId;
    for (const cell of piece) {
        if (cell.y < 0) {
            endGame();
            return;
        }
        if (level === 8) {
            board[cell.y][cell.x] = {
                type: shapes[shapeIndex].name,
                createdAt: now,
                groupId: groupId
            };
        } else if (isFrozenPosition(cell.x, cell.y)) {
            board[cell.y][cell.x] = {
                type: shapes[shapeIndex].name,
                frozen: true
            };
        } else {
            board[cell.y][cell.x] = shapes[shapeIndex].name;
        }
    }
    clearLines();
    if (!running) return;
    initPiece();
    if (running) {
        if (level === 7 && portals && (board[portals.a.y][portals.a.x] !== "" || board[portals.b.y][portals.b.x] !== "")) {
            placePortals();
        }
        render();
    }
}
function addGarbageRow() {
    if (!running || paused || level !== 3) return;
    if (board[0].some(cell => cell !== "")) {
        endGame();
        return;
    }
    const newBoard = board.slice(1);
    const garbageRow = Array(col).fill("#");
    const hole = Math.floor(Math.random() * col);
    garbageRow[hole] = "";
    newBoard.push(garbageRow);
    let newPiece = piece;
    const overlapping = piece.some(cell => newBoard[cell.y][cell.x] !== "");
    if (overlapping) {
        if (piece.some(cell => cell.y === 0)) {
            endGame();
            return;
        }
        newPiece = piece.map(cell => ({
            x: cell.x,
            y: cell.y - 1
        }));
    }
    board = newBoard;
    piece = newPiece;
    render();
}
function clearLines() {
    let cleared = 0;
    for (let y = row - 1; y >= 0; y--) {
        const hasFrozenBlock = level === 6 && board[y].some(cell => cell && typeof cell === "object" && cell.frozen);
        if (!hasFrozenBlock && board[y].every(cell => cell !== "")) {
            board.splice(y, 1);
            board.unshift(Array(col).fill(""));
            obstacles.forEach(obstacle => {
                if (obstacle.y < y) {
                    obstacle.y++;
                }
            });
            cleared++;
            y++;
        }
    }
    if (cleared > 0) {
        lines += cleared;
        score += cleared * 10;
        scoreText.textContent = score;
        linesText.textContent = lines;
        if (lines >= 10) {
            completeLevel();
        }
    }
}
function rotate() {
    if (!running || paused || shapeIndex === 3) return;
    const minX = Math.min(...piece.map(cell => cell.x));
    const minY = Math.min(...piece.map(cell => cell.y));
    const width = Math.max(...piece.map(cell => cell.x)) - minX + 1;
    const rotated = piece.map(cell => ({
        x: minX + (cell.y - minY),
        y: minY + width - 1 - (cell.x - minX)
    }));
    if (canMove(0, 0, rotated)) {
        piece = rotated;
        rotation++;
        tryTeleport();
        render();
    }
}
function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        move(0, 1);
    }, 800);
}
function startWind() {
    clearInterval(windTimer);
    const windMessage = document.getElementById("windMessage");
    windMessage.textContent = "";
    if (level === 2) {
        windTimer = setInterval(() => {
            if (running && !paused) {
                const direction = Math.random() < 0.5 ? -1 : 1;
                windMessage.textContent = direction === 1 ? "GIÓ THỔI SANG PHẢI" : "GIÓ THỔI SANG TRÁI";
                move(direction, 0);
            }
        }, 5000);
    }
}
function startFog() {
    clearInterval(fogTimer);
    clearTimeout(fogHideTimer);
    const fogEffect = document.getElementById("fogEffect");
    fogEffect.style.display = "none";
    if (level === 4) {
        fogTimer = setInterval(() => {
            if (running && !paused) {
                fogEffect.style.display = "block";
                fogHideTimer = setTimeout(() => {
                    fogEffect.style.display = "none";
                }, 2000);
            }
        }, 5000);
    }
}
function startGarbageTimer() {
    clearInterval(garbageTimer);
    if (level === 3) {
        garbageTimer = setInterval(() => {
            if (running && !paused) {
                addGarbageRow();
            }
        }, 30000);
    }
}
function placePortals() {
    if (level !== 7 || !running) return;
    const available = [];
    for (let y = 3; y <= row - 4; y++) {
        for (let x = 1; x < col - 1; x++) {
            if (board[y][x] === "" && !piece.some(cell => cell.x === x && cell.y === y)) {
                available.push({ x, y });
            }
        }
    }
    if (available.length < 2) return;
    const moved = available.filter(cell => !portals || ![portals.a, portals.b].some(old => old.x === cell.x && old.y === cell.y));
    const positions = moved.length >= 2 ? moved : available;
    const a = positions[Math.floor(Math.random() * positions.length)];
    const farEnough = positions.filter(cell => Math.abs(cell.x - a.x) + Math.abs(cell.y - a.y) >= 5);
    if (!farEnough.length) return;
    const b = farEnough[Math.floor(Math.random() * farEnough.length)];
    portals = { a, b };
    portalCooldown = false;
    render();
}
function tryTeleport() {
    if (level !== 7 || !portals || !running) return;
    const atA = piece.find(cell => cell.x === portals.a.x && cell.y === portals.a.y);
    const atB = piece.find(cell => cell.x === portals.b.x && cell.y === portals.b.y);
    if (!atA && !atB) {
        portalCooldown = false;
        return;
    }
    if (portalCooldown) return;
    const from = atA ? portals.a : portals.b;
    const to = atA ? portals.b : portals.a;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const destination = piece.map(cell => ({
        x: cell.x + dx,
        y: cell.y + dy
    }));
    if (canMove(0, 0, destination)) {
        piece = destination;
        portalCooldown = true;
    }
}
function stopPortalTimer() {
    clearInterval(portalTimer);
    portalTimer = null;
    portalElapsed = 0;
    portals = null;
    portalCooldown = false;
}
function startPortalTimer() {
    stopPortalTimer();
    if (level !== 7) return;
    placePortals();
    portalLastTick = Date.now();
    portalTimer = setInterval(() => {
        const now = Date.now();
        if (!running || paused || level !== 7) {
            portalLastTick = now;
            return;
        }
        portalElapsed += now - portalLastTick;
        portalLastTick = now;
        if (portalElapsed >= PORTAL_INTERVAL) {
            portalElapsed %= PORTAL_INTERVAL;
            placePortals();
        }
    }, 100);
}
function updateLevel8Countdown() {
    if (!running || paused || level !== 8) return;
    const timeLeft = Math.max(0, level8EndTime - Date.now());
    const seconds = Math.ceil(timeLeft / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    document.getElementById("level8Time").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(remainingSeconds).padStart(2, "0");
    if (timeLeft <= 0) {
        if (lines >= 10) {
            completeLevel();
        } else {
            endGame();
            message.textContent = "HẾT 5 PHÚT! BẠN ĐÃ THUA!";
        }
    }
}
function isFrozenPosition(x, y) {
    return level === 6 && frozenZone !== null && x >= frozenZone.x && x < frozenZone.x + 3 && y >= frozenZone.y && y < frozenZone.y + 3;
}
function freezeZone() {
    const occupied = [];
    for (let y = 0; y < row; y++) {
        for (let x = 0; x < col; x++) {
            if (board[y][x] !== "") {
                occupied.push({ x, y });
            }
        }
    }
    const anchor = occupied.length
        ? occupied[Math.floor(Math.random() * occupied.length)] : {
            x: Math.floor(Math.random() * col),
            y: Math.floor(Math.random() * row)
        };
    const x = Math.max(0, Math.min(col - 3, anchor.x - Math.floor(Math.random() * 3)));
    const y = Math.max(0, Math.min(row - 3, anchor.y - Math.floor(Math.random() * 3)));
    frozenZone = { x, y };
    freezeRemaining = FREEZE_DURATION;
    for (let i = y; i < y + 3; i++) {
        for (let j = x; j < x + 3; j++) {
            const block = board[i][j];
            if (block !== "") {
                board[i][j] = {
                    type: typeof block === "object" ? block.type : block,
                    frozen: true
                };
            }
        }
    }
    render();
}
function unfreezeBlocks() {
    for (let y = 0; y < row; y++) {
        for (let x = 0; x < col; x++) {
            const block = board[y][x];
            if (block && typeof block === "object" && block.frozen) {
                board[y][x] = block.type;
            }
        }
    }
}
function thawZone() {
    unfreezeBlocks();
    frozenZone = null;
    freezeRemaining = 0;
    clearLines();
    if (!running) return;
    if (!canMove(0, 0, piece)) {
        endGame();
        return;
    }
    render();
}
function stopFrozenTimer() {
    clearInterval(freezeTimer);
    freezeTimer = null;
    freezeElapsed = 0;
    freezeRemaining = 0;
    frozenZone = null;
    unfreezeBlocks();
}
function startFrozenTimer() {
    stopFrozenTimer();
    if (level !== 6) return;
    freezeLastTick = Date.now();
    freezeTimer = setInterval(() => {
        const now = Date.now();
        if (!running || paused || level !== 6) {
            freezeLastTick = now;
            return;
        }
        const delta = now - freezeLastTick;
        freezeLastTick = now;
        freezeElapsed += delta;
        if (frozenZone) {
            freezeRemaining -= delta;
            if (freezeRemaining <= 0) {
                thawZone();
            }
        }
        if (!running) return;
        if (freezeElapsed >= FREEZE_INTERVAL) {
            freezeElapsed %= FREEZE_INTERVAL;
            freezeZone();
        }
    }, 100);
}
function startLevel8Countdown() {
    clearInterval(level8CountdownTimer);
    document.getElementById("level8TimeBox").hidden = level !== 8;
    if (level !== 8) return;
    level8EndTime = Date.now() + LEVEL8_DURATION;
    updateLevel8Countdown();
    level8CountdownTimer = setInterval(() => {
        updateLevel8Countdown();
    }, 200);
}
function stopGameForMenu() {
    running = false;
    paused = false;
    stopFrozenTimer();
    stopPortalTimer();
    clearInterval(timer);
    clearInterval(windTimer);
    clearInterval(fogTimer);
    clearTimeout(fogHideTimer);
    clearInterval(garbageTimer);
    clearInterval(vanishingTimer);
    clearInterval(level8CountdownTimer);
    document.getElementById("fogEffect").style.display = "none";
    document.getElementById("windMessage").textContent = "";
    document.getElementById("pause").textContent = "Tạm dừng";
    document.getElementById("start").textContent = "Bắt đầu";
    document.getElementById("restart").disabled = true;
}
function showLevelSelection() {
    stopGameForMenu();
    overlay.style.display = "flex";
    message.textContent = "CHỌN CẤP ĐỘ";
    levelIntro.hidden = true;
    levelChoices.style.display = "grid";
    message.classList.remove("win-message");
    document.getElementById("next").hidden = true;
    document.getElementById("replay").hidden = true;
    document.getElementById("choose").hidden = true;
    document.getElementById("level8TimeBox").hidden = true;
}
function showLevelIntro(selectedLevel, resetScore = false) {
    stopGameForMenu();
    pendingLevel = selectedLevel;
    pendingResetScore = resetScore;
    message.textContent = `CẤP ĐỘ ${selectedLevel}: ${levelInfo[selectedLevel].name}`;
    message.classList.remove("win-message");
    levelDescription.textContent = levelInfo[selectedLevel].description;
    levelIntro.hidden = false;
    levelChoices.style.display = "none";
    document.getElementById("next").hidden = true;
    document.getElementById("replay").hidden = true;
    document.getElementById("choose").hidden = false;
    document.getElementById("level8TimeBox").hidden = true;
    overlay.style.display = "flex";
}
function startGame(selectedLevel, resetScore = false) {
    stopFrozenTimer();
    clearInterval(timer);
    clearInterval(windTimer);
    clearInterval(garbageTimer);
    clearInterval(vanishingTimer);
    clearInterval(level8CountdownTimer);
    stopPortalTimer();
    if (resetScore) score = 0;
    level = selectedLevel;
    lines = 0;
    nextBlockId = 0;
    running = true;
    paused = false;
    pauseStartedAt = 0;
    document.getElementById("restart").disabled = false;
    document.getElementById("start").textContent = "Chọn cấp độ";
    document.getElementById("pause").textContent = "Tạm dừng";
    scoreText.textContent = score;
    levelText.textContent = level;
    linesText.textContent = lines;
    overlay.style.display = "none";
    levelIntro.hidden = true;
    initGame();
    initObstacles();
    initPiece();
    render();
    if (running) {
        startTimer();
        startWind();
        startFog();
        startGarbageTimer();
        startVanishingTimer();
        startLevel8Countdown();
        startFrozenTimer();
        startPortalTimer();
    }
}
function applyVanishingGravity() {
    if (level !== 8) return;
    const activeCells = new Set(piece.map(cell => `${cell.x},${cell.y}`));
    let moved;
    do {
        moved = false;
        const groups = new Map();
        for (let y = row - 1; y >= 0; y--) {
            for (let x = 0; x < col; x++) {
                const block = board[y][x];
                if (!block || typeof block !== "object") continue;
                if (!groups.has(block.groupId)) {
                    groups.set(block.groupId, []);
                }
                groups.get(block.groupId).push({ x, y, block });
            }
        }
        for (const cells of groups.values()) {
            const id = cells[0].block.groupId;
            const canFall = cells.every(({ x, y }) => {
                if (y + 1 >= row || activeCells.has(`${x},${y + 1}`)) {
                    return false;
                }
                const below = board[y + 1][x];
                return below === "" || below?.groupId === id;
            });
            if (!canFall) continue;
            for (const cell of cells) {
                board[cell.y][cell.x] = "";
            }
            for (const cell of cells) {
                board[cell.y + 1][cell.x] = cell.block;
            }
            moved = true;
        }
    } while (moved);
}
function startVanishingTimer() {
    clearInterval(vanishingTimer);
    if (level !== 8) return;
    vanishingTimer = setInterval(() => {
        if (!running || paused) return;
        const now = Date.now();
        let hasVanished = false;
        for (let y = 0; y < row; y++) {
            for (let x = 0; x < col; x++) {
                const block = board[y][x];
                if (block && typeof block === "object" &&
                    now - block.createdAt >= VANISH_TIME) {
                    board[y][x] = "";
                    hasVanished = true;
                }
            }
        }
        if (hasVanished) {
            applyVanishingGravity();
            clearLines();
        }
        if (running) {
            render();
        }
    }, 200);
}
function completeLevel() {
    running = false;
    stopFrozenTimer();
    stopPortalTimer();
    clearInterval(timer);
    clearInterval(windTimer);
    clearInterval(fogTimer);
    clearTimeout(fogHideTimer);
    clearInterval(garbageTimer);
    clearInterval(vanishingTimer);
    clearInterval(level8CountdownTimer);
    document.getElementById("fogEffect").style.display = "none";
    overlay.style.display = "flex";
    levelChoices.style.display = "none";
    message.textContent = "BẠN ĐÃ THẮNG CẤP ĐỘ " + level + "!";
    message.classList.add("win-message");
    document.getElementById("restart").disabled = true;
    document.getElementById("next").hidden = level >= 8;
    document.getElementById("replay").hidden = false;
    document.getElementById("choose").hidden = false;
    document.getElementById("next").textContent = "Cấp độ tiếp theo";
    document.getElementById("replay").textContent = "Chơi lại cấp độ này";
    document.getElementById("choose").textContent = "Chọn cấp độ";
}
function endGame() {
    running = false;
    stopFrozenTimer();
    stopPortalTimer();
    clearInterval(timer);
    clearInterval(windTimer);
    clearInterval(fogTimer);
    clearTimeout(fogHideTimer);
    clearInterval(garbageTimer);
    clearInterval(vanishingTimer);
    clearInterval(level8CountdownTimer);
    document.getElementById("fogEffect").style.display = "none";
    document.getElementById("restart").disabled = true;
    message.classList.remove("win-message");
    overlay.style.display = "flex";
    levelChoices.style.display = "none";
    message.textContent = "GAME OVER";
    document.getElementById("next").hidden = true;
    document.getElementById("replay").hidden = false;
    document.getElementById("choose").hidden = false;
}
for (let i = 1; i <= 8; i++) {
    const button = document.createElement("button");
    button.textContent = i;
    button.addEventListener("click", () => {
        showLevelIntro(i, true);
    });
    levelChoices.appendChild(button);
}
document.getElementById("start").addEventListener("click", showLevelSelection);
document.getElementById("playLevel").addEventListener("click", () => {
    startGame(pendingLevel, pendingResetScore);
});
document.getElementById("start").addEventListener("click", () => {
    overlay.style.display = "flex";
    levelChoices.style.display = "grid";
    message.textContent = "CHỌN CẤP ĐỘ";
    document.getElementById("next").hidden = true;
    document.getElementById("replay").hidden = true;
    document.getElementById("choose").hidden = true;
});
document.getElementById("pause").addEventListener("click", () => {
    if (!running) return;
    paused = !paused;
    if (level === 8) {
        if (paused) {
            pauseStartedAt = Date.now();
        } else {
            const pauseDuration = Date.now() - pauseStartedAt;
            level8EndTime += pauseDuration;
            for (const cells of board) {
                for (const block of cells) {
                    if (block && typeof block === "object") {
                        block.createdAt += pauseDuration;
                    }
                }
            }
            updateLevel8Countdown();
            render();
        }
    }
    document.getElementById("pause").textContent =
        paused ? "Tiếp tục" : "Tạm dừng";
});
document.getElementById("restart").addEventListener("click", () => {
    if (!running || paused) return;
    startGame(level, true);
});
document.getElementById("replay").addEventListener("click", () => {
    showLevelIntro(level);
});
document.getElementById("next").addEventListener("click", () => {
    if (level < 8) {
        showLevelIntro(level + 1);
    }
});
document.getElementById("choose").addEventListener("click", showLevelSelection);
document.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
    }
    if (event.key === "ArrowLeft") move(-1, 0);
    if (event.key === "ArrowRight") move(1, 0);
    if (event.key === "ArrowDown") move(0, 1);
    if (event.key === "ArrowUp") rotate();
});
initGame();
showLevelSelection();