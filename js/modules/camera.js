// TagiFLY Professional Camera System
// Handles zoom, pan, and viewport transformations

export class Camera {
    constructor() {
        // Camera position in world space
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        
        // Viewport dimensions
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        
        // Zoom constraints
        this.minScale = 0.05;
        this.maxScale = 20;
        this.zoomStep = 1.12;
        
        // Smooth transitions
        this.smoothTransitionMs = 200;
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.transitionStart = { x: 0, y: 0, scale: 1 };
        this.transitionTarget = { x: 0, y: 0, scale: 1 };
        
        // Image reference
        this.image = null;
        this.imageWidth = 0;
        this.imageHeight = 0;
        
        // Focus on pointer
        this.focusOnPointer = true;
    }
    
    // ========== VIEWPORT MANAGEMENT ==========
    setViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }
    
    setImage(image) {
        this.image = image;
        if (image) {
            this.imageWidth = image.naturalWidth;
            this.imageHeight = image.naturalHeight;
        }
    }
    
    // ========== ZOOM SYSTEM ==========
    zoomIn() {
        const newScale = Math.min(this.scale * this.zoomStep, this.maxScale);
        this.setScale(newScale);
    }
    
    zoomOut() {
        const newScale = Math.max(this.scale / this.zoomStep, this.minScale);
        this.setScale(newScale);
    }
    
    setScale(newScale) {
        const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        
        if (this.focusOnPointer) {
            // Zoom around viewport center
            const centerX = this.viewportWidth / 2;
            const centerY = this.viewportHeight / 2;
            this.zoomAroundPoint(centerX, centerY, clampedScale);
        } else {
            this.scale = clampedScale;
        }
    }
    
    zoomAroundPoint(screenX, screenY, newScale) {
        // Convert screen point to world coordinates
        const worldX = (screenX - this.viewportWidth / 2) / this.scale + this.x;
        const worldY = (screenY - this.viewportHeight / 2) / this.scale + this.y;
        
        // Update scale
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        
        // Adjust camera position to keep the point under the cursor
        this.x = worldX - (screenX - this.viewportWidth / 2) / this.scale;
        this.y = worldY - (screenY - this.viewportHeight / 2) / this.scale;
    }
    
    // ========== PAN SYSTEM ==========
    pan(deltaX, deltaY) {
        this.x -= deltaX / this.scale;
        this.y -= deltaY / this.scale;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    // ========== FIT TO VIEWPORT ==========
    fitToViewport() {
        if (!this.image) return;
        
        const padding = 40;
        const maxWidth = this.viewportWidth - padding;
        const maxHeight = this.viewportHeight - padding;
        
        const scaleX = maxWidth / this.imageWidth;
        const scaleY = maxHeight / this.imageHeight;
        const fitScale = Math.min(scaleX, scaleY, 1);
        
        // Center the image
        this.scale = fitScale;
        this.x = this.imageWidth / 2;
        this.y = this.imageHeight / 2;
    }
    
    // ========== ACTUAL SIZE ==========
    actualSize() {
        this.scale = 1;
        this.x = this.imageWidth / 2;
        this.y = this.imageHeight / 2;
    }
    
    // ========== SMOOTH TRANSITIONS ==========
    startSmoothTransition(targetX, targetY, targetScale) {
        this.isTransitioning = true;
        this.transitionStartTime = Date.now();
        this.transitionStart = { x: this.x, y: this.y, scale: this.scale };
        this.transitionTarget = { x: targetX, y: targetY, scale: targetScale };
    }
    
    updateSmoothTransition() {
        if (!this.isTransitioning) return;
        
        const elapsed = Date.now() - this.transitionStartTime;
        const progress = Math.min(elapsed / this.smoothTransitionMs, 1);
        
        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate values
        this.x = this.transitionStart.x + (this.transitionTarget.x - this.transitionStart.x) * easeProgress;
        this.y = this.transitionStart.y + (this.transitionTarget.y - this.transitionStart.y) * easeProgress;
        this.scale = this.transitionStart.scale + (this.transitionTarget.scale - this.transitionStart.scale) * easeProgress;
        
        // Check if transition is complete
        if (progress >= 1) {
            this.isTransitioning = false;
        }
    }
    
    // ========== WORLD TO SCREEN TRANSFORMATION ==========
    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.x) * this.scale + this.viewportWidth / 2;
        const screenY = (worldY - this.y) * this.scale + this.viewportHeight / 2;
        return { x: screenX, y: screenY };
    }
    
    screenToWorld(screenX, screenY) {
        const worldX = (screenX - this.viewportWidth / 2) / this.scale + this.x;
        const worldY = (screenY - this.viewportHeight / 2) / this.scale + this.y;
        return { x: worldX, y: worldY };
    }
    
    // ========== BOUNDARY CHECKING ==========
    getImageBounds() {
        if (!this.image) return null;
        
        const topLeft = this.worldToScreen(0, 0);
        const bottomRight = this.worldToScreen(this.imageWidth, this.imageHeight);
        
        return {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        };
    }
    
    // ========== UTILITY METHODS ==========
    getZoomPercentage() {
        return Math.round(this.scale * 100);
    }
    
    isAtMinZoom() {
        return this.scale <= this.minScale;
    }
    
    isAtMaxZoom() {
        return this.scale >= this.maxScale;
    }
    
    // ========== UPDATE LOOP ==========
    update() {
        this.updateSmoothTransition();
    }
}
