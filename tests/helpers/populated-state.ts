import {
	parseCameraList,
	parseInfo,
	parseOverlayList,
	parseProfileList,
	parseSceneList,
	parseSoundList,
} from '../../src/data-structures/ecamm-parsers.js'
import { EcammState } from '../../src/ecamm-api/ecamm-state.js'
import { loadFixture } from './fixture.js'

/** A state loaded from the captured payloads, for exercising the populated code paths. */
export function populatedState(): EcammState {
	const state = new EcammState()
	state.applyInfo(parseInfo(loadFixture('getInfo')))
	state.applyList('scenes', parseSceneList(loadFixture('getSceneList')))
	state.applyList('overlays', parseOverlayList(loadFixture('getOverlayList')))
	state.applyList('cameras', parseCameraList(loadFixture('getInputs')))
	const soundList = parseSoundList(loadFixture('getSoundList'))
	state.applyList('sounds', soundList.sounds)
	state.applyList('soundFolders', soundList.folders)
	state.applyList('profiles', parseProfileList(loadFixture('getProfileList')))
	state.connected = true
	state.defaultCameraId = 'ZOOM_ACTIVE_SPEAKER'
	return state
}
