import { SomeCompanionConfigField } from '../../../instance_skel_types'

export interface Config {
	label: string
}

export const getConfigFields = (): SomeCompanionConfigField[] => {
	return [
		{
			type: 'text',
			id: 'text',
			label: 'Ecamm Live',
			value: 'When Ecamm live is running, no need to check these settings',
			width: 6,
		},
	]
}
