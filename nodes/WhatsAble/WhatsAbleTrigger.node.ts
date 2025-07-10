import {
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
} from 'n8n-workflow';

export class WhatsAbleTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Incoming message Trigger',
        name: 'whatsAbleTrigger',
        icon: 'file:whatsable.svg',
        group: ['trigger'],
        version: 1,
        subtitle: 'Incoming Message',
        description: 'Triggers when receiving messages from WhatsAble services',
        defaults: {
            name: 'WhatsAble Trigger',
        },
        inputs: [],
        outputs: ['main'],
        credentials: [
            {
                name: 'whatsAbleTriggerApi',
                required: true,
                displayOptions: {
                    show: {
                        credentialType: ['whatsableTrigger'],
                    },
                },
            },
            {
                name: 'whatsAbleNotifierApi',
                required: true,
                displayOptions: {
                    show: {
                        credentialType: ['notifier'],
                    },
                },
            },
            {
                name: 'whatsAbleNotifyerApi',
                required: true,
                displayOptions: {
                    show: {
                        credentialType: ['notifyer'],
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
                displayName: 'Credential Type',
                name: 'credentialType',
                type: 'options',
                options: [
                    {
                        name: 'WhatsAble Trigger API',
                        value: 'whatsableTrigger',
                        description: 'Use WhatsAble Trigger API for incoming messages',
                    },
                    {
                        name: 'WhatsAble Notifier API',
                        value: 'notifier',
                        description: 'Use WhatsAble Notifier API for incoming messages',
                    },
                    {
                        name: 'WhatsAble Notifyer System API',
                        value: 'notifyer',
                        description: 'Use WhatsAble Notifyer System API for incoming messages',
                    }
                ],
                default: 'whatsableTrigger',
                description: 'Choose which WhatsAble API to use for this trigger',
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
        const webhookData = this.getRequestObject().body;

        return {
            workflowData: [this.helpers.returnJsonArray(webhookData)],
        };
    }
}
