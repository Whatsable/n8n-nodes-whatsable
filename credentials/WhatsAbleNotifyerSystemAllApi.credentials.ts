import {
    ICredentialType,
    INodeProperties,
    ICredentialTestRequest,
    IAuthenticateGeneric,
} from 'n8n-workflow';
import { BASE_DOMAIN } from '../shared/constants';

export class WhatsAbleNotifyerSystemAllApi implements ICredentialType {
    name = 'whatsAbleNotifyerSystemAllApi';
    displayName = 'Notifyer System API';
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
            displayName: 'Webhook URL',
            name: 'productionWebhookUrl',
            type: 'string',
            default: '',
            required: true,
            description: 'Enter your webhook URL for testing. In production, this will be automatically determined.',
        }
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '={{$credentials.apiKey}}',
            },
        },
    };

    // This method is called when the "Test" button is clicked
    test: ICredentialTestRequest = {
        request: {
            baseURL: `${BASE_DOMAIN}/api:ErOQ8pSj`,
            url: '/n8n/webhook',
            method: 'POST',
            body: {
                url: '={{$credentials.productionWebhookUrl}}'
            },
            headers: {
                'Content-Type': 'application/json'
            }
        },
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'success',
                    value: false,
                    message: 'Invalid API key',
                },
            },
        ],
    };
}

