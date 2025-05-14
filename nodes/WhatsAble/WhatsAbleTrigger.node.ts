import {
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
    IHookFunctions,
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
                path: 'whatsable-webhook',
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

    // Methods to get and log webhook URL
    webhookMethods = {
        default: {
            async checkExists(this: IHookFunctions): Promise<boolean> {
                // Get the webhook URL
                const webhookUrl = this.getNodeWebhookUrl('default');

                // Log the webhook URL
                console.log('WhatsAble Webhook URL:', webhookUrl);

                // You could also add it to the node parameters so it's visible in the UI
                // this.getNode().webhookUrl = webhookUrl;

                return true;
            },
            async create(this: IHookFunctions): Promise<boolean> {
                // Log the webhook URL when created
                const webhookUrl = this.getNodeWebhookUrl('default');
                console.log('WhatsAble Webhook Created with URL:', webhookUrl);
                return true;
            },
            async delete(this: IHookFunctions): Promise<boolean> {
                // Log when webhook is deleted
                console.log('WhatsAble Webhook Deleted');
                return true;
            },
        },
    };

    // The function to execute when the webhook gets called
    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        // Log the webhook URL again when the webhook is triggered
        const webhookUrl = this.getNodeWebhookUrl('default');
        console.log('WhatsAble Webhook Triggered at URL:', webhookUrl);

        return {
            workflowData: [this.helpers.returnJsonArray(this.getRequestObject().body)],
        };
    }
}