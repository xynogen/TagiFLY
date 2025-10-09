// TagiFLY Professional Interaction Module
// Receives pointer/touch/keyboard events, performs hit-testing and issues commands

export class InteractionManager {
    constructor(renderer, annotationsStore, camera) {
        this.renderer = renderer;
        this.annotationsStore = annotationsStore;
        this.camera = camera;
        
        // Current tool
        this.currentTool = 'select';
        this.tools = {
            select: new SelectTool(this),
            boundingbox: new BoundingBoxTool(this),
            polygon: new PolygonTool(this),
            point: new PointTool(this),
            polyline: new PolylineTool(this)
        };
        
        // Interaction state
        this.isDrawing = false;
        this.isPanning = false;
        this.isResizing = false;
        this.isDragging = false;
        
        // Mouse state
        this.mousePos = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };
        this.dragStartPos = { x: 0, y: 0 };
        
        // Selection state
        this.selectedAnnotations = new Set();
        this.hoveredAnnotation = null;
        
        // Event listeners
        this.setupEventListeners();
    }
    
    // ========== EVENT LISTENERS ==========
    setupEventListeners() {
        const canvas = this.renderer.canvas;
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    // ========== TOOL MANAGEMENT ==========
    selectTool(toolName) {
        if (this.tools[toolName]) {
            this.currentTool = toolName;
            console.log(`🔧 Tool selected: ${toolName}`);
        }
    }
    
    getCurrentTool() {
        return this.tools[this.currentTool];
    }
    
    // ========== MOUSE EVENTS ==========
    handleMouseDown(e) {
        e.preventDefault();
        
        const rect = this.renderer.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.dragStartPos = { ...this.mousePos };
        this.lastMousePos = { ...this.mousePos };
        
        // Convert to world coordinates
        const worldPos = this.camera.screenToWorld(this.mousePos.x, this.mousePos.y);
        
        // Handle different mouse buttons
        if (e.button === 0) { // Left click
            this.handleLeftClick(worldPos, e);
        } else if (e.button === 1) { // Middle click
            this.handleMiddleClick(worldPos, e);
        } else if (e.button === 2) { // Right click
            this.handleRightClick(worldPos, e);
        }
    }
    
    handleMouseMove(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        this.lastMousePos = { ...this.mousePos };
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        const worldPos = this.camera.screenToWorld(this.mousePos.x, this.mousePos.y);
        
        // Handle different interaction modes
        if (this.isPanning) {
            this.handlePanning();
        } else if (this.isDragging) {
            this.handleDragging(worldPos);
        } else if (this.isResizing) {
            this.handleResizing(worldPos);
        } else if (this.isDrawing) {
            this.handleDrawing(worldPos);
        } else {
            this.handleHovering(worldPos);
        }
    }
    
    handleMouseUp(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        const worldPos = this.camera.screenToWorld(this.mousePos.x, this.mousePos.y);
        
        // End current interaction
        if (this.isPanning) {
            this.endPanning();
        } else if (this.isDragging) {
            this.endDragging(worldPos);
        } else if (this.isResizing) {
            this.endResizing(worldPos);
        } else if (this.isDrawing) {
            this.endDrawing(worldPos);
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.renderer.canvas.getBoundingClientRect();
        const mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Zoom around mouse position
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = this.camera.scale * zoomFactor;
        
        this.camera.zoomAroundPoint(mousePos.x, mousePos.y, newScale);
        
        console.log(`🔍 Wheel zoom: ${zoomFactor > 1 ? 'in' : 'out'} to ${this.camera.getZoomPercentage()}%`);
    }
    
    handleContextMenu(e) {
        e.preventDefault();
        // Context menu handling
    }
    
    // ========== KEYBOARD EVENTS ==========
    handleKeyDown(e) {
        // Tool selection shortcuts
        if (e.key >= '1' && e.key <= '6') {
            const toolIndex = parseInt(e.key) - 1;
            const toolNames = ['select', 'boundingbox', 'polygon', 'point', 'polyline', 'keypoint'];
            if (toolNames[toolIndex]) {
                this.selectTool(toolNames[toolIndex]);
                e.preventDefault();
            }
        }
        
        // Zoom shortcuts
        if (e.key === '+' || e.key === '=') {
            this.camera.zoomIn();
            e.preventDefault();
        } else if (e.key === '-') {
            this.camera.zoomOut();
            e.preventDefault();
        } else if (e.key === '0') {
            this.camera.fitToViewport();
            e.preventDefault();
        }
        
        // Delete selected annotations
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelectedAnnotations();
            e.preventDefault();
        }
        
        // Escape key
        if (e.key === 'Escape') {
            this.cancelCurrentOperation();
            e.preventDefault();
        }
    }
    
    handleKeyUp(e) {
        // Key up handling
    }
    
    // ========== INTERACTION HANDLERS ==========
    handleLeftClick(worldPos, e) {
        const tool = this.getCurrentTool();
        if (tool && tool.onLeftClick) {
            tool.onLeftClick(worldPos, e);
        }
    }
    
    handleMiddleClick(worldPos, e) {
        // Start panning
        this.startPanning();
    }
    
    handleRightClick(worldPos, e) {
        const tool = this.getCurrentTool();
        if (tool && tool.onRightClick) {
            tool.onRightClick(worldPos, e);
        }
    }
    
    handleHovering(worldPos) {
        // Update cursor based on hover state
        this.updateCursor(worldPos);
    }
    
    // ========== PANNING ==========
    startPanning() {
        this.isPanning = true;
        this.renderer.canvas.style.cursor = 'grabbing';
    }
    
    handlePanning() {
        const deltaX = this.mousePos.x - this.lastMousePos.x;
        const deltaY = this.mousePos.y - this.lastMousePos.y;
        
        this.camera.pan(deltaX, deltaY);
    }
    
    endPanning() {
        this.isPanning = false;
        this.renderer.canvas.style.cursor = 'default';
    }
    
    // ========== SELECTION ==========
    selectAnnotation(annotation) {
        this.annotationsStore.select(annotation.id);
        this.selectedAnnotations.add(annotation.id);
    }
    
    deselectAnnotation(annotation) {
        this.annotationsStore.update(annotation.id, { selected: false });
        this.selectedAnnotations.delete(annotation.id);
    }
    
    deselectAll() {
        this.annotationsStore.deselectAll();
        this.selectedAnnotations.clear();
    }
    
    // ========== UTILITY METHODS ==========
    updateCursor(worldPos) {
        // Update cursor based on current state
        if (this.isPanning) {
            this.renderer.canvas.style.cursor = 'grabbing';
        } else if (this.hoveredAnnotation) {
            this.renderer.canvas.style.cursor = 'pointer';
        } else {
            this.renderer.canvas.style.cursor = 'default';
        }
    }
    
    deleteSelectedAnnotations() {
        this.selectedAnnotations.forEach(id => {
            this.annotationsStore.delete(id);
        });
        this.selectedAnnotations.clear();
    }
    
    cancelCurrentOperation() {
        this.isDrawing = false;
        this.isPanning = false;
        this.isResizing = false;
        this.isDragging = false;
        
        const tool = this.getCurrentTool();
        if (tool && tool.cancel) {
            tool.cancel();
        }
    }
}

