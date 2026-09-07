import { describe, expect, it } from 'vitest'
import { parseSoundList, soundLabel } from '../../src/data-structures/ecamm-parsers.js'
import { loadFixture } from '../helpers/fixture.js'

/**
 * Folders arrive as ordinary entries carrying `Group: true` with their members in `Children`.
 * Before this was handled, a folder looked exactly like a playable sound - title and UUID - so it
 * appeared in the sound dropdown while the sounds inside it vanished from the list entirely.
 */
describe('sound folders', () => {
	const { sounds, folders } = parseSoundList(loadFixture('getSoundList'))

	it('lifts nested sounds out of their folder', () => {
		const names = sounds.map((sound) => sound.label)
		expect(names).toContain('Triangle')
		expect(names).toContain('Timpani Roll')
	})

	it('never offers a folder as a playable sound', () => {
		expect(sounds.map((sound) => sound.label)).not.toContain('Test Group')
	})

	it('returns folders separately, with a count of what they hold', () => {
		expect(folders).toHaveLength(1)
		expect(folders[0].label).toBe('Test Group')
		expect(folders[0].soundCount).toBe(2)
		expect(folders[0].id).toBeTruthy()
	})

	it('records which folder a nested sound came from', () => {
		expect(sounds.find((sound) => sound.label === 'Triangle')?.folderName).toBe('Test Group')
		expect(sounds.find((sound) => sound.label === 'Applause')?.folderName).toBeUndefined()
	})

	it('labels nested sounds as "Folder / Sound"', () => {
		const triangle = sounds.find((sound) => sound.label === 'Triangle')!
		const applause = sounds.find((sound) => sound.label === 'Applause')!
		expect(soundLabel(triangle)).toBe('Test Group / Triangle')
		expect(soundLabel(applause)).toBe('Applause')
	})

	it('handles folders nested inside folders', () => {
		const nested = parseSoundList({
			items: [
				{
					title: 'Outer',
					UUID: 'outer',
					Group: true,
					Children: [
						{ title: 'Inner', UUID: 'inner', Group: true, Children: [{ title: 'Deep', UUID: 'deep' }] },
						{ title: 'Shallow', UUID: 'shallow' },
					],
				},
			],
		})

		expect(nested.folders.map((f) => f.label)).toEqual(['Outer', 'Inner'])
		expect(nested.sounds.map((s) => s.label)).toEqual(['Deep', 'Shallow'])
		// A nested sound is attributed to the folder directly containing it.
		expect(nested.sounds.find((s) => s.label === 'Deep')?.folderName).toBe('Inner')
		// The outer folder counts everything beneath it, at any depth.
		expect(nested.folders.find((f) => f.label === 'Outer')?.soundCount).toBe(2)
	})

	it('ignores an entry with no id, folder or not', () => {
		const result = parseSoundList({
			items: [
				{ title: 'no id', UUID: '' },
				{ title: 'ghost folder', Group: true },
			],
		})
		expect(result.sounds).toEqual([])
		expect(result.folders).toEqual([])
	})
})
