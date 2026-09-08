import type { CompanionActionDefinition } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { ActionIdAudio, GetActionsAudio } from './actions/action-audio.js'
import { ActionIdBroadcast, GetActionsBroadcast } from './actions/action-broadcast.js'
import { ActionIdFilter, GetActionsFilter } from './actions/action-filter.js'
import { ActionIdOverlay, GetActionsOverlay } from './actions/action-overlay.js'
import { ActionIdPreview, GetActionsPreview } from './actions/action-preview.js'
import { ActionIdProfile, GetActionsProfile } from './actions/action-profile.js'
import { ActionIdScene, GetActionsScene } from './actions/action-scene.js'
import { ActionIdSound, GetActionsSound } from './actions/action-sound.js'
import { ActionIdSource, GetActionsSource } from './actions/action-source.js'
import { ActionIdUtility, GetActionsUtility } from './actions/action-utility.js'
import { ActionIdZoom, GetActionsZoom } from './actions/action-zoom.js'

/** Base enum for uncategorised actions; kept empty so the union below always has an anchor. */
export enum ActionId {}

/**
 * Note there are no `get*` actions. Every readable value is polled and published as a variable or
 * a feedback, so buttons whose only effect was to refresh hidden state no longer exist.
 */
export function UpdateActions(self: ModuleInstance): void {
	const audio: { [id in ActionIdAudio]: CompanionActionDefinition | undefined } = GetActionsAudio(self)
	const broadcast: { [id in ActionIdBroadcast]: CompanionActionDefinition | undefined } = GetActionsBroadcast(self)
	const filter: { [id in ActionIdFilter]: CompanionActionDefinition | undefined } = GetActionsFilter(self)
	const overlay: { [id in ActionIdOverlay]: CompanionActionDefinition | undefined } = GetActionsOverlay(self)
	const preview: { [id in ActionIdPreview]: CompanionActionDefinition | undefined } = GetActionsPreview(self)
	const profile: { [id in ActionIdProfile]: CompanionActionDefinition | undefined } = GetActionsProfile(self)
	const scene: { [id in ActionIdScene]: CompanionActionDefinition | undefined } = GetActionsScene(self)
	const sound: { [id in ActionIdSound]: CompanionActionDefinition | undefined } = GetActionsSound(self)
	const source: { [id in ActionIdSource]: CompanionActionDefinition | undefined } = GetActionsSource(self)
	const utility: { [id in ActionIdUtility]: CompanionActionDefinition | undefined } = GetActionsUtility(self)
	const zoom: { [id in ActionIdZoom]: CompanionActionDefinition | undefined } = GetActionsZoom(self)

	const actions: {
		[
			id in
				| ActionId
				| ActionIdAudio
				| ActionIdBroadcast
				| ActionIdFilter
				| ActionIdOverlay
				| ActionIdPreview
				| ActionIdProfile
				| ActionIdScene
				| ActionIdSound
				| ActionIdSource
				| ActionIdUtility
				| ActionIdZoom
		]: CompanionActionDefinition | undefined
	} = {
		...audio,
		...broadcast,
		...filter,
		...overlay,
		...preview,
		...profile,
		...scene,
		...sound,
		...source,
		...utility,
		...zoom,
	}

	self.setActionDefinitions(actions)
}
