import {
    ICredentialType,
    INodeProperties,
    ICredentialTestRequest,
    IAuthenticateGeneric,
} from 'n8n-workflow';
import { BASE_DOMAIN } from '../shared/constants';

export class WhatsAbleNotifierApi implements ICredentialType {
    name = 'whatsAbleNotifierApi';
    displayName = 'WhatsAble Notifier API';
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
            description: 'API Key for WhatsAble Notifier',
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
            baseURL: `${BASE_DOMAIN}/api:gncnl2D6`,
            url: '/n8n/notifier/webhook',
            method: 'POST',
            body: {
                url: '={{$credentials.productionWebhookUrl}}'
            },
            headers: {
                'Content-Type': 'application/json'
            }
        }
    };
}