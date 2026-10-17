const col = 10;
const row = 20;
const game = document.getElementById("game");
const scoreText = document.getElementById("score");
const levelText = document.getElementById("level");
const linesText = document.getElementById("lines");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const levelChoices = document.getElementById("levelChoices");
const LEVEL6_DURATION = 180000;
let level6CountdownTimer = null;
let level6EndTime = 0;
let obstacles = [];
let board = [];
let piece = [];
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
    if (level !== 2) return;
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
                    if (level === 6 &&
                        Date.now() - block.createdAt >= VANISH_TIME - 5000) {
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
            const td = document.getElementById(
                "cell_" + cell.y + "_" + cell.x
            );
            td.classList.add(shapes[shapeIndex].name);
        }
    }
    for (const obstacle of obstacles) {
        const td = document.getElementById(
            "cell_" + obstacle.y + "_" + obstacle.x
        );
        td.classList.add("obstacle");
        td.textContent = "";
    }
}
function canMove(dx, dy, newPiece = piece) {
    return newPiece.every(cell => {
        const x = cell.x + dx;
        const y = cell.y + dy;
        return x >= 0 && x < col &&
            y >= 0 && y < row &&
            !board[y][x] &&
            !obstacles.some(o => o.x === x && o.y === y);
    });
}
function move(dx, dy) {
    if (!running || paused) return;
    if (canMove(dx, dy)) {
        piece = piece.map(cell => ({
            x: cell.x + dx,
            y: cell.y + dy
        }));
        render();
    } else if (dy === 1) {
        lockPiece();
    }
}
function lockPiece() {
    const now = Date.now();
    for (const cell of piece) {
        if (cell.y < 0) {
            endGame();
            return;
        }
        if (level === 6) {
            board[cell.y][cell.x] = {
                type: shapes[shapeIndex].name,
                createdAt: now
            };
        } else {
            board[cell.y][cell.x] = shapes[shapeIndex].name;
        }
    }
    clearLines();
    if (!running) return;
    initPiece();
    if (running) {
        render();
    }
}
function addGarbageRow() {
    if (!running || paused || level !== 5) return;
    if (board[0].some(cell => cell !== "")) {
        endGame();
        return;
    }
    board.shift();
    const garbageRow = Array(col).fill("#");
    const hole = Math.floor(Math.random() * col);
    garbageRow[hole] = "";
    board.push(garbageRow);
    if (!canMove(0, 0, piece)) {
        endGame();
        return;
    }
    render();
}
function clearLines() {
    let cleared = 0;
    for (let y = row - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== "")) {
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
    const rotated = piece.map(cell => ({
        x: minX + (cell.y - minY),
        y: minY + (minX + 2 - cell.x)
    }));
    if (canMove(0, 0, rotated)) {
        piece = rotated;
        rotation++;
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
    if (level === 3) {
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
    if (level === 5) {
        garbageTimer = setInterval(() => {
            if (running && !paused) {
                addGarbageRow();
            }
        }, 30000);
    }
}
function updateLevel6Countdown() {
    if (!running || paused || level !== 6) return;
    const timeLeft = Math.max(0, level6EndTime - Date.now());
    const seconds = Math.ceil(timeLeft / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    document.getElementById("level6Time").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(remainingSeconds).padStart(2, "0");
    if (timeLeft <= 0) {
        if (lines >= 10) {
            completeLevel();
        } else {
            endGame();
            message.textContent = "HẾT 3 PHÚT! BẠN ĐÃ THUA!";
        }
    }
}
function startLevel6Countdown() {
    clearInterval(level6CountdownTimer);
    document.getElementById("level6TimeBox").hidden = level !== 6;
    if (level !== 6) return;
    level6EndTime = Date.now() + LEVEL6_DURATION;
    updateLevel6Countdown();
    level6CountdownTimer = setInterval(() => {
        updateLevel6Countdown();
    }, 200);
}
function startGame(selectedLevel, resetScore = false) {
    clearInterval(timer);
    clearInterval(windTimer);
    clearInterval(garbageTimer);
    clearInterval(vanishingTimer);
    clearInterval(level6CountdownTimer);
    if (resetScore) score = 0;
    level = selectedLevel;
    lines = 0;
    running = true;
    paused = false;
    pauseStartedAt = 0;
    document.getElementById("pause").textContent = "Tạm dừng";
    scoreText.textContent = score;
    levelText.textContent = level;
    linesText.textContent = lines;
    overlay.style.display = "none";
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
        startLevel6Countdown();
    }
}
function applyVanishingGravity() {
    if (level !== 6) return;
    const activeCells = new Set(
        piece.map(cell => `${cell.y},${cell.x}`)
    );
    for (let x = 0; x < col; x++) {
        let targetY = row - 1;
        for (let y = row - 1; y >= 0; y--) {
            if (activeCells.has(`${y},${x}`)) {
                targetY = y - 1;
                continue;
            }
            const block = board[y][x];
            if (block === "") continue;
            if (targetY !== y) {
                board[targetY][x] = block;
                board[y][x] = "";
            }
            targetY--;
        }
    }
}
function startVanishingTimer() {
    clearInterval(vanishingTimer);
    if (level !== 6) return;
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
    clearInterval(timer);
    clearInterval(windTimer);
    clearInterval(fogTimer);
    clearTimeout(fogHideTimer);
    clearInterval(garbageTimer);
    clearInterval(vanishingTimer);
    clearInterval(level6CountdownTimer);
    document.getElementById("fogEffect").style.display = "none";
    overlay.style.display = "flex";
    levelChoices.style.display = "none";
    message.textContent = "BẠN ĐÃ THẮNG MÀN " + level + "!";
    document.getElementById("next").hidden = level >= 10;
    document.getElementById("replay").hidden = false;
    document.getElementById("choose").hidden = false;
    document.getElementById("next").textContent = "Màn tiếp theo";
    document.getElementById("replay").textContent = "Chơi lại màn này";
    document.getElementById("choose").textContent = "Chọn màn";
}
function endGame() {
    running = false;
    clearInterval(timer);
    clearInterval(windTimer);
    clearInterval(fogTimer);
    clearTimeout(fogHideTimer);
    clearInterval(garbageTimer);
    clearInterval(vanishingTimer);
    clearInterval(level6CountdownTimer);
    document.getElementById("fogEffect").style.display = "none";
    overlay.style.display = "flex";
    levelChoices.style.display = "none";
    message.textContent = "GAME OVER";
    document.getElementById("next").hidden = true;
    document.getElementById("replay").hidden = false;
    document.getElementById("choose").hidden = false;
}
for (let i = 1; i <= 10; i++) {
    const button = document.createElement("button");
    button.textContent = i;
    button.addEventListener("click", () => {
        startGame(i, true);
    });
    levelChoices.appendChild(button);
}
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
    if (level === 6) {
        if (paused) {
            pauseStartedAt = Date.now();
        } else {
            const pauseDuration = Date.now() - pauseStartedAt;
            level6EndTime += pauseDuration;
            for (const cells of board) {
                for (const block of cells) {
                    if (block && typeof block === "object") {
                        block.createdAt += pauseDuration;
                    }
                }
            }
            updateLevel6Countdown();
            render();
        }
    }
    document.getElementById("pause").textContent =
        paused ? "Tiếp tục" : "Tạm dừng";
});
document.getElementById("replay").addEventListener("click", () => {
    startGame(level);
});
document.getElementById("next").addEventListener("click", () => {
    if (level < 10) {
        startGame(level + 1);
    }
});
document.getElementById("choose").addEventListener("click", () => {
    running = false;
    clearInterval(timer);
    overlay.style.display = "flex";
    levelChoices.style.display = "grid";
    message.textContent = "CHỌN CẤP ĐỘ";
    document.getElementById("next").hidden = true;
    document.getElementById("replay").hidden = true;
    document.getElementById("choose").hidden = true;
});
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
overlay.style.display = "flex";
levelChoices.style.display = "grid";
message.textContent = "CHỌN CẤP ĐỘ";
document.getElementById("next").hidden = true;
document.getElementById("replay").hidden = true;
document.getElementById("choose").hidden = true;