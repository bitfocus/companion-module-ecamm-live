import type { ModuleInstance } from './main.js'
import { ActionIdOverlay } from './actions/action-overlay.js'
import { ActionIdScene } from './actions/action-scene.js'
import { ActionIdSound } from './actions/action-sound.js'
import { ActionIdProfile } from './actions/action-profile.js'
import { ActionIdSource } from './actions/action-source.js'
import { FeedbackIdOverlay, OverlayUnknownBehavior } from './feedbacks/feedback-overlay.js'
import { FeedbackIdScene } from './feedbacks/feedback-scene.js'
import { SoundAction } from './data-structures/ecamm-enums.js'
import { sceneLabel, soundLabel } from './data-structures/ecamm-parsers.js'
import { SLOT_FAMILIES, type SlotFamilyKey } from './variables/variable-slots.js'
import { GetPresetsAudio, PresetIdAudio } from './presets/preset-audio.js'
import { GetPresetsBroadcast, PresetIdBroadcast } from './presets/preset-broadcast.js'
import { GetPresetsOverlay, PresetIdOverlay } from './presets/preset-overlay.js'
import { GetPresetsScene, PresetIdScene } from './presets/preset-scene.js'
import { GetPresetsUtility, PresetIdUtility } from './presets/preset-utility.js'
import { GetPresetsZoom, PresetIdZoom } from './presets/preset-zoom.js'
import { buildFixedPresets } from './presets/preset-fixed.js'
import { buildSlotPresets } from './presets/preset-slots.js'
import type { CompanionPresetExt } from './presets/preset-utils.js'

/**
 * How many ready-made slot buttons each family gets.
 *
 * Deliberately below `SLOT_FAMILIES[x].count` for the three big families: the slot *variables*
 * still go all the way up, so a large Ecamm profile stays fully addressable, but shipping a
 * button for all 300 scene slots buries every other category in the palette. Past the cap the
 * user builds the button by hand against `scene_NNN_uuid`, which is what the slots are for.
 */
export const SLOT_PRESET_COUNTS: Record<SlotFamilyKey, number> = {
	scene: 100,
	overlay: 50,
	camera: 20,
	sound: SLOT_FAMILIES.sound.count,
	soundFolder: SLOT_FAMILIES.soundFolder.count,
	profile: SLOT_FAMILIES.profile.count,
}

/**
 * Two families of per-item button, deliberately kept side by side.
 *
 * "- Fixed" names a thing: one button per item the device actually reported, with that item's id
 * baked into the dropdown and its real name printed on the face. Reads device state, so before
 * Ecamm has answered there are none of them and those categories do not appear at all.
 *
 * "- Dynamic" names a position: one button per numbered variable slot, driven entirely by that
 * slot's variables. Present whether or not anything is connected, and it starts working as soon
 * as the device has that many items. Capped below what the slot *variables* offer, because the
 * fixed presets now cover the common case and a wall of 300 scene buttons buries the palette -
 * anyone with a larger profile builds the extra buttons by hand against scene_NNN_uuid.
 */
