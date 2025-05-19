import {
    ICredentialType,
    INodeProperties,
    ICredentialTestRequest,
} from 'n8n-workflow';

export class WhatsAbleNotifyerApi implements ICredentialType {
    name = 'whatsAbleTriggerApi';
    displayName = 'WhatsAble API';
    documentationUrl = 'https://docs.whatsable.app/n8n-overview';
    
    // Properties shown in the credentials dialog
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
			typeOptions: { password: true },
            default: '',
            required: true,
            description: 'API Key for WhatsAble',
        },
        {
            displayName: 'Production Webhook URL',
            name: 'productionWebhookUrl',
            type: 'string',
            default: '',
            required: true,
            description: 'Enter your webhook URL for testing. In production, this will be automatically determined.',
        }
    ];

    // Fixed forward URL - not user configurable
    forwardUrl = 'https://api.insightssystem.com/api:dBShrB6H/n8n';

    // This method is called when the "Test" button is clicked
    test: ICredentialTestRequest = {
        request: {
            baseURL: this.forwardUrl,
            url: '',
            method: 'POST',
            body: {
                hookUrl: '={{$credentials.productionWebhookUrl}}',
                api_key: '={{$credentials.apiKey}}'
            },
            headers: {
                'Content-Type': 'application/json'
            }
        }
    };
}