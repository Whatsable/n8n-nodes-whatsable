import {
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
} from 'n8n-workflow';

export class WhatsAbleNotifierTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'WhatsAble Notifier Trigger',
        name: 'whatsAbleNotifierTrigger',
        icon: 'file:whatsable.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["httpMethod"] + ": " + $parameter["path"]}}',
        description: 'Incoming Message From WhatsAble Notifier',
        defaults: {
            name: 'WhatsAble Notifier Trigger',
        },
        inputs: [],
        outputs: [{ type: 'main' }],
        credentials: [
            {
                name: 'whatsAbleNotifierApi',
                required: true,
            },
        ],
        webhooks: [
            {
                name: 'default',
                httpMethod: '={{$parameter["httpMethod"]}}',
                responseMode: '={{$parameter["responseMode"]}}',
                path: 'whatsable-notifier-webhook',
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
        // Get the webhook data
        const webhookData = this.getRequestObject().body;
        const credentials = await this.getCredentials('whatsAbleNotifierApi');
        
        // Register the webhook URL with the API
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
            console.error('Failed to register webhook URL:', error);
        }
        
        // Return the webhook data to be processed by n8n workflow
        return {
            workflowData: [this.helpers.returnJsonArray(webhookData)],
        };
    }
} 