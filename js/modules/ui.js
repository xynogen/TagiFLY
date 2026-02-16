// TagiFLY UI Management Module
// Event listeners, folder selection, label management, image management

import { CONFIG } from './config.js';
import { NotificationManager } from './notification.js';
const { ipcRenderer } = require('electron');

export class UIManager {
    constructor(app) {
        this.app = app;
    }

    // ========== EVENT LISTENERS SETUP ==========
    setupEventListeners() {
        console.log('🔍 Setting up event listeners...');

        // Folder Selection
        const selectBtn = document.getElementById('selectFolder');
        console.log('🔍 Select button found:', selectBtn);
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                console.log('🔍 Select folder button clicked!');
                this.selectFolder();
            });
            console.log('✅ Select folder event listener added');
        } else {
            console.error('❌ Select folder button not found!');
        }

        // Label Management
        const addBtn = document.getElementById('addLabel');
        const input = document.getElementById('newLabel');

        if (addBtn) addBtn.addEventListener('click', () => this.addLabel());
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addLabel();
            });
        }

        // Label Tabs
        this.setupLabelTabs();

        // Navigation
        const prevBtn = document.getElementById('prevImage');
        const nextBtn = document.getElementById('nextImage');

        if (prevBtn) prevBtn.addEventListener('click', () => this.previousImage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextImage());

        // Annotation Tools
        document.querySelectorAll('.annotation-tool').forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.currentTarget.getAttribute('data-tool');
                this.app.selectTool(tool);
            });
        });

        // Canvas Events - handled in main.js setupCanvasEventListeners()

        // Theme Toggle - handled in initTheme()

        // Keyboard Events - handled in main.js setupKeyboardEventListeners()

        // Grid/List View Toggle
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.toggleImageView(view);
            });
        });

        // Export System
        const exportBtn = document.getElementById('exportData');
        const exportModal = document.getElementById('exportModal');
        const closeModal = document.getElementById('closeModal');
        const cancelExport = document.getElementById('cancelExport');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.app.openExportModal());
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.app.closeExportModal());
        }

        if (cancelExport) {
            cancelExport.addEventListener('click', () => this.app.closeExportModal());
        }

        // Export format selection
        document.querySelectorAll('.export-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const format = e.currentTarget.getAttribute('data-format');
                this.app.exportAnnotations(format);
            });
        });

        // Modal backdrop click to close
        if (exportModal) {
            exportModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    this.app.closeExportModal();
                }
            });
        }

        // Zoom Controls
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const fitToScreenBtn = document.getElementById('fitToScreen');
        const actualSizeBtn = document.getElementById('actualSize');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.app.canvasManager.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.app.canvasManager.zoomOut());
        if (fitToScreenBtn) fitToScreenBtn.addEventListener('click', () => this.app.canvasManager.fitToScreen());
        if (actualSizeBtn) actualSizeBtn.addEventListener('click', () => this.app.canvasManager.actualSize());

        // Mouse wheel zoom
        if (this.app.canvas) {
            this.app.canvas.addEventListener('wheel', (e) => this.app.canvasManager.handleWheelZoom(e));
        }

        // Undo/Redo Controls
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) undoBtn.addEventListener('click', () => this.app.historyManager.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => this.app.historyManager.redo());

        console.log('✅ Event listeners setup complete');
    }

    // ========== IMAGE VIEW MANAGEMENT ==========
    toggleImageView(view) {
        console.log(`🔄 Switching to ${view} view`);

        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === view);
        });

        // Store current view preference
        this.app.currentImageView = view;

        // Force re-render with new view
        this.renderImageList();

        NotificationManager.info(`Switched to ${view} view`);
    }


    // ========== FOLDER SELECTION ==========
    async selectFolder() {
        try {
            console.log('📁 Selecting folder...');
            console.log('📁 ipcRenderer available:', !!ipcRenderer);
            console.log('📁 Calling ipcRenderer.invoke...');
            const result = await ipcRenderer.invoke('select-folder');
            console.log('📁 IPC result:', result);

            if (result) {
                this.app.images = result.imageFiles.map(imagePath => ({
                    path: imagePath,
                    name: imagePath.split('/').pop() || imagePath.split('\\').pop(),
                    url: `file://${imagePath}` // Use file:// prefix like old system
                }));

                this.app.currentImageIndex = 0;
                this.app.annotations = {};

                this.renderImageList();
                this.updateUI();

                if (this.app.images.length > 0) {
                    // Use new professional system
                    this.app.loadImage(this.app.images[0]);
                }

                NotificationManager.success(`${this.app.images.length} images loaded successfully`);
                console.log(`✅ Loaded ${this.app.images.length} images`);
            }
        } catch (error) {
            console.error('❌ Error selecting folder:', error);
            NotificationManager.error('Error loading folder');
        }
    }

    // ========== LABEL MANAGEMENT ==========
    renderLabels() {
        const container = document.getElementById('labelsList');
        if (!container) return;

        container.innerHTML = '';

        if (this.app.labels.length === 0) {
            container.innerHTML = '<div class="empty-state"><p style="font-size: 13px; color: var(--gray-500); text-align: center; padding: 16px 8px;">No labels yet</p></div>';
            return;
        }

        this.app.labels.forEach((label, index) => {
            console.log(`🏷️ Creating label item: ${label}`);

            if (!this.app.labelColors[label]) {
                const colorIndex = Object.keys(this.app.labelColors).length % CONFIG.COLORS.length;
                this.app.labelColors[label] = CONFIG.COLORS[colorIndex];
            }

            const item = document.createElement('div');
            item.className = `label-item ${this.app.selectedLabel === label ? 'selected' : ''}`;

            item.innerHTML = `
                <div class="label-content">
                    <div class="color-indicator" style="background-color: ${this.app.labelColors[label]}"></div>
                    <span class="label-text">${label}</span>
                    <span class="label-shortcut">${index + 1}</span>
                </div>
                <button class="label-delete-btn">×</button>
            `;

            // Add event listeners
            const deleteBtn = item.querySelector('.label-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteLabel(label);
            });

            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('label-delete-btn')) {
                    this.selectLabel(label);
                }
            });

            container.appendChild(item);
        });

        console.log('✅ Labels rendered:', this.app.labels.length);
    }

    selectLabel(label) {
        this.app.selectedLabel = label;
        this.renderLabels();

        // If keypoint tool is active, show preview
        if (this.app.currentTool === 'keypoint') {
            this.app.showKeypointPreview();
        }

        NotificationManager.info(`Selected label: ${label}`);
        console.log(`🏷️ Label selected: ${label}`);
    }

    addLabel() {
        const input = document.getElementById('newLabel');
        if (!input) return;

        const newLabel = input.value.trim();
        if (newLabel && !this.app.labels.includes(newLabel)) {
            this.app.labels.push(newLabel);
            this.renderLabels();
            input.value = '';
            NotificationManager.success(`Label "${newLabel}" added`);
        } else if (this.app.labels.includes(newLabel)) {
            NotificationManager.error('Label already exists');
        }
    }

    deleteLabel(label) {
        const index = this.app.labels.indexOf(label);
        if (index > -1) {
            this.app.labels.splice(index, 1);
            if (this.app.selectedLabel === label) this.app.selectedLabel = null;
            delete this.app.labelColors[label];
            this.renderLabels();
            NotificationManager.success(`Label "${label}" deleted`);
        }
    }

    // ========== IMAGE MANAGEMENT ==========
    renderImageList() {
        const container = document.getElementById('imageListContainer');
        if (!container) {
            console.log('❌ Container not found');
            return;
        }

        console.log(`🔄 RENDERING IMAGE LIST - COMPLETELY REWRITTEN`);
        console.log(`📊 App images:`, this.app.images);
        console.log(`📊 Images length:`, this.app.images ? this.app.images.length : 'undefined');
        console.log(`📊 Current view:`, this.app.currentImageView);
        console.log(`📊 Current image index:`, this.app.currentImageIndex);
        console.log(`📊 Annotations:`, this.app.annotations);

        const startTime = performance.now();

        // NUCLEAR OPTION: COMPLETELY DESTROY AND RECREATE
        container.innerHTML = '';
        container.removeAttribute('class');
        container.removeAttribute('style');

        // Check if we have images
        if (!this.app.images || this.app.images.length === 0) {
            console.log('📁 No images, showing empty state');
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <p>Select a folder to begin</p>
                </div>
            `;
            return;
        }

        // Set container class
        container.className = `image-list-container ${this.app.currentImageView}-view`;
        console.log(`🎨 Container class: ${container.className}`);

        // Create fragment for performance
        const fragment = document.createDocumentFragment();

        // Render each image with proper annotation checking
        this.app.images.forEach((imageObj, index) => {
            const fileName = imageObj.name;
            const imagePath = imageObj.path;

            // Check if this image has annotations
            const hasAnnotations = this.app.annotations &&
                this.app.annotations[imagePath] &&
                this.app.annotations[imagePath].length > 0;

            const isActive = index === this.app.currentImageIndex;

            console.log(`🖼️ Image ${index + 1}: ${fileName}`);
            console.log(`   📁 Path: ${imagePath}`);
            console.log(`   🏷️ HasAnnotations: ${hasAnnotations}`);
            console.log(`   🎯 IsActive: ${isActive}`);
            console.log(`   📊 CurrentImageIndex: ${this.app.currentImageIndex}`);

            // Create image item
            const item = document.createElement('div');
            item.className = 'image-item';

            if (isActive) {
                item.classList.add('active');
            }
            if (hasAnnotations) {
                item.classList.add('labeled');
            }

            // Create thumbnail container
            const thumbnail = document.createElement('div');
            thumbnail.className = 'image-thumbnail';

            // Create image element
            const img = document.createElement('img');
            img.src = imageObj.url;
            img.alt = fileName;
            img.loading = 'lazy';
            img.onerror = function () {
                console.log(`❌ Failed to load image: ${fileName}`);
                this.style.display = 'none';
            };

            thumbnail.appendChild(img);

            // Add status overlay for grid view
            if (this.app.currentImageView === 'grid') {
                const overlay = document.createElement('div');
                overlay.className = 'image-overlay';

                if (hasAnnotations) {
                    overlay.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    `;
                } else {
                    overlay.innerHTML = `
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/>
                        </svg>
                    `;
                }
                thumbnail.appendChild(overlay);
            }

            item.appendChild(thumbnail);

            // Create info section
            const info = document.createElement('div');
            info.className = 'image-info';

            // Image name
            const name = document.createElement('span');
            name.className = 'image-name';
            name.textContent = fileName;
            info.appendChild(name);

            // Add status and index for list view
            if (this.app.currentImageView === 'list') {
                const status = document.createElement('span');
                status.className = 'image-status';
                status.textContent = hasAnnotations ? '✅ Labeled' : '⏳ Pending';
                info.appendChild(status);

                const indexSpan = document.createElement('span');
                indexSpan.className = 'image-index';
                indexSpan.textContent = `${index + 1} of ${this.app.images.length}`;
                info.appendChild(indexSpan);
            }

            item.appendChild(info);

            // Add click event
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🖱️ Clicked image ${index + 1}: ${fileName}`);
                this.setCurrentImage(index);
            });

            fragment.appendChild(item);
        });

        // Single DOM update
        container.appendChild(fragment);

        const endTime = performance.now();
        console.log(`✅ Image list rendered in ${(endTime - startTime).toFixed(2)}ms (${this.app.currentImageView} view):`, this.app.images.length);
    }

    setCurrentImage(index) {
        if (index >= 0 && index < this.app.images.length) {
            console.log(`🖼️ Switching to image ${index + 1}/${this.app.images.length}`);
            console.log(`📊 Current annotations before switch:`, this.app.annotations);
            console.log(`📁 Image object:`, this.app.images[index]);
            console.log(`📁 Image path:`, this.app.images[index].path);

            // CRITICAL: Update current image index FIRST
            this.app.currentImageIndex = index;
            console.log(`🎯 Updated currentImageIndex to: ${this.app.currentImageIndex}`);

            // CRITICAL: Update currentImage reference IMMEDIATELY
            this.app.currentImage = this.app.images[index];
            console.log(`🎯 Updated currentImage to:`, this.app.currentImage);
            console.log(`🎯 SYNCHRONIZATION CHECK:`, this.app.currentImage.path === this.app.images[index].path);

            // Use new professional system
            this.app.loadImage(this.app.images[index]);

            // Update UI after image is loaded
            this.renderImageList();
            this.updateUI();

            console.log(`📊 Current annotations after switch:`, this.app.annotations);
            console.log(`✅ Image switch complete`);
        }
    }

    previousImage() {
        if (this.app.currentImageIndex > 0) {
            this.setCurrentImage(this.app.currentImageIndex - 1);
        }
    }

    nextImage() {
        if (this.app.currentImageIndex < this.app.images.length - 1) {
            this.setCurrentImage(this.app.currentImageIndex + 1);
        }
    }

    // ========== UI UPDATES ==========
    updateUI() {
        // Update navigation buttons
        const prevBtn = document.getElementById('prevImage');
        const nextBtn = document.getElementById('nextImage');
        const exportBtn = document.getElementById('exportData');

        if (prevBtn) prevBtn.disabled = this.app.currentImageIndex <= 0;
        if (nextBtn) nextBtn.disabled = this.app.currentImageIndex >= this.app.images.length - 1;
        if (exportBtn) exportBtn.disabled = this.app.images.length === 0;

        // Update image counter
        const counter = document.getElementById('imageCounter');
        if (counter) {
            counter.textContent = `${this.app.currentImageIndex + 1} / ${this.app.images.length}`;
        }

        // Update progress
        this.updateProgress();
    }

    updateProgress() {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (this.app.images.length === 0) {
            if (progressBar) progressBar.style.width = '0%';
            if (progressText) progressText.textContent = 'No images loaded';
            return;
        }

        const annotatedCount = this.app.images.filter(img =>
            this.app.annotations[img.path] && this.app.annotations[img.path].length > 0
        ).length;

        const progress = (annotatedCount / this.app.images.length) * 100;

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) {
            progressText.textContent = `${annotatedCount} of ${this.app.images.length} images annotated`;
        }
    }

    // ========== THEME MANAGEMENT ==========
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                NotificationManager.success(`Switched to ${newTheme} mode`);
            });
        }
        console.log('✅ Theme system initialized');

        // Initialize notification toggle
        this.initNotificationToggle();
    }

    // ========== NOTIFICATION TOGGLE ==========
    initNotificationToggle() {
        const notificationToggle = document.getElementById('notificationToggle');
        if (notificationToggle) {
            const notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
            NotificationManager.setEnabled(notificationsEnabled);
            notificationToggle.setAttribute('aria-pressed', String(notificationsEnabled));

            notificationToggle.addEventListener('click', () => {
                const enabled = NotificationManager.isEnabled();
                const nextState = !enabled;
                NotificationManager.setEnabled(nextState);
                notificationToggle.setAttribute('aria-pressed', String(nextState));
                localStorage.setItem('notificationsEnabled', String(nextState));

                if (nextState) {
                    NotificationManager.info('Notifications enabled');
                }

                console.log(`🔔 Notifications ${nextState ? 'enabled' : 'disabled'}`);
            });
        }
        console.log('✅ Notification toggle initialized');
    }

    // ========== LABEL TABS ==========
    setupLabelTabs() {
        console.log('🔍 Setting up label tabs...');

        // Tab buttons
        const tabButtons = document.querySelectorAll('.label-tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchLabelTab(tab);
            });
        });

        // Export/Import buttons
        const exportBtn = document.getElementById('exportLabels');
        const importBtn = document.getElementById('importLabels');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLabels());
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => this.importLabels());
        }

        // Update stats
        this.updateLabelStats();
    }

    switchLabelTab(tab) {
        console.log('🔄 Switching to label tab:', tab);

        // Update tab buttons
        document.querySelectorAll('.label-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.label-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Handle special case for import-export tab
        const tabId = tab === 'import-export' ? 'importExportTab' : `${tab}Tab`;
        document.getElementById(tabId).classList.add('active');

        // Update stats if switching to import/export tab
        if (tab === 'import-export') {
            this.updateLabelStats();
        }
    }

    updateLabelStats() {
        const totalCount = document.getElementById('totalLabelsCount');
        const lastUpdated = document.getElementById('lastUpdated');

        if (totalCount) {
            totalCount.textContent = this.app.labels.length;
        }

        if (lastUpdated) {
            const now = new Date();
            lastUpdated.textContent = now.toLocaleTimeString();
        }
    }

    // ========== LABEL EXPORT/IMPORT ==========
    async exportLabels() {
        try {
            console.log('📤 Exporting labels...');

            const labelData = {
                version: '2.0.0',
                created: new Date().toISOString(),
                tool: 'TagiFLY v2.0.0',
                labels: this.app.labels,
                labelColors: this.app.labelColors,
                totalLabels: this.app.labels.length
            };

            const jsonData = JSON.stringify(labelData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `tagifly_labels_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            NotificationManager.success(`Labels exported successfully! (${this.app.labels.length} labels)`);
            console.log('✅ Labels exported successfully');

        } catch (error) {
            console.error('❌ Label export error:', error);
            NotificationManager.error('Failed to export labels');
        }
    }

    async importLabels() {
        try {
            console.log('📥 Importing labels...');

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const text = await file.text();
                const labelData = JSON.parse(text);

                // Validate label data
                if (!labelData.labels || !Array.isArray(labelData.labels)) {
                    NotificationManager.error('Invalid label file format');
                    return;
                }

                // Merge with existing labels (avoid duplicates)
                const existingLabels = new Set(this.app.labels);
                const newLabels = labelData.labels.filter(label => !existingLabels.has(label));

                if (newLabels.length === 0) {
                    NotificationManager.info('No new labels to import');
                    return;
                }

                // Add new labels
                this.app.labels.push(...newLabels);

                // Add colors for new labels if available
                if (labelData.labelColors) {
                    newLabels.forEach(label => {
                        if (labelData.labelColors[label]) {
                            this.app.labelColors[label] = labelData.labelColors[label];
                        }
                    });
                }

                // Update UI
                this.renderLabels();
                this.updateLabelStats();

                NotificationManager.success(`Imported ${newLabels.length} new labels successfully!`);
                console.log('✅ Labels imported successfully');
            };

            input.click();

        } catch (error) {
            console.error('❌ Label import error:', error);
            NotificationManager.error('Failed to import labels');
        }
    }
}
