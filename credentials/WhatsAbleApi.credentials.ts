import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class WhatsAbleApi implements ICredentialType {
	name = 'whatsAbleApi';
	displayName = 'WhatsAble API';
	// Uses the link to this tutorial as an example
	// Replace with your own docs links when building your own nodes
	documentationUrl =
		'https://docs.whatsable.app/n8n-overview';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				apiKey: '={{$credentials.apiKey}}',
			},
		},
	};
}