import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

export class WhatsAbleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsAble Trigger',
		name: 'whatsAbleTrigger',
		icon: 'file:whatsable.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["httpMethod"] + ": " + $parameter["path"]}}',
		description: 'Incoming Message From recipient',
		defaults: {
			name: 'WhatsAble Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'whatsAbleTriggerApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: '={{$parameter["httpMethod"]}}',
				responseMode: '={{$parameter["responseMode"]}}',
				path: '={{$parameter["path"]}}',
				isFullPath: false,
			},
		],
		properties: [
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{
						name: 'POST',
						value: 'POST',
					},
				],
				default: 'POST',
				description: 'The HTTP method to listen to',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook-path',
				required: true,
				description: 'The path to listen to',
			},
			{
				displayName: 'Respond',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Immediately',
						value: 'onReceived',
						description: 'As soon as the request is received',
					},
					{
						name: 'When Last Node Finishes',
						value: 'lastNode',
						description: 'After the last node in the workflow finishes executing',
					},
				],
				default: 'onReceived',
				description: 'When to respond to the webhook',
			},
		],
	};

	// The function to execute when the webhook gets called
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return {
			workflowData: [this.helpers.returnJsonArray(this.getRequestObject().body)],
		};
	}
} 