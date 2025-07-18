// Configuration globale
const config = {
    canvasId: 'draw-box',
    brushIds: ['brush-size-1', 'brush-size-2', 'brush-size-3', 'brush-size-4'],
    brushSizes: [2, 5, 25, 50],
    colorButtonClass: 'color-brush',
    undoButtonId: 'undo-btn',
    redoButtonId: 'redo-btn',
    clearButtonId: 'cancel-btn',
    saveButtonId: 'save-btn',
    clearColor: '#f3e779'
};

// Initialisation
const canvas = document.getElementById(config.canvasId);
const ctx = canvas.getContext('2d');
let drawing = false;
let currentColor = '#000000';
let currentBrushSize = config.brushSizes[0];

let history = [];
let redoStack = [];
let lastPos = null;
let moved = false;

// Utilise les dimensions CSS réelles du canvas
function initCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = config.clearColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateUndoRedoButtons();
}
initCanvas();

// Utils
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    let touch = e.touches?.[0] || e.changedTouches?.[0] || e;
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

// Fonctions

let color_indicator = document.getElementById("selected-brush");
color_indicator.addEventListener("click", () => {
    let brush_selectors = document.querySelectorAll("#color-palette span.color-brush");
    brush_selectors.forEach(brush => {
        if (brush.getAttribute("visible") === "false") {
            document.querySelector("#color-palette").setAttribute("visible", "true");
            brush.setAttribute("visible", "true");
            canvas.setAttribute("palette-open", "true");
        } else {
            document.querySelector("#color-palette").setAttribute("visible", "false");
            brush.setAttribute("visible", "false");
            canvas.setAttribute("palette-open", "false");
        }
    });
});

const brush_selectors = document.querySelectorAll("#color-palette span.color-brush,#eraser-brush");
brush_selectors.forEach(brush => {
    brush.addEventListener("click", () => {
        brush_selectors.forEach((el) => { el.removeAttribute("selected"); });
        brush.setAttribute("selected", "");
        color = brush.getAttribute("color");
        color_indicator.style.backgroundColor = color;
        color_indicator.setAttribute("rnb", "false");
        brush_selectors.forEach(_ => {
            _.setAttribute("visible", "false");
        });
        canvas.setAttribute("palette-open", "false");
        document.querySelector("#color-palette").setAttribute("visible", "false");
        if (color === "eraser") {
            currentColor = config.clearColor;
        } else {
            currentColor = color;
        }
    });
});

function updateUndoRedoButtons() {
    const undoButton = document.getElementById(config.undoButtonId);
    const redoButton = document.getElementById(config.redoButtonId);

    // Désactiver ou activer le bouton Undo
    if (history.length === 0) {
        undoButton.classList.add('inactive-btn');
    } else {
        undoButton.classList.remove('inactive-btn');
    }

    // Désactiver ou activer le bouton Redo
    if (redoStack.length === 0) {
        redoButton.classList.add('inactive-btn');
    } else {
        redoButton.classList.remove('inactive-btn');
    }
}

function save(e) {
    let dataURL = canvas.toDataURL();
    let form = document.getElementById("form-post-notes");
    let data_input = document.getElementById("data-img");
    e.preventDefault();
    let transition_bg = document.getElementById("transition-bg");
    transition_bg.setAttribute("active-bg0", "true");
    data_input.value = dataURL;
    form.submit();
}

function saveState() {
    history.push(canvas.toDataURL());
    if (history.length > 50) history.shift(); // limite mémoire
    redoStack = [];
    updateUndoRedoButtons();
}

function restoreState(stateURL) {
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = stateURL;
    updateUndoRedoButtons();
}

function undo() {
    updateUndoRedoButtons();
    if (history.length === 0) return;
    const last = history.pop();
    redoStack.push(canvas.toDataURL());
    restoreState(last);
}

function redo() {
    updateUndoRedoButtons();
    if (redoStack.length === 0) return;
    const redoState = redoStack.pop();
    history.push(canvas.toDataURL());
    restoreState(redoState);
}

function clearCanvas() {
    saveState();
    ctx.fillStyle = config.clearColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startDrawing(e) {
    drawing = true;
    lastPos = getCanvasPos(e);
    moved = false;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
    saveState();
}

function stopDrawing() {
    if (!moved && lastPos) {
        ctx.beginPath();
        ctx.arc(lastPos.x, lastPos.y, currentBrushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.fill();
    }
    drawing = false;
    lastPos = null;
}

// Événements Canvas
canvas.addEventListener('mousedown', (e) => startDrawing(e));
canvas.addEventListener('touchstart', (e) => startDrawing(e), { passive: false });

canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
});
canvas.addEventListener('touchmove', (e) => {
    if (!drawing) return;
    const pos = getCanvasPos(e);

    const dx = pos.x - lastPos.x;
    const dy = pos.y - lastPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const steps = Math.floor(distance / 1); // Plus petit pour fluidité (touchmove)

    for (let i = 0; i < steps; i++) {
        const x = lastPos.x + (dx * i) / steps;
        const y = lastPos.y + (dy * i) / steps;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos = pos;

    if (e.cancelable) e.preventDefault();
}, { passive: false });

canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('touchend', stopDrawing, { passive: false });
canvas.addEventListener('mouseleave', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing, { passive: false });

// Gestion des brush
config.brushIds.forEach((id, index) => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', () => {
            config.brushIds.forEach((id, index) => {
                document.getElementById(id).removeAttribute("selected");
            });
            currentBrushSize = config.brushSizes[index];
            btn.setAttribute("selected", "");
        });
    }
});

// Boutons undo/redo/clear
document.getElementById(config.undoButtonId)?.addEventListener('click', undo);
document.getElementById(config.redoButtonId)?.addEventListener('click', redo);
document.getElementById(config.clearButtonId)?.addEventListener('click', clearCanvas);
document.getElementById(config.saveButtonId)?.addEventListener('click', save);

// Resize & redraw on resize (optionnel)
window.addEventListener('resize', () => {
    // Recalculer la taille du canvas au redimensionnement
    initCanvas();
});