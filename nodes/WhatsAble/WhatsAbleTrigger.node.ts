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
        group: ['trigger', 'whatsable'],
        version: 1,
        subtitle: '={{$parameter["event"]}}',
        description: 'Combined WhatsAble Triggers',
        defaults: {
            name: 'WhatsAble Trigger',
        },
        inputs: [],
        outputs: ['main'],
        credentials: [
            {
                name: 'whatsAbleTriggerApi',
                required: false,
                displayOptions: {
                    show: {
                        event: ['whatsableTrigger'],
                    },
                },
            },
            {
                name: 'whatsAbleNotifierApi',
                required: false,
                displayOptions: {
                    show: {
                        event: ['notifier'],
                    },
                },
            },
            {
                name: 'whatsAbleNotifyerApi',
                required: false,
                displayOptions: {
                    show: {
                        event: ['notifyer'],
                    },
                },
            },
            
        ],
        webhooks: [
            {
                name: 'default',
                httpMethod: '={{$parameter["httpMethod"]}}',
                responseMode: '={{$parameter["responseMode"]}}',
                path: 'whatsable-webhook',
                isFullPath: false,
            },
        ],
        properties: [
            {
                displayName: 'Event',
                name: 'event',
                type: 'options',
                options: [
                    {
                        name: 'Whatsable Incoming Message From Recipient',
                        value: 'whatsableTrigger',
                        description: 'Incoming Message From Whatsable',
                    },
                    {
                        name: 'Notifier Incoming Message From Recipient',
                        value: 'notifier',
                        description: 'Incoming Message From WhatsAble Notifier',
                    },
                    {
                        name: 'Notifyer System Incoming Message From Recipient',
                        value: 'notifyer',
                        description: 'Incoming Message From recipient',
                    }
                    
                ],
                default: 'whatsableTrigger',
                description: 'Choose which event to trigger on',
            },
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

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const event = this.getNodeParameter('event') as string;
        const webhookData = this.getRequestObject().body;

        if (event === 'notifier') {
            // Notifier logic (with registration)
            const credentials = await this.getCredentials('whatsAbleNotifierApi');
            try {
                await this.helpers.httpRequest({
                    method: 'POST',
                    url: 'https://api.insightssystem.com/api:gncnl2D6/n8n/notifier/webhook',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': credentials.apiKey as string,
                    },
                    body: {
                        url: credentials.productionWebhookUrl,
                    },
                });
            } catch (error) {
                // Log the error but don't fail the webhook
                console.error('Failed to register notifier webhook URL:', error);
            }
        } else if (event === 'notifyer') {
            // Notifyer registration logic
            const credentials = await this.getCredentials('whatsAbleNotifyerApi');
            try {
                await this.helpers.httpRequest({
                    method: 'POST',
                    url: 'https://api.insightssystem.com/api:dBShrB6H/n8n',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': credentials.apiKey as string,
                    },
                    body: {
                        hookUrl: credentials.productionWebhookUrl,
                        api_key: credentials.apiKey as string,
                    },
                });
            } catch (error) {
                // Log the error but don't fail the webhook
                console.error('Failed to register notifyer webhook URL:', error);
            }
        } else if (event === 'whatsableTrigger') {
            // WhatsAble Trigger registration logic
            const credentials = await this.getCredentials('whatsAbleTriggerApi');
            try {
                await this.helpers.httpRequest({
                    method: 'POST',
                    url: 'https://api.insightssystem.com/api:KXAU3bZ4/n8n/webhook',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': credentials.apiKey as string,
                    },
                    body: {
                        url: credentials.productionWebhookUrl,
                    },
                });
            } catch (error) {
                // Log the error but don't fail the webhook
                console.error('Failed to register WhatsAble Trigger webhook URL:', error);
            }
        }

        return {
            workflowData: [this.helpers.returnJsonArray(webhookData)],
        };
    }
} 