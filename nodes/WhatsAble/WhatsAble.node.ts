import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	INodePropertyOptions,
	ResourceMapperFields,
	NodeApiError,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { WHATSAPP_TIMEZONES } from './timezones';

// Base URLs for different endpoints
const BASE_URLS = {
	VALIDATION: 'https://api.insightssystem.com/api:gncnl2D6',
	NOTIFIER: 'https://api.insightssystem.com/api:gncnl2D6',
	NOTIFYER: 'https://api.insightssystem.com/api:ErOQ8pSj',
	WHATSABLE: 'https://api.insightssystem.com/api:gncnl2D6',
} as const;

export class WhatsAble implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsAble',
		name: 'whatsAble',
		icon: 'file:whatsable.svg',
		group: ['communication'],
		version: 1,
		subtitle: '={{$parameter["operation"] || "Configure WhatsApp messaging"}}',
		description: 'Automate WhatsApp messages',
		defaults: {
			name: 'WhatsAble',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'whatsAbleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
					},
				],
				default: 'sendMessage',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
					},
				},
				options: [
					{
						name: 'Send Message Via Whatsable',
						value: 'sendWhatsableMessage',
						description: 'Send WhatsApp messages via WhatsAble platform',
						action: 'Send message via whatsable',
					},
					{
						name: 'Send Message Via Notifier',
						value: 'sendMessage',
						description: 'Send WhatsApp messages with optional attachments',
						action: 'Send message via notifier',
					},
					{
						name: 'Send Template Via Notifyer',
						value: 'sendNotifyerTemplate',
						description: 'Send template-based WhatsApp messages',
						action: 'Send template via notifyer',
					},
					{
						name: 'Send Non Template Via Notifyer',
						value: 'sendNonTemplateMessage',
						description: 'Send non-template WhatsApp messages',
						action: 'Send non template via notifyer',
					},
				],
				default: 'sendMessage',
				required: true,
			},

			// Fields for notifier product - Send Message
			{
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				placeholder: 'Recipient phone number',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendMessage'],
					},
				},
				description: 'The phone number of the recipient in international format',
				default: '',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				placeholder: 'Your message here',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendMessage'],
					},
				},
				description: 'The text message to send',
				typeOptions: {
					rows: 4,
				},
				default: '',
			},
			{
				displayName: 'Attachment URL',
				name: 'attachment',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendMessage'],
					},
				},
				description: 'URL of an attachment to send (optional)',
			},
			{
				displayName: 'Filename',
				name: 'filename',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendMessage'],
					},
				},
				description: 'Filename for the attachment (optional)',
			},

			// Fields for notifyer product - Send Template
			{
				displayName: 'Recipient',
				name: 'notifyerRecipient',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNotifyerTemplate'],
					},
				},
				description: 'The phone number of the recipient in international format',
				default: '',
			},
			{
				displayName: 'Template Name or ID',
				name: 'notifyerTemplate',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNotifyerTemplate'],
					},
				},
				description: 'The template to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				default: '',
			},
			{
				displayName: 'Template Variables',
				name: 'notifyerVariables',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNotifyerTemplate'],
					},
				},
				description: 'Variables for the template',
				typeOptions: {
					loadOptionsDependsOn: ['notifyerTemplate'],
					resourceMapper: {
						resourceMapperMethod: 'getTemplateVariables',
						mode: 'add',
						fieldWords: {
							singular: 'variable',
							plural: 'variables',
						},
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
					},
				},
			},
			{
				displayName: 'Note',
				name: 'templateNote',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNotifyerTemplate'],
					},
				},
				description: 'Optional note to add to the template message',
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName: 'Label Names or IDs',
				name: 'templateLabels',
				type: 'multiOptions',
				default: [],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNotifyerTemplate'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
			},
			{
				displayName: 'Schedule Message',
				name: 'scheduleTemplateMessage',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNotifyerTemplate'],
					},
				},
				description: 'Whether to schedule the message for later delivery',
			},
			{
				displayName: 'Scheduled Date and Time',
				name: 'templateScheduledDateTime',
				type: 'dateTime',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNotifyerTemplate'],
						scheduleTemplateMessage: [true],
					},
				},
				description: 'The date and time when the message should be sent',
				default: '',
			},
			{
				displayName: 'Timezone',
				name: 'templateTimezone',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNotifyerTemplate'],
						scheduleTemplateMessage: [true],
					},
				},
				options: WHATSAPP_TIMEZONES,
				default: 'Asia/Dhaka',
				description: 'Timezone for the scheduled date and time',
			},
			

			// Fields for whatsable product
			{
				displayName: 'Recipient Name or ID',
				name: 'whatsableTo',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWhatsAppNumbers',
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsableMessage'],
					},
				},
				description: 'Select a WhatsApp number to send from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				default: '',
			},
			{
				displayName: 'Text',
				name: 'whatsableText',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsableMessage'],
					},
				},
				description: 'Message text content',
				typeOptions: {
					rows: 4,
				},
				default: '',
			},
			{
				displayName: 'Attachment URL',
				name: 'whatsableAttachment',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsableMessage'],
					},
				},
				description: 'URL of an attachment to send',
				default: '',
			},
			{
				displayName: 'Filename',
				name: 'whatsableFilename',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsableMessage'],
					},
				},
				description: 'Filename for the attachment',
				default: '',
			},

			// Fields for notifyer product - Send Non Template Message
			{
				displayName: 'Recipient Phone Number',
				name: 'nonTemplateRecipient',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
					},
				},
				description: 'The phone number of the recipient in international format',
				default: '',
			},
			{
				displayName: 'Message Type',
				name: 'messageType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
					},
				},
				options: [
					{
						name: 'Audio Message',
						value: 'audio',
					},
					{
						name: 'Document Message',
						value: 'document',
					},
					{
						name: 'Image Message',
						value: 'image',
					},
					{
						name: 'Text Message',
						value: 'text',
					},
					{
						name: 'Video Message',
						value: 'video',
					},
				],
				default: 'text',
				description: 'Type of message to send',
			},
			{
				displayName: 'Enable Link Preview',
				name: 'enableLinkPreview',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['text'],
					},
				},
				description: 'Whether to enable link preview for text messages containing URLs',
			},
			{
				displayName: 'Document URL',
				name: 'documentUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['document'],
					},
				},
				description: 'URL of the document to send',
				default: '',
			},
			{
				displayName: 'Caption',
				name: 'documentCaption',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['document'],
					},
				},
				description: 'Optional caption for the document',
				default: '',
			},
			{
				displayName: 'Filename',
				name: 'documentFilename',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['document'],
					},
				},
				description: 'Filename for the document',
				default: '',
			},
			{
				displayName: 'Preview URL',
				name: 'documentPreviewUrl',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['document'],
					},
				},
				description: 'Whether to enable URL preview for document',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['image'],
					},
				},
				description: 'URL of the image to send',
				default: '',
			},
			{
				displayName: 'Caption',
				name: 'imageCaption',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['image'],
					},
				},
				description: 'Optional caption for the image',
				default: '',
			},
			{
				displayName: 'Preview URL',
				name: 'previewUrl',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['image'],
					},
				},
				description: 'Whether to enable URL preview for image',
			},
			{
				displayName: 'Video URL',
				name: 'videoUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['video'],
					},
				},
				description: 'URL of the video to send',
				default: '',
			},
			{
				displayName: 'Caption',
				name: 'videoCaption',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['video'],
					},
				},
				description: 'Optional caption for the video',
				default: '',
			},
			{
				displayName: 'Preview URL',
				name: 'videoPreviewUrl',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['video'],
					},
				},
				description: 'Whether to enable URL preview for video',
			},
			{
				displayName: 'Audio URL',
				name: 'audioUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['audio'],
					},
				},
				description: 'URL of the audio to send',
				default: '',
			},
			{
				displayName: 'Preview URL',
				name: 'audioPreviewUrl',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['audio'],
					},
				},
				description: 'Whether to enable URL preview for audio',
			},
			{
				displayName: 'Message Content',
				name: 'messageContent',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						messageType: ['text'],
					},
				},
				description: 'The content of the message (text or URL depending on message type)',
				default: '',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'nonTemplateLabels',
				type: 'multiOptions',
				default: [],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
			},
			{
				displayName: 'Schedule Message',
				name: 'scheduleNonTemplateMessage',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
					},
				},
				description: 'Whether to schedule the message for later delivery',
			},
			{
				displayName: 'Scheduled Date and Time',
				name: 'nonTemplateScheduledDateTime',
				type: 'dateTime',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						scheduleNonTemplateMessage: [true],
					},
				},
				description: 'The date and time when the message should be sent',
				default: '',
			},
			{
				displayName: 'Timezone',
				name: 'nonTemplateTimezone',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendNonTemplateMessage'],
						scheduleNonTemplateMessage: [true],
					},
				},
				options: WHATSAPP_TIMEZONES,
				default: 'Asia/Dhaka',
				description: 'Timezone for the scheduled date and time',
			},

			// Hidden field to store product info
			{
				displayName: 'Detected Product',
				name: 'detectedProduct',
				type: 'hidden',
				default: '',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'hidden',
				default: '',
			},
		],
	};

	methods = {
		loadOptions: {

			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				try {
					// Fetch available templates from API using the user ID
					const templatesOptions: IHttpRequestOptions = {
						method: 'GET',
						baseURL: BASE_URLS.NOTIFYER,
						url: `/n8n-templates`,
						headers: {
							'Accept': 'application/json',
						},
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'whatsAbleApi',
						templatesOptions,
					);

					// Process templates from response
					if (Array.isArray(response)) {
						for (const template of response) {
							returnData.push({
								name: template.name || template.id,
								description: template.type ? `Type: ${template.type}, Language: ${template.language || 'Unknown'}, Variables: ${template.variable_counts || 0}` : '',
								// Store template_id and variable_counts in the value
								value: JSON.stringify({
									template_id: template.template_id || template.id,
									variable_counts: template.variable_counts || 0,
									template_formate: template.template_formate,
									components: template.components,
								})
							});
						}
					} else {
						// Fallback if no templates found
						returnData.push({
							name: 'No templates found',
							value: 'notfound',
							description: 'No templates were found for this user',
						});
					}
				} catch (error) {
					// If loading templates fails, provide an error message
					returnData.push({
						name: `Error: ${error.message}`,
						value: 'error',
						description: 'Failed to load templates',
					});
				}

				return returnData;
			},

			async getWhatsAppNumbers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				try {
					// Get WhatsApp numbers
					const numbersOptions: IHttpRequestOptions = {
						method: 'GET',
						baseURL: BASE_URLS.VALIDATION,
						url: `/get-whatsable-numbers`,
						headers: {
							'Accept': 'application/json',
						},
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'whatsAbleApi',
						numbersOptions,
					);

					// Process numbers from response
					if (Array.isArray(response)) {
						for (const number of response) {
							if (number.phone_number) {
								returnData.push({
									name: number.phone_number,
									value: number.phone_number,
									description: 'WhatsApp number',
								});
							}
						}
					} else {
						returnData.push({
							name: 'No numbers found',
							value: 'notfound',
							description: 'No WhatsApp numbers were found for this user',
						});
					}
				} catch (error) {
					returnData.push({
						name: `Error: ${error.message}`,
						value: 'error',
						description: 'Failed to load WhatsApp numbers',
					});
				}

				return returnData;
			},

			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				try {
					// Get labels
					const labelsOptions: IHttpRequestOptions = {
						method: 'GET',
						baseURL: BASE_URLS.NOTIFYER,
						url: `/n8n/label`,
						headers: {
							'Accept': 'application/json',
						},
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'whatsAbleApi',
						labelsOptions,
					);

					// Process labels from response
					if (Array.isArray(response)) {
						for (const label of response) {
							if (label.label) {
								returnData.push({
									name: label.label,
									value: label.label,
									description: 'Label',
								});
							}
						}
					} else {
						returnData.push({
							name: 'No labels found',
							value: 'notfound',
							description: 'No labels were found for this user',
						});
					}
				} catch (error) {
					returnData.push({
						name: `Error: ${error.message}`,
						value: 'error',
						description: 'Failed to load labels',
					});
				}

				return returnData;
			},
		},
		resourceMapping: {
			getTemplateVariables,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		let validationSuccessful: boolean;
		let validationMessage: string;

		try {
			const validationOptions: IHttpRequestOptions = {
				method: 'GET',
				baseURL: BASE_URLS.VALIDATION,
				url: `/check-api-key-across-projects`,
				headers: {
					'Accept': 'application/json',
				},
			};

			const validationResponse = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'whatsAbleApi',
				validationOptions,
			);

			validationSuccessful = validationResponse.success;
			validationMessage = validationResponse.message;

			if (!validationSuccessful) {
				throw new NodeApiError(this.getNode(), { message: `API key validation failed: ${validationMessage}` });
			}

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `API key validation failed: ${error.message}`);
		}

		// Process each item
		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				let response;
				if (operation === 'sendMessage') {
					// For notifier product
					const recipient = this.getNodeParameter('recipient', i) as string;
					const message = this.getNodeParameter('message', i) as string;
					const attachment = this.getNodeParameter('attachment', i, '') as string;
					const filename = this.getNodeParameter('filename', i, '') as string;

					const options: IHttpRequestOptions = {
						method: 'POST',
						baseURL: BASE_URLS.NOTIFIER,
						url: '/n8n/send-message',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json',
						},
						body: {
							phone: recipient,
							text: message,
							attachment: attachment,
							filename: filename,
						},
					};

					response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'whatsAbleApi',
						options,
					);
				} else if (operation === 'sendNotifyerTemplate') {
					// For notifyer product - template sending
					const recipient = this.getNodeParameter('notifyerRecipient', i) as string;
					const templateId = this.getNodeParameter('notifyerTemplate', i) as string;
					const variablesObj = this.getNodeParameter('notifyerVariables', i) as { value: Record<string, string> };
					const scheduleMessage = this.getNodeParameter('scheduleTemplateMessage', i, false) as boolean;
					const note = this.getNodeParameter('templateNote', i, '') as string;
					const labels = this.getNodeParameter('templateLabels', i, []) as string[];

					// Get template data to validate variable counts
					const templateData = JSON.parse(templateId);

					// Convert ResourceMapper value to variables object with correct format based on template structure
					const variables: Record<string, string> = {};
					
					// Parse the template structure to understand variable mapping
					const templateComponents = templateData.components.components;
					
					// Check for media header
					const hasMediaHeader = templateComponents.some((c: any) => c.type === 'HEADER' && c.format !== 'TEXT');
					
					// Check for URL button
					const hasUrlButton = templateComponents.some((c: any) => 
						c.type === 'BUTTONS' && c.buttons && c.buttons.some((b: any) => b.type === 'URL')
					);
					
					// Map variables based on template structure
					Object.entries(variablesObj.value).forEach(([key, value]) => {
						if (key === 'media' && hasMediaHeader) {
							variables['media'] = value;
						} else if (key === 'visit_website' && hasUrlButton) {
							variables['visit_website'] = value;
						} else if (key.startsWith('body')) {
							// For body variables, keep the bodyN format
							variables[key] = value;
						}
					});

					// Use different API endpoints and data structures based on whether scheduling is enabled
					if (scheduleMessage) {
						// For scheduled template messages, use the schedule API
						const scheduledDateTime = this.getNodeParameter('templateScheduledDateTime', i) as string;
						const timezone = this.getNodeParameter('templateTimezone', i) as string;
						
						// Format the date with milliseconds and Z suffix
						const formattedDate = new Date(scheduledDateTime).toISOString();
						
						// Prepare request body for scheduled message in the specified format
						const scheduleRequestBody = {
							template: templateData.template_id,
							time_zone: timezone,
							variables: variables,
							is_schedule: true,
							phone_number: recipient,
							schedule_datetime_date: formattedDate,
							note: note,
							labels: labels,
						};

						const options: IHttpRequestOptions = {
							method: 'POST',
							baseURL: BASE_URLS.NOTIFYER,
							url: '/n8n/send-message',
							headers: {
								'Content-Type': 'application/json',
								'Accept': 'application/json',
							},
							body: scheduleRequestBody,
						};

						response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'whatsAbleApi',
							options,
						);
					} else {
						const requestBody = {
							// user_id: userId,
							template: templateData.template_id,
							variables: variables,
							phone_number: recipient,
							note: note,
							labels: labels,
						};

						const options: IHttpRequestOptions = {
							method: 'POST',
							baseURL: BASE_URLS.NOTIFYER,
							url: '/n8n/send-message',
							headers: {
								'Content-Type': 'application/json',
								'Accept': 'application/json',
							},
							body: requestBody,
						};

						response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'whatsAbleApi',
							options,
						);
					}
				} else if (operation === 'sendNonTemplateMessage') {
					// For notifyer product - non-template message sending
					const recipient = this.getNodeParameter('nonTemplateRecipient', i) as string;
					const messageType = this.getNodeParameter('messageType', i) as string;
					const scheduleMessage = this.getNodeParameter('scheduleNonTemplateMessage', i, false) as boolean;
					const labels = this.getNodeParameter('nonTemplateLabels', i, []) as string[];
					
					// Common scheduling properties for all message types
					let scheduledTime = '';
					let timezone = '';
					if (scheduleMessage) {
						scheduledTime = this.getNodeParameter('nonTemplateScheduledDateTime', i) as string;
						timezone = this.getNodeParameter('nonTemplateTimezone', i) as string;
						// Format the date with milliseconds and Z suffix
						scheduledTime = new Date(scheduledTime).toISOString();
					}
					
					// Handle different message types
					if (messageType === 'text') {
						const messageContent = this.getNodeParameter('messageContent', i) as string;
						const enableLinkPreview = this.getNodeParameter('enableLinkPreview', i, false) as boolean;
						
						if (scheduleMessage) {
							const scheduleRequestBody = {
								to: recipient,
								text: {
									body: messageContent,
									preview_url: enableLinkPreview
								},
								type: "text",
								time_zone: timezone,
								is_schedule: true,
								recipient_type: "individual",
								messaging_product: "whatsapp",
								schedule_datetime_date: scheduledTime,
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: scheduleRequestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						} else {
							const requestBody: Record<string, any> = {
								to: recipient,
								text: {
									body: messageContent,
									preview_url: enableLinkPreview
								},
								type: "text",
								recipient_type: "individual",
								messaging_product: "whatsapp",
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: requestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						}
					} else if (messageType === 'document') {
						const documentUrl = this.getNodeParameter('documentUrl', i) as string;
						const documentCaption = this.getNodeParameter('documentCaption', i, '') as string;
						const documentFilename = this.getNodeParameter('documentFilename', i) as string;
						
						if (scheduleMessage) {
							const scheduleRequestBody = {
								to: recipient,
								document: {
									link: documentUrl,
									caption: documentCaption,
									filename: documentFilename
								},
								type: "document",
								time_zone: timezone,
								is_schedule: true,
								recipient_type: "individual",
								messaging_product: "whatsapp",
								schedule_datetime_date: scheduledTime,
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: scheduleRequestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						} else {
							const requestBody: Record<string, any> = {
								to: recipient,
								type: "document",
								document: {
									link: documentUrl,
									caption: documentCaption,
									filename: documentFilename
								},
								recipient_type: "individual",
								messaging_product: "whatsapp",
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: requestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						}
					} else if (messageType === 'image') {
						const imageUrl = this.getNodeParameter('imageUrl', i) as string;
						const imageCaption = this.getNodeParameter('imageCaption', i, '') as string;
						
						if (scheduleMessage) {
							const scheduleRequestBody = {
								to: recipient,
								image: {
									link: imageUrl,
									caption: imageCaption
								},
								type: "image",
								time_zone: timezone,
								is_schedule: true,
								recipient_type: "individual",
								messaging_product: "whatsapp",
								schedule_datetime_date: scheduledTime,
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: scheduleRequestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						} else {
							const requestBody: Record<string, any> = {
								to: recipient,
								type: "image",
								image: {
									link: imageUrl,
									caption: imageCaption
								},
								recipient_type: "individual",
								messaging_product: "whatsapp",
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: requestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						}
						
					} else if (messageType === 'video') {
						const videoUrl = this.getNodeParameter('videoUrl', i) as string;
						const videoCaption = this.getNodeParameter('videoCaption', i, '') as string;
						
						if (scheduleMessage) {
							const scheduleRequestBody = {
								to: recipient,
								video: {
									link: videoUrl,
									caption: videoCaption
								},
								type: "video",
								time_zone: timezone,
								is_schedule: true,
								recipient_type: "individual",
								messaging_product: "whatsapp",
								schedule_datetime_date: scheduledTime,
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: scheduleRequestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						} else {
							
							const requestBody: Record<string, any> = {
								to: recipient,
								type: "video",
								video: {
									link: videoUrl,
									caption: videoCaption
								},
								recipient_type: "individual",
								messaging_product: "whatsapp",
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: requestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						}
						
						
					} else if (messageType === 'audio') {
						const audioUrl = this.getNodeParameter('audioUrl', i) as string;
						
						if (scheduleMessage) {
							
							const scheduleRequestBody = {
								to: recipient,
								audio: {
									link: audioUrl
								},
								type: "audio",
								time_zone: timezone,
								is_schedule: true,
								recipient_type: "individual",
								messaging_product: "whatsapp",
								schedule_datetime_date: scheduledTime,
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: scheduleRequestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						} else {
							
							const requestBody: Record<string, any> = {
								to: recipient,
								type: "audio",
								audio: {
									link: audioUrl
								},
								recipient_type: "individual",
								messaging_product: "whatsapp",
								labels: labels,
							};
							
							const options: IHttpRequestOptions = {
								method: 'POST',
								baseURL: BASE_URLS.NOTIFYER,
								url: '/n8n/general/send-message',
								headers: {
									'Content-Type': 'application/json',
									'Accept': 'application/json',
								},
								body: requestBody,
								returnFullResponse: true,
							};

							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						}
						
						
					}
				} else if (operation === 'sendWhatsableMessage') {
					// For whatsable product
					const to = this.getNodeParameter('whatsableTo', i) as string;
					const text = this.getNodeParameter('whatsableText', i) as string;
					const attachment = this.getNodeParameter('whatsableAttachment', i, '') as string;
					const filename = this.getNodeParameter('whatsableFilename', i, '') as string;

					const options: IHttpRequestOptions = {
						method: 'POST',
						baseURL: BASE_URLS.WHATSABLE,
						url: '/whatsable-send-message',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json',
						},
						body: {
							to: to,
							text: text,
							attachment: attachment,
							filename: filename,
						},
					};

					response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'whatsAbleApi',
						options,
					);
				} else {
					throw new NodeOperationError(this.getNode(), `Operation ${operation} is not supported`);
				}

				returnData.push({
					json: response || { success: false, message: 'Operation not implemented' },
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

export async function getTemplateVariables(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const returnData: ResourceMapperFields = {
		fields: [],
	};

	try {
		// Get the selected template value
		const templateValue = this.getNodeParameter('notifyerTemplate') as string;
		if (!templateValue || templateValue === 'notfound' || templateValue === 'error') {
			return returnData;
		}

		// Parse the template value to get variable_counts
		const templateData = JSON.parse(templateValue);

		// Find the BODY component and count only its variables
		const bodyComponent = templateData.components.components.find((c: any) => c.type === 'BODY');
		let bodyVariableCount = 0;
		
		if (bodyComponent && bodyComponent.text) {
			// Count variables in body text ({{1}}, {{2}}, etc.)
			const variableMatches = bodyComponent.text.match(/\{\{\d+\}\}/g) || [];
			bodyVariableCount = variableMatches.length;
		}
		
		// Create body fields ONLY for body text variables
		for (let i = 1; i <= bodyVariableCount; i++) {
			let exampleText = `Variable ${i}`;
			
			// Try to get example from body component
			if (bodyComponent && bodyComponent.example && bodyComponent.example.body_text && bodyComponent.example.body_text[0] && bodyComponent.example.body_text[0][i - 1]) {
				exampleText = bodyComponent.example.body_text[0][i - 1];
			}
			
			returnData.fields.push({
				id: `body${i}`,
				displayName: `Body ${i}. Example: ${exampleText}`,
				defaultMatch: true,
				canBeUsedToMatch: true,
				required: true,
				display: true,
				type: 'string'
			});
		}
		
		// Handle URL buttons separately 
		templateData.components.components.forEach((component: any) => {
			if (component.type === 'BUTTONS') {
				const urlButton = component.buttons && component.buttons.find((button: any) => button.type === 'URL');
				
				if (urlButton && urlButton.url && urlButton.url.includes('{{')) {
					// Only add visit_website if URL has variables (dynamic URL)
					let exampleUrl = urlButton.url.replace(/\{\{\d+\}\}/g, 'your-value');
					
					returnData.fields.push({
						id: "visit_website",
						displayName: `Visit Website URL. Example: ${exampleUrl}`,
						defaultMatch: true,
						canBeUsedToMatch: true,
						required: true,
						display: true,
						type: 'string'
					});
				}
			}
		});
		
		// Handle media headers separately
		templateData.components.components.forEach((component: any) => {
			if (component.type === 'HEADER' && component.format !== 'TEXT') {
				returnData.fields.push({
					id: "media",
					displayName: `Media (${component.format}). Example: Enter media URL`,
					defaultMatch: true,
					canBeUsedToMatch: true,
					required: true,
					display: true,
					type: 'string'
				});
			}
		});

	} catch (error) {
		// If parsing fails, return empty fields
		return returnData;
	}

	return returnData;
}