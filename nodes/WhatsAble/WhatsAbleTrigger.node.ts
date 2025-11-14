import {
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
} from 'n8n-workflow';

export class WhatsAbleTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Incoming/outgoing WhatsApp message Trigger',
        name: 'whatsAbleTrigger',
        icon: 'file:whatsable.svg',
        group: ['trigger'],
        version: 1,
        subtitle: 'Incoming/outgoing WhatsApp message',
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
            {
                name: 'whatsAbleNotifyerSystemAllApi',
                required: true,
                displayOptions: {
                    show: {
                        credentialType: ['notifyerSystemAll'],
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
                        name: 'WhatsAble Incoming Message',
                        value: 'whatsableTrigger',
                        description: 'Use WhatsAble Trigger API for incoming messages',
                    },
                    {
                        name: 'Notifier Incoming Message',
                        value: 'notifier',
                        description: 'Use Notifier API for incoming messages',
                    },
                    {
                        name: 'Notifyer System Incoming Message',
                        value: 'notifyer',
                        description: 'Use Notifyer System API for incoming messages',
                    },
                    {
                        name: 'Notifyer System Incoming & Outgoing Message',
                        value: 'notifyerSystemAll',
                        description: 'Use Notifyer System API for incoming & Outgoing messages',
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
