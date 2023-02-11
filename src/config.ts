import { InstanceBase, SomeCompanionConfigField } from '@companion-module/base'

export interface InstanceBaseExt<TConfig> extends InstanceBase<TConfig> {
	[x: string]: any
	
	updateVariableValues(): void
}

export interface Config {
	label: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'text',
			label: 'Ecamm Live',
			value: 'When Ecamm live is running, no need to check these settings',
			width: 6,
		},
	]
}
