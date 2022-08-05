"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFields = void 0;
const getConfigFields = () => {
    return [
        {
            type: 'text',
            id: 'text',
            label: 'Ecamm Live',
            value: 'When Ecamm live is running, no need to check these settings',
            width: 6,
        },
    ];
};
exports.getConfigFields = getConfigFields;
