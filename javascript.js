const col = 10;
const row = 20;
const game = document.getElementById("game");
const scoreText = document.getElementById("score");
const levelText = document.getElementById("level");
const linesText = document.getElementById("lines");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const levelChoices = document.getElementById("levelChoices");
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
            if (board[y][x] !== "") {
                td.classList.add(board[y][x]);
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
    for (const cell of piece) {
        if (cell.y < 0) {
            endGame();
            return;
        }
        board[cell.y][cell.x] = shapes[shapeIndex].name;
    }
    clearLines();
    if (!running) return;
    initPiece();
    if (running) {
        render();
    }
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
function startGame(selectedLevel, resetScore = false) {
    clearInterval(timer);
    clearInterval(windTimer);
    if (resetScore) score = 0;
    level = selectedLevel;
    lines = 0;
    running = true;
    paused = false;
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
    }
}
function completeLevel() {
    running = false;
    clearInterval(timer);
    clearInterval(windTimer);
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