// ========== TOOL CLASSES ==========
class SelectTool {
    constructor(interaction) {
        this.interaction = interaction;
    }
    
    onLeftClick(worldPos, e) {
        // Hit test for annotations
        const annotations = this.interaction.annotationsStore.getCurrentImageAnnotations();
        const clickedAnnotation = this.hitTestAnnotations(annotations, worldPos);
        
        if (clickedAnnotation) {
            if (e.shiftKey) {
                // Multi-select
                this.interaction.selectAnnotation(clickedAnnotation);
            } else {
                // Single select
                this.interaction.deselectAll();
                this.interaction.selectAnnotation(clickedAnnotation);
            }
        } else {
            // Clicked on empty space
            this.interaction.deselectAll();
        }
    }
    
    hitTestAnnotations(annotations, worldPos) {
        for (const annotation of annotations) {
            if (this.hitTestAnnotation(annotation, worldPos)) {
                return annotation;
            }
        }
        return null;
    }
    
    hitTestAnnotation(annotation, worldPos) {
        switch (annotation.type) {
            case 'bbox':
                return this.hitTestBoundingBox(annotation, worldPos);
            case 'polygon':
                return this.hitTestPolygon(annotation, worldPos);
            case 'point':
                return this.hitTestPoint(annotation, worldPos);
            default:
                return false;
        }
    }
    
