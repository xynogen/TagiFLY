// TagiFLY Professional Renderer Module
// Provides draw(objects, camera) and requestFrame() methods. Stateless between frames.

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.viewport = { width: 0, height: 0 };
        this.camera = null;
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        // High DPI support
        const rect = this.canvas.getBoundingClientRect();
        this.viewport.width = rect.width;
        this.viewport.height = rect.height;
        
        this.canvas.width = this.viewport.width * this.devicePixelRatio;
        this.canvas.height = this.viewport.height * this.devicePixelRatio;
        
        this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    // ========== CAMERA SYSTEM ==========
    setCamera(camera) {
        this.camera = camera;
    }
    
    // ========== WORLD TO SCREEN TRANSFORMATION ==========
    worldToScreen(worldX, worldY) {
        if (!this.camera) return { x: worldX, y: worldY };
        
        // Apply camera transformation
        const screenX = (worldX - this.camera.x) * this.camera.scale + this.viewport.width / 2;
        const screenY = (worldY - this.camera.y) * this.camera.scale + this.viewport.height / 2;
        
        return { x: screenX, y: screenY };
    }
    
    screenToWorld(screenX, screenY) {
        if (!this.camera) return { x: screenX, y: screenY };
        
        // Reverse camera transformation
        const worldX = (screenX - this.viewport.width / 2) / this.camera.scale + this.camera.x;
        const worldY = (screenY - this.viewport.height / 2) / this.camera.scale + this.camera.y;
        
        return { x: worldX, y: worldY };
    }
    
    // ========== DRAWING METHODS ==========
    draw(objects, camera) {
        this.setCamera(camera);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw objects
        objects.forEach(obj => {
            this.drawObject(obj);
        });
    }
    
    drawBackground() {
        // Draw image if available
        if (this.camera && this.camera.image) {
            this.drawImage(this.camera.image);
        }
    }
    
    drawImage(image) {
        if (!image || !this.camera) return;
        
        const screenPos = this.worldToScreen(0, 0);
        const screenSize = {
            width: image.naturalWidth * this.camera.scale,
            height: image.naturalHeight * this.camera.scale
        };
        
        this.ctx.drawImage(image, screenPos.x, screenPos.y, screenSize.width, screenSize.height);
    }
    
    drawObject(obj) {
        if (!obj || !this.camera) return;
        
        switch (obj.type) {
            case 'bbox':
                this.drawBoundingBox(obj);
                break;
            case 'polygon':
                this.drawPolygon(obj);
                break;
            case 'point':
                this.drawPoint(obj);
                break;
            case 'polyline':
                this.drawPolyline(obj);
                break;
        }
    }
    
    drawBoundingBox(bbox) {
        const screenPos = this.worldToScreen(bbox.x, bbox.y);
        const screenSize = {
            width: bbox.width * this.camera.scale,
            height: bbox.height * this.camera.scale
        };
        
        this.ctx.save();
        this.ctx.strokeStyle = bbox.style.strokeColor || '#007AFF';
        this.ctx.lineWidth = bbox.style.strokeWidth || 2;
        this.ctx.setLineDash(bbox.style.strokeDash === 'dashed' ? [5, 5] : []);
        
        this.ctx.strokeRect(screenPos.x, screenPos.y, screenSize.width, screenSize.height);
        
        // Draw handles if selected
        if (bbox.selected) {
            this.drawResizeHandles(screenPos, screenSize);
        }
        
        this.ctx.restore();
    }
    
    drawPolygon(polygon) {
        if (!polygon.points || polygon.points.length < 2) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = polygon.style.strokeColor || '#007AFF';
        this.ctx.lineWidth = polygon.style.strokeWidth || 2;
        this.ctx.setLineDash(polygon.style.strokeDash === 'dashed' ? [5, 5] : []);
        
        this.ctx.beginPath();
        const firstPoint = this.worldToScreen(polygon.points[0].x, polygon.points[0].y);
        this.ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < polygon.points.length; i++) {
            const point = this.worldToScreen(polygon.points[i].x, polygon.points[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw handles if selected
        if (polygon.selected) {
            this.drawPolygonHandles(polygon.points);
        }
        
        this.ctx.restore();
    }
    
    drawPoint(point) {
        const screenPos = this.worldToScreen(point.x, point.y);
        
        this.ctx.save();
        this.ctx.fillStyle = point.style.fillColor || '#007AFF';
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    drawPolyline(polyline) {
        if (!polyline.points || polyline.points.length < 2) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = polyline.style.strokeColor || '#007AFF';
        this.ctx.lineWidth = polyline.style.strokeWidth || 2;
        this.ctx.setLineDash(polyline.style.strokeDash === 'dashed' ? [5, 5] : []);
        
        this.ctx.beginPath();
        const firstPoint = this.worldToScreen(polyline.points[0].x, polyline.points[0].y);
        this.ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < polyline.points.length; i++) {
            const point = this.worldToScreen(polyline.points[i].x, polyline.points[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    drawResizeHandles(screenPos, screenSize) {
        const handleSize = 8;
        const handles = [
            { x: screenPos.x - handleSize/2, y: screenPos.y - handleSize/2 }, // nw
            { x: screenPos.x + screenSize.width/2 - handleSize/2, y: screenPos.y - handleSize/2 }, // n
            { x: screenPos.x + screenSize.width - handleSize/2, y: screenPos.y - handleSize/2 }, // ne
            { x: screenPos.x + screenSize.width - handleSize/2, y: screenPos.y + screenSize.height/2 - handleSize/2 }, // e
            { x: screenPos.x + screenSize.width - handleSize/2, y: screenPos.y + screenSize.height - handleSize/2 }, // se
            { x: screenPos.x + screenSize.width/2 - handleSize/2, y: screenPos.y + screenSize.height - handleSize/2 }, // s
            { x: screenPos.x - handleSize/2, y: screenPos.y + screenSize.height - handleSize/2 }, // sw
            { x: screenPos.x - handleSize/2, y: screenPos.y + screenSize.height/2 - handleSize/2 } // w
        ];
        
        this.ctx.save();
        this.ctx.fillStyle = '#007AFF';
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        
        handles.forEach(handle => {
            this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            this.ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        });
        
        this.ctx.restore();
    }
    
    drawPolygonHandles(points) {
        const handleSize = 8;
        
        this.ctx.save();
        this.ctx.fillStyle = '#007AFF';
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        
        points.forEach(point => {
            const screenPos = this.worldToScreen(point.x, point.y);
            this.ctx.fillRect(screenPos.x - handleSize/2, screenPos.y - handleSize/2, handleSize, handleSize);
            this.ctx.strokeRect(screenPos.x - handleSize/2, screenPos.y - handleSize/2, handleSize, handleSize);
        });
        
        this.ctx.restore();
    }
    
    // ========== HIT TESTING ==========
    hitTest(screenX, screenY) {
        // Convert screen coordinates to world coordinates
        const worldPos = this.screenToWorld(screenX, screenY);
        
        // Return hit test result
        return {
            worldX: worldPos.x,
            worldY: worldPos.y,
            screenX: screenX,
            screenY: screenY
        };
    }
    
    // ========== FRAME REQUEST ==========
    requestFrame() {
        // Request animation frame for smooth rendering
        return new Promise(resolve => {
            requestAnimationFrame(resolve);
        });
    }
}
