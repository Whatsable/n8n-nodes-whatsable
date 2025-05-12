import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class WhatsAbleTriggerApi implements ICredentialType {
	name = 'whatsAbleTriggerApi';
	displayName = 'WhatsAble Trigger API';
	documentationUrl = 'https://www.whatsable.app/documentation';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The API key for WhatsAble trigger authentication',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};
} 