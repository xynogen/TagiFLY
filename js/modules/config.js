// TagiFLY Configuration Module
// Tüm sistem konfigürasyonları burada

export const CONFIG = {
    DEFAULT_LABELS: ['person', 'car', 'bicycle', 'dog', 'cat'],
    COLORS: ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#00C7BE', '#FFCC00', '#FF2D92'],

    // Keypoint Templates
    KEYPOINT_TEMPLATES: {
        'person': {
            name: 'Human Pose (17 points)',
            points: [
                'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
                'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
                'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
            ],
            connections: [
                [0, 1], [0, 2], [1, 3], [2, 4], // Head
                [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
                [5, 11], [6, 12], [11, 12], // Torso
                [11, 13], [13, 15], [12, 14], [14, 16] // Legs
            ]
        }
    },

    // Canvas Settings
    CANVAS: {
        MIN_ZOOM: 0.1,
        MAX_ZOOM: 10,
        ZOOM_STEP: 0.1,
        DEFAULT_ZOOM: 1
    },

    // History Settings
    HISTORY: {
        MAX_SIZE: 50
    },

    // Mask Settings
    MASK: {
        DEFAULT_BRUSH_SIZE: 20,
        MIN_BRUSH_SIZE: 5,
        MAX_BRUSH_SIZE: 100
    }
};