export function UpdatePresets(self: ModuleInstance): void {
	const state = self.ecammApi?.state

	const audio: { [id in PresetIdAudio]: CompanionPresetExt | undefined } = GetPresetsAudio()
	const broadcast: { [id in PresetIdBroadcast]: CompanionPresetExt | undefined } = GetPresetsBroadcast()
	const utility: { [id in PresetIdUtility]: CompanionPresetExt | undefined } = GetPresetsUtility()
	const scene: { [id in PresetIdScene]: CompanionPresetExt | undefined } = GetPresetsScene()
	const overlay: { [id in PresetIdOverlay]: CompanionPresetExt | undefined } = GetPresetsOverlay()
	const zoom: { [id in PresetIdZoom]: CompanionPresetExt | undefined } = GetPresetsZoom()

	const presets: Record<string, CompanionPresetExt | undefined> = {
		...audio,
		...broadcast,
		...utility,
		...scene,
		...overlay,
		...zoom,

		// One button per item this Ecamm actually has.
		...buildFixedPresets({
			prefix: 'scene',
			category: 'Scenes',
			items: state?.scenes ?? [],
			label: sceneLabel,
			verb: 'Switch to',
			actionId: ActionIdScene.setScene,
			feedbackId: FeedbackIdScene.sceneActive,
		}),
		// Only ever the current scene's overlays, so this block is rebuilt on every scene change.
		// A button already dragged out keeps its id and works regardless, because the overlay
		// dropdown allows a custom value.
		...buildFixedPresets({
			prefix: 'overlay',
			category: 'Overlays',
			items: state?.overlays ?? [],
			verb: 'Toggle',
			actionId: ActionIdOverlay.toggleOverlay,
			feedbackId: FeedbackIdOverlay.overlayVisible,
			feedbackOptions: { unknownBehavior: OverlayUnknownBehavior.Off },
		}),
		...buildFixedPresets({
			prefix: 'sound',
			category: 'Sounds',
			items: state?.sounds ?? [],
			label: soundLabel,
			verb: 'Play',
			actionId: ActionIdSound.playSound,
			actionOptions: { volume: 100, action: SoundAction.Restart },
		}),
		...buildFixedPresets({
			prefix: 'sound_folder',
			category: 'Sound folders',
			items: state?.soundFolders ?? [],
			verb: 'Play',
			actionId: ActionIdSound.playSoundFolder,
			actionOptions: { volume: 100, action: SoundAction.Restart },
		}),
		// No feedback on either, for the same reason as the slot presets below.
		...buildFixedPresets({
			prefix: 'camera',
			category: 'Cameras',
			items: state?.cameras ?? [],
			verb: 'Select',
			actionId: ActionIdSource.setCamera,
		}),
		...buildFixedPresets({
			prefix: 'profile',
			category: 'Profiles',
			items: state?.profiles ?? [],
			verb: 'Switch to',
			actionId: ActionIdProfile.setProfile,
		}),

		...buildSlotPresets({
			family: SLOT_FAMILIES.scene,
			presetCount: SLOT_PRESET_COUNTS.scene,
			category: 'Scenes',
			verb: 'Switch to',
			actionId: ActionIdScene.setScene,
			feedbackId: FeedbackIdScene.sceneActive,
			numberWhenEmpty: true,
		}),
		...buildSlotPresets({
			family: SLOT_FAMILIES.overlay,
			presetCount: SLOT_PRESET_COUNTS.overlay,
			category: 'Overlays',
			verb: 'Toggle',
			actionId: ActionIdOverlay.toggleOverlay,
			feedbackId: FeedbackIdOverlay.overlayVisible,
			feedbackOptions: { unknownBehavior: OverlayUnknownBehavior.Off },
			numberWhenEmpty: true,
		}),
		...buildSlotPresets({
			family: SLOT_FAMILIES.sound,
			presetCount: SLOT_PRESET_COUNTS.sound,
			category: 'Sounds',
			verb: 'Play',
			actionId: ActionIdSound.playSound,
			actionOptions: { volume: 100, action: SoundAction.Restart },
			numberWhenEmpty: true,
		}),
		// Cameras and profiles have had slot variables all along; these are the calls that finally
		// drive actions from them. No feedback on either: the only camera feedback reports Ecamm's
		// *default* camera rather than the live one, and there is no profile feedback at all.
		...buildSlotPresets({
			family: SLOT_FAMILIES.camera,
			presetCount: SLOT_PRESET_COUNTS.camera,
			category: 'Cameras',
			verb: 'Select',
			actionId: ActionIdSource.setCamera,
			numberWhenEmpty: true,
		}),
		...buildSlotPresets({
			family: SLOT_FAMILIES.profile,
			presetCount: SLOT_PRESET_COUNTS.profile,
			category: 'Profiles',
			verb: 'Switch to',
			actionId: ActionIdProfile.setProfile,
			numberWhenEmpty: true,
		}),
		...buildSlotPresets({
			family: SLOT_FAMILIES.soundFolder,
			presetCount: SLOT_PRESET_COUNTS.soundFolder,
			category: 'Sound folders',
			verb: 'Play',
			actionId: ActionIdSound.playSoundFolder,
			actionOptions: { volume: 100, action: SoundAction.Restart },
			numberWhenEmpty: true,
		}),
	}

	self.setPresetDefinitions(presets)
}