    hitTestBoundingBox(annotation, worldPos) {
        const { x, y, width, height } = annotation;
        return worldPos.x >= x && worldPos.x <= x + width &&
               worldPos.y >= y && worldPos.y <= y + height;
    }
    
    hitTestPolygon(annotation, worldPos) {
        // Simple point-in-polygon test
        const points = annotation.points;
        let inside = false;
        
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            if (((points[i].y > worldPos.y) !== (points[j].y > worldPos.y)) &&
                (worldPos.x < (points[j].x - points[i].x) * (worldPos.y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    hitTestPoint(annotation, worldPos) {
        const { x, y } = annotation;
        const distance = Math.sqrt((worldPos.x - x) ** 2 + (worldPos.y - y) ** 2);
        return distance <= 10; // 10 pixel tolerance
    }
}

class BoundingBoxTool {
    constructor(interaction) {
        this.interaction = interaction;
        this.startPos = null;
        this.currentBbox = null;
    }
    
    onLeftClick(worldPos, e) {
        if (!this.interaction.isDrawing) {
            this.startDrawing(worldPos);
        } else {
            this.finishDrawing(worldPos);
        }
    }
    
    startDrawing(worldPos) {
        this.interaction.isDrawing = true;
        this.startPos = worldPos;
        this.currentBbox = {
            x: worldPos.x,
            y: worldPos.y,
            width: 0,
            height: 0
        };
    }
    
    finishDrawing(worldPos) {
        if (this.currentBbox) {
            // Create annotation
            this.interaction.annotationsStore.create({
                type: 'bbox',
                x: Math.min(this.startPos.x, worldPos.x),
                y: Math.min(this.startPos.y, worldPos.y),
                width: Math.abs(worldPos.x - this.startPos.x),
                height: Math.abs(worldPos.y - this.startPos.y),
                label: 'unlabeled'
            });
        }
        
        this.interaction.isDrawing = false;
        this.startPos = null;
        this.currentBbox = null;
    }
    
    cancel() {
        this.interaction.isDrawing = false;
        this.startPos = null;
        this.currentBbox = null;
    }
}

class PolygonTool {
    constructor(interaction) {
        this.interaction = interaction;
        this.points = [];
    }
    
    onLeftClick(worldPos, e) {
        this.points.push(worldPos);
        
        if (this.points.length >= 3) {
            // Check if clicking near first point to close
            const firstPoint = this.points[0];
            const distance = Math.sqrt((worldPos.x - firstPoint.x) ** 2 + (worldPos.y - firstPoint.y) ** 2);
            
            if (distance < 20) {
                this.finishDrawing();
            }
        }
    }
    
    finishDrawing() {
        if (this.points.length >= 3) {
            this.interaction.annotationsStore.create({
                type: 'polygon',
                points: this.points,
                label: 'unlabeled'
            });
        }
        
        this.points = [];
    }
    
    cancel() {
        this.points = [];
    }
}

class PointTool {
    constructor(interaction) {
        this.interaction = interaction;
    }
    
    onLeftClick(worldPos, e) {
        this.interaction.annotationsStore.create({
            type: 'point',
            x: worldPos.x,
            y: worldPos.y,
            label: 'unlabeled'
        });
    }
}

class PolylineTool {
    constructor(interaction) {
        this.interaction = interaction;
        this.points = [];
    }
    
    onLeftClick(worldPos, e) {
        this.points.push(worldPos);
    }
    
    onRightClick(worldPos, e) {
        if (this.points.length >= 2) {
            this.finishDrawing();
        }
    }
    
    finishDrawing() {
        if (this.points.length >= 2) {
            this.interaction.annotationsStore.create({
                type: 'polyline',
                points: this.points,
                label: 'unlabeled'
            });
        }
        
        this.points = [];
    }
    
    cancel() {
        this.points = [];
    }
}

