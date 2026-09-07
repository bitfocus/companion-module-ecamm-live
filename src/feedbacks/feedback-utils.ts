import { combineRgb } from '@companion-module/base'

export const ColorWhite = combineRgb(255, 255, 255)
export const ColorBlack = combineRgb(0, 0, 0)
export const ColorRed = combineRgb(200, 0, 0)
export const ColorGreen = combineRgb(0, 150, 0)
export const ColorOrange = combineRgb(220, 120, 0)

/** Live / active. */
export const StyleActive = { color: ColorWhite, bgcolor: ColorRed }
/** Ready, armed, or otherwise good. */
export const StyleReady = { color: ColorWhite, bgcolor: ColorGreen }
/** Needs attention but is not an error. */
export const StyleWarning = { color: ColorBlack, bgcolor: ColorOrange }
