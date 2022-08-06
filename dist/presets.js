"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresets = void 0;
function getPresets(instance) {
    let presets = [];
    presets.push({
        category: 'Basic',
        label: `Mute`,
        bank: {
            style: 'text',
            text: `Mute`,
            size: 'auto',
            color: instance.rgb(255, 255, 255),
            bgcolor: instance.rgb(0, 0, 0),
        },
        actions: [{ action: 'setMute', options: {} }],
        feedbacks: [],
    });
    return presets;
}
exports.getPresets = getPresets;
