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
import { BASE_DOMAIN,  WHATSABLE_DASHBOARD_BASE_DOMAIN } from '../../shared/constants';

const BASE_URLS = {
	VALIDATION: `${BASE_DOMAIN}/api:gncnl2D6`,
	NOTIFIER: `${BASE_DOMAIN}/api:gncnl2D6`,
	NOTIFYER: `${BASE_DOMAIN}/api:ErOQ8pSj`,
	WHATSABLE: `${BASE_DOMAIN}/api:gncnl2D6`,
} as const;

export class WhatsAble implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsAble',
		name: 'whatsAble',
		icon: 'file:whatsable.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] || "Configure WhatsApp messaging"}}',
		description: 'Send & Schedule WhatsApp messages using the official WhatsApp API and have human/AI collaboration',
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
						name: 'Send WhatsApp Message',
						value: 'sendWhatsAppMessage',
						description: 'Send WhatsApp messages immediately',
						action: 'Send whatsapp message',
					},
					{
						name: 'Schedule WhatsApp Message',
						value: 'scheduleWhatsAppMessage',
						description: 'Schedule WhatsApp messages for later delivery',
						action: 'Schedule whatsapp message',
					},
					{
						name: 'Send WhatsApp Message to a Group',
						value: 'sendWhatsAppMessageToGroup',
						description: 'Send WhatsApp messages to a group',
						action: 'Send whatsapp message to a group',
					},
				],
				default: 'sendWhatsAppMessage',
				required: true,
			},
			{
				displayName: 'Product Operation Name or ID',
				name: 'productOperation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage', 'sendWhatsAppMessageToGroup'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getProductOperations',
				},
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: '',
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
						operation: ['sendWhatsAppMessage'],
						productOperation: ['sendMessage'],
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
						operation: ['sendWhatsAppMessage'],
						productOperation: ['sendMessage'],
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
						operation: ['sendWhatsAppMessage'],
						productOperation: ['sendMessage'],
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
						operation: ['sendWhatsAppMessage'],
						productOperation: ['sendMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
			},

			{
				displayName: 'Scheduled Date and Time',
				name: 'templateScheduledDateTime',
				type: 'dateTime',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate'],
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
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate'],
					},
				},
				options: WHATSAPP_TIMEZONES,
				default: '',
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
						operation: ['sendWhatsAppMessage'],
						productOperation: ['sendWhatsableMessage'],
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
						operation: ['sendWhatsAppMessage'],
						productOperation: ['sendWhatsableMessage'],
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
						operation: ['sendWhatsAppMessage'],
						productOperation: ['sendWhatsableMessage'],
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
						operation: ['sendWhatsAppMessage'],
						productOperation: ['sendWhatsableMessage'],
					},
				},
				description: 'Filename for the attachment',
				default: '',
			},

			// Fields for whatsable product - Send Group Message
			{
				displayName: 'Group Name or ID',
				name: 'whatsableGroup',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessageToGroup'],
						productOperation: ['sendWhatsableGroupMessage'],
					},
				},
				description: 'Select a group to send message to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				default: '',
			},
			{
				displayName: 'Message',
				name: 'whatsableGroupMessage',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessageToGroup'],
						productOperation: ['sendWhatsableGroupMessage'],
					},
				},
				description: 'Message text content',
				typeOptions: {
					rows: 4,
				},
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
			},

			{
				displayName: 'Scheduled Date and Time',
				name: 'nonTemplateScheduledDateTime',
				type: 'dateTime',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
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
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
					},
				},
				options: WHATSAPP_TIMEZONES,
				default: '',
				description: 'Timezone for the scheduled date and time',
			},

			// Fields for notifyer product - Update Contact
			{
				displayName: 'Phone Number Name or ID',
				name: 'updateContactPhoneNumber',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPhoneNumbers',
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage'],
						productOperation: ['updateContact'],
					},
				},
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				default: '',
			},
			{
				displayName: 'Add a Note',
				name: 'updateContactNote',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage'],
						productOperation: ['updateContact'],
					},
				},
				description: 'Optional note to add to the contact',
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName: 'Add or Remove Labels',
				name: 'updateContactLabels',
				type: 'multiOptions',
				default: [],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage'],
						productOperation: ['updateContact'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabelsForUpdateContact',
				},
			},
			{
				displayName: 'Select Labels to Remove',
				name: 'selectRemoveLabels',
				type: 'multiOptions',
				default: [],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage'],
						productOperation: ['updateContact'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
			},

			// Condition fields for scheduled messages
			{
				displayName: 'Enable Conditions',
				name: 'enableConditions',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
					},
				},
				description: 'Whether to enable conditions to control when the scheduled message should be sent',
			},
			{
				displayName: 'Scheduled Message Rules (Conversation-Based)',
				name: 'conditions',
				type: 'fixedCollection',
				default: { values: [{}] },
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						enableConditions: [true],
					},
				},
				description: 'Set conditions to automatically send follow-up messages only when specific criteria are met. The system checks these conditions right before sending to ensure messages are relevant and timely.',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Condition',
				},
				options: [
					{
						displayName: 'Condition',
						name: 'values',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'options',
								default: 'system_user_last_message_time',
								options: [
									{
										name: 'Bot Last Message Time',
										value: 'system_user_last_message_time',
									},
									{
										name: 'Conversation Paragraph',
										value: 'convo_para',
									},
									{
										name: 'If Person Did Not Reply Anything',
										value: 'no_reply',
									},
									{
										name: 'If Person Did Not Send Any Message In The Last 24h',
										value: 'no_msg_24h',
									},
									{
										name: 'If Person Replied',
										value: 'person_replied',
									},
									{
										name: 'Last Message Of Bot',
										value: 'system_user_last_message',
									},
									{
										name: 'Last Message Of User',
										value: 'recipient_last_message',
									},
									{
										name: 'Phone Number',
										value: 'phone_number',
									},
									{
										name: 'User Last Message Time',
										value: 'user_last_message_time',
									},
								],
								description: 'Select the field to evaluate',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 'text:equal',
								options: [
									{
										name: 'Array : Contains',
										value: 'array:contains',
									},
									{
										name: 'Array : Contains (Ignore Case)',
										value: 'array:contains:ci',
									},
									{
										name: 'Array : Length Equals',
										value: 'array:lengthequal',
									},
									{
										name: 'Array : Length Greater Than',
										value: 'array:lengthgreater',
									},
									{
										name: 'Array : Length Greater Than or Equal',
										value: 'array:lengthgreaterequal',
									},
									{
										name: 'Array : Length Less Than',
										value: 'array:lengthless',
									},
									{
										name: 'Array : Length Less Than or Equal',
										value: 'array:lengthlessequal',
									},
									{
										name: 'Array : Length Not Equals',
										value: 'array:lengthnotequal',
									},
									{
										name: 'Array : Not Contains',
										value: 'array:notcontains',
									},
									{
										name: 'Array : Not Contains (Ignore Case)',
										value: 'array:notcontains:ci',
									},
									{
										name: 'Boolean : Equals',
										value: 'boolean:equal',
									},
									{
										name: 'Boolean : Not Equals',
										value: 'boolean:notequal',
									},
									{
										name: 'DateTime : Earlier Than',
										value: 'datetime:earlier',
									},
									{
										name: 'DateTime : Earlier Than or Equal',
										value: 'datetime:earlierequal',
									},
									{
										name: 'DateTime : Equals',
										value: 'datetime:equal',
									},
									{
										name: 'DateTime : Later Than',
										value: 'datetime:later',
									},
									{
										name: 'DateTime : Later Than or Equal',
										value: 'datetime:laterequal',
									},
									{
										name: 'DateTime : Not Equals',
										value: 'datetime:notequal',
									},
									{
										name: 'Exists',
										value: 'basic:exists',
									},
									{
										name: 'Not Exists',
										value: 'basic:notexists',
									},
									{
										name: 'Numeric : Equals',
										value: 'numeric:equal',
									},
									{
										name: 'Numeric : Greater Than',
										value: 'numeric:greater',
									},
									{
										name: 'Numeric : Greater Than or Equal',
										value: 'numeric:greaterequal',
									},
									{
										name: 'Numeric : Less Than',
										value: 'numeric:less',
									},
									{
										name: 'Numeric : Less Than or Equal',
										value: 'numeric:lessequal',
									},
									{
										name: 'Numeric : Not Equals',
										value: 'numeric:notequal',
									},
									{
										name: 'Text : Contains',
										value: 'text:contain',
									},
									{
										name: 'Text : Contains (Ignore Case)',
										value: 'text:contain:ci',
									},
									{
										name: 'Text : Does Not Contain',
										value: 'text:notcontain',
									},
									{
										name: 'Text : Ends With',
										value: 'text:endwith',
									},
									{
										name: 'Text : Ends With (Ignore Case)',
										value: 'text:endwith:ci',
									},
									{
										name: 'Text : Equals',
										value: 'text:equal',
									},
									{
										name: 'Text : Equals (Ignore Case)',
										value: 'text:equal:ci',
									},
									{
										name: 'Text : Matches Pattern',
										value: 'text:matchpattern',
									},
									{
										name: 'Text : Matches Pattern (Ignore Case)',
										value: 'text:matchpattern:ci',
									},
									{
										name: 'Text : Not Ends With',
										value: 'text:notendwith',
									},
									{
										name: 'Text : Not Ends With (Ignore Case)',
										value: 'text:notendwith:ci',
									},
									{
										name: 'Text : Not Equals',
										value: 'text:notequal',
									},
									{
										name: 'Text : Not Equals (Ignore Case)',
										value: 'text:notequal:ci',
									},
									{
										name: 'Text : Not Matches Pattern',
										value: 'text:notmatchpattern',
									},
									{
										name: 'Text : Not Matches Pattern (Ignore Case)',
										value: 'text:notmatchpattern:ci',
									},
									{
										name: 'Text : Not Starts With',
										value: 'text:notstartwith',
									},
									{
										name: 'Text : Not Starts With (Ignore Case)',
										value: 'text:notstartwith:ci',
									},
									{
										name: 'Text : Starts With',
										value: 'text:startwith',
									},
									{
										name: 'Text : Starts With (Ignore Case)',
										value: 'text:startwith:ci',
									},
									{
										name: 'Time : Equals',
										value: 'time:equal',
									},
									{
										name: 'Time : Greater Than',
										value: 'time:greater',
									},
									{
										name: 'Time : Greater Than or Equal',
										value: 'time:greaterequal',
									},
									{
										name: 'Time : Less Than',
										value: 'time:less',
									},
									{
										name: 'Time : Less Than or Equal',
										value: 'time:lessequal',
									},
									{
										name: 'Time : Not Equals',
										value: 'time:notequal',
									},
								],
								description: 'Select the comparison operator',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								displayOptions: {
									hide: {
										operator: ['basic:exists', 'basic:notexists'],
									},
								},
								description: 'Enter the value to compare against',
								placeholder: 'Enter comparison value',
							},
							{
								displayName: 'Operator Type',
								name: 'operatorType',
								type: 'options',
								default: 'AND',
								options: [
									{
										name: 'AND',
										value: 'AND',
									},
									{
										name: 'OR',
										value: 'OR',
									},
								],
								description: 'Logical operator to combine with the next condition',
							},
						],
					},
				],
			},
			{
				displayName: 'Scheduled Message Rules (Integration-Based)',
				name: 'conditions2',
				type: 'fixedCollection',
				default: { values: [{}] },
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						enableConditions: [true],
					},
				},
				description: 'Define integration-based conditions for message scheduling',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Condition',
				},
				options: [
					{
						displayName: 'Condition',
						name: 'values',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								description: 'Enter the field name to evaluate',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 'text:equal',
								options: [
									{
										name: 'Array : Contains',
										value: 'array:contains',
									},
									{
										name: 'Array : Contains (Ignore Case)',
										value: 'array:contains:ci',
									},
									{
										name: 'Array : Length Equals',
										value: 'array:lengthequal',
									},
									{
										name: 'Array : Length Greater Than',
										value: 'array:lengthgreater',
									},
									{
										name: 'Array : Length Greater Than or Equal',
										value: 'array:lengthgreaterequal',
									},
									{
										name: 'Array : Length Less Than',
										value: 'array:lengthless',
									},
									{
										name: 'Array : Length Less Than or Equal',
										value: 'array:lengthlessequal',
									},
									{
										name: 'Array : Length Not Equals',
										value: 'array:lengthnotequal',
									},
									{
										name: 'Array : Not Contains',
										value: 'array:notcontains',
									},
									{
										name: 'Array : Not Contains (Ignore Case)',
										value: 'array:notcontains:ci',
									},
									{
										name: 'Boolean : Equals',
										value: 'boolean:equal',
									},
									{
										name: 'Boolean : Not Equals',
										value: 'boolean:notequal',
									},
									{
										name: 'DateTime : Earlier Than',
										value: 'datetime:earlier',
									},
									{
										name: 'DateTime : Earlier Than or Equal',
										value: 'datetime:earlierequal',
									},
									{
										name: 'DateTime : Equals',
										value: 'datetime:equal',
									},
									{
										name: 'DateTime : Later Than',
										value: 'datetime:later',
									},
									{
										name: 'DateTime : Later Than or Equal',
										value: 'datetime:laterequal',
									},
									{
										name: 'DateTime : Not Equals',
										value: 'datetime:notequal',
									},
									{
										name: 'Exists',
										value: 'basic:exists',
									},
									{
										name: 'Not Exists',
										value: 'basic:notexists',
									},
									{
										name: 'Numeric : Equals',
										value: 'numeric:equal',
									},
									{
										name: 'Numeric : Greater Than',
										value: 'numeric:greater',
									},
									{
										name: 'Numeric : Greater Than or Equal',
										value: 'numeric:greaterequal',
									},
									{
										name: 'Numeric : Less Than',
										value: 'numeric:less',
									},
									{
										name: 'Numeric : Less Than or Equal',
										value: 'numeric:lessequal',
									},
									{
										name: 'Numeric : Not Equals',
										value: 'numeric:notequal',
									},
									{
										name: 'Text : Contains',
										value: 'text:contain',
									},
									{
										name: 'Text : Contains (Ignore Case)',
										value: 'text:contain:ci',
									},
									{
										name: 'Text : Does Not Contain',
										value: 'text:notcontain',
									},
									{
										name: 'Text : Ends With',
										value: 'text:endwith',
									},
									{
										name: 'Text : Ends With (Ignore Case)',
										value: 'text:endwith:ci',
									},
									{
										name: 'Text : Equals',
										value: 'text:equal',
									},
									{
										name: 'Text : Equals (Ignore Case)',
										value: 'text:equal:ci',
									},
									{
										name: 'Text : Matches Pattern',
										value: 'text:matchpattern',
									},
									{
										name: 'Text : Matches Pattern (Ignore Case)',
										value: 'text:matchpattern:ci',
									},
									{
										name: 'Text : Not Ends With',
										value: 'text:notendwith',
									},
									{
										name: 'Text : Not Ends With (Ignore Case)',
										value: 'text:notendwith:ci',
									},
									{
										name: 'Text : Not Equals',
										value: 'text:notequal',
									},
									{
										name: 'Text : Not Equals (Ignore Case)',
										value: 'text:notequal:ci',
									},
									{
										name: 'Text : Not Matches Pattern',
										value: 'text:notmatchpattern',
									},
									{
										name: 'Text : Not Matches Pattern (Ignore Case)',
										value: 'text:notmatchpattern:ci',
									},
									{
										name: 'Text : Not Starts With',
										value: 'text:notstartwith',
									},
									{
										name: 'Text : Not Starts With (Ignore Case)',
										value: 'text:notstartwith:ci',
									},
									{
										name: 'Text : Starts With',
										value: 'text:startwith',
									},
									{
										name: 'Text : Starts With (Ignore Case)',
										value: 'text:startwith:ci',
									},
									{
										name: 'Time : Equals',
										value: 'time:equal',
									},
									{
										name: 'Time : Greater Than',
										value: 'time:greater',
									},
									{
										name: 'Time : Greater Than or Equal',
										value: 'time:greaterequal',
									},
									{
										name: 'Time : Less Than',
										value: 'time:less',
									},
									{
										name: 'Time : Less Than or Equal',
										value: 'time:lessequal',
									},
									{
										name: 'Time : Not Equals',
										value: 'time:notequal',
									},
								],
								description: 'Select the comparison operator',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								displayOptions: {
									hide: {
										operator: ['basic:exists', 'basic:notexists'],
									},
								},
								description: 'Enter the value to compare against',
								placeholder: 'Enter comparison value',
							},
							{
								displayName: 'Operator Type',
								name: 'operatorType',
								type: 'options',
								default: 'AND',
								options: [
									{
										name: 'AND',
										value: 'AND',
									},
									{
										name: 'OR',
										value: 'OR',
									},
								],
								description: 'Logical operator to combine with the next condition',
							},
						],
					},
				],
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

			async getProductOperations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				try {
					const validationOptions: IHttpRequestOptions = {
						method: 'GET',
						baseURL: BASE_URLS.VALIDATION,
						url: `/check-api-key-across-projects`,
						headers: {
							'Accept': 'application/json',
						},
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'whatsAbleApi',
						validationOptions,
					);

					if (response.success === true && response.product) {
						const product = response.product;

						const currentOperation = this.getNodeParameter('operation') as string;

						switch (product) {
							case 'whatsable':
								if (currentOperation === 'sendWhatsAppMessage') {
									returnData.push({
										name: 'Send Message Via Whatsable',
										value: 'sendWhatsableMessage',
										description: 'Send WhatsApp messages via WhatsAble platform',
										action: 'Send message via whatsable',
									});
								} else if (currentOperation === 'sendWhatsAppMessageToGroup') {
									returnData.push({
										name: 'Send WhatsApp message to a group via whatsable',
										value: 'sendWhatsableGroupMessage',
										description: 'Send WhatsApp messages to a group',
										action: 'Send WhatsApp message to a group',
									});
								}
								break;
							case 'notifier':
								if (currentOperation === 'sendWhatsAppMessage') {
									returnData.push({
										name: 'Send Message Via Notifier',
										value: 'sendMessage',
										description: 'Send WhatsApp messages with optional attachments',
										action: 'Send message via notifier',
									});
								}
								break;
							case 'notifyer':
								if (currentOperation === 'sendWhatsAppMessage') {
									returnData.push({
										name: 'Send Template Via Notifyer',
										value: 'sendNotifyerTemplate',
										description: 'Send template-based WhatsApp messages',
										action: 'Send template via notifyer',
									});
									returnData.push({
										name: 'Send Non Template Via Notifyer',
										value: 'sendNonTemplateMessage',
										description: 'Send non-template WhatsApp messages',
										action: 'Send non template via notifyer',
									});
									returnData.push({
										name: 'Update Contact',
										value: 'updateContact',
										description: 'Update contact details',
										action: 'Update contact',
									});
								} else if (currentOperation === 'scheduleWhatsAppMessage') {
									returnData.push({
										name: 'Send Template Via Notifyer',
										value: 'sendNotifyerTemplate',
										description: 'Schedule template-based WhatsApp messages',
										action: 'Schedule template via notifyer',
									});
									returnData.push({
										name: 'Send Non Template Via Notifyer',
										value: 'sendNonTemplateMessage',
										description: 'Schedule non-template WhatsApp messages',
										action: 'Schedule non template via notifyer',
									});
								}
								break;
							default:
								// Fallback for unknown product types
								returnData.push({
									name: 'Unknown Product Type',
									value: 'unknown',
									description: 'Product type not recognized',
								});
						}
					} else {
						// Fallback if API call fails or product type not available
						returnData.push({
							name: 'Error: Could not determine product type',
							value: 'error',
							description: 'Failed to load product operations',
						});
					}
				} catch (error) {
					returnData.push({
						name: `Error: ${error.message}`,
						value: 'error',
						description: 'Failed to load product operations',
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

			async getLabelsForUpdateContact(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				// Add "Remove All" option first
				returnData.push({
					name: 'Remove All',
					value: '__REMOVE_ALL__',
					description: 'Remove all labels from the contact',
				});

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
					}
				} catch (error) {
					// If loading labels fails, still keep "Remove All" option
				}

				return returnData;
			},

			async getPhoneNumbers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				try {
					// Get phone numbers
					const phoneNumbersOptions: IHttpRequestOptions = {
						method: 'GET',
						baseURL: BASE_URLS.NOTIFYER,
						url: `/n8n/phone/number/list`,
						headers: {
							'Accept': 'application/json',
						},
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'whatsAbleApi',
						phoneNumbersOptions,
					);

					// Process phone numbers from response
					if (Array.isArray(response)) {
						for (const phoneNumber of response) {
							if (phoneNumber.phone_number_value) {
								returnData.push({
									name: phoneNumber.phone_number_label || phoneNumber.phone_number_value,
									value: phoneNumber.phone_number_value,
									description: 'Phone number',
								});
							}
						}
					} else {
						returnData.push({
							name: 'No phone numbers found',
							value: 'notfound',
							description: 'No phone numbers were found for this user',
						});
					}
				} catch (error) {
					returnData.push({
						name: `Error: ${error.message}`,
						value: 'error',
						description: 'Failed to load phone numbers',
					});
				}

				return returnData;
			},

			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				try {
					// Get groups from WhatsAble dashboard API
					const groupsOptions: IHttpRequestOptions = {
						method: 'GET',
						baseURL: WHATSABLE_DASHBOARD_BASE_DOMAIN,
						url: `/api/groups/automation/groups`,
						headers: {
							'Accept': 'application/json',
						},
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'whatsAbleApi',
						groupsOptions,
					);

					// Process groups from response
					if (response.groups && Array.isArray(response.groups)) {
						for (const group of response.groups) {
							if (group.label_name && group.value_for) {
								returnData.push({
									name: group.label_name,
									value: JSON.stringify({
										group_id: group.value_for,
										session_id: group.session_id,
									}),
									description: `Group ID: ${group.value_for}`,
								});
							}
						}
					} else {
						returnData.push({
							name: 'No groups found',
							value: 'notfound',
							description: 'No groups were found for this user',
						});
					}
				} catch (error) {
					returnData.push({
						name: `Error: ${error.message}`,
						value: 'error',
						description: 'Failed to load groups',
					});
				}

				return returnData;
			},
		},
		resourceMapping: {
			getTemplateVariables,
		},
	};

	// Helper function to build condition payload structure
	private static buildConditionPayload(conditions: any[]): any[][] {
		if (!conditions || conditions.length === 0) {
			return [[], []]; // [AND array, OR array]
		}

		const andConditions: any[] = [];
		const orConditions: any[] = [];

		for (let i = 0; i < conditions.length; i++) {
			const condition = conditions[i];
			const { field, operator, value } = condition;

			// Skip empty conditions (no field or operator)
			if (!field || !operator) {
				continue;
			}

			// Check if operator needs a value and validate accordingly
			const operatorNeedsValue = operator !== 'basic:exists' && operator !== 'basic:notexists';
			
			// Skip condition if operator needs a value but no value is provided
			if (operatorNeedsValue && (!value || value.trim() === '')) {
				continue;
			}

			// Build condition object with a, o, b structure
			const conditionObj: any = {
				a: field,
				o: operator
			};

			// Add value (b) only if operator needs it and value exists
			if (operatorNeedsValue && value) {
				conditionObj.b = value;
			}

			// Determine which array to put this condition in based on operatorType
			if (i === 0) {
				// First condition always goes to AND array
				andConditions.push(conditionObj);
			} else {
				// Use the logical operator from the PREVIOUS condition
				const prevCondition = conditions[i - 1];
				const prevOperatorType = prevCondition.operatorType || 'AND';
				
				if (prevOperatorType === 'AND') {
					andConditions.push(conditionObj);
				} else {
					orConditions.push(conditionObj);
				}
			}
		}

		return [andConditions, orConditions];
	}


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

				// Check if conditions are enabled and build payload (for both immediate and scheduled)
				const enableConditions = this.getNodeParameter('enableConditions', i, false) as boolean;
				let searchPayload: any = {};
				
				if (enableConditions) {
					// Get both condition blocks
					const conditionsData1 = this.getNodeParameter('conditions', i, { values: [] }) as { values: any[] };
					const conditionsData2 = this.getNodeParameter('conditions2', i, { values: [] }) as { values: any[] };
					const conditions1 = conditionsData1.values || [];
					const conditions2 = conditionsData2.values || [];
					
					// Build search payload structure (swapped: conversation-based becomes search2, integration-based becomes search1)
					if (conditions1.length > 0) {
						const payload1 = WhatsAble.buildConditionPayload(conditions1);
						// Only add if there are actual valid conditions in either AND or OR arrays
						if (payload1[0].length > 0 || payload1[1].length > 0) {
							searchPayload.search2 = payload1; // Conversation-based (conditions) -> search2
						}
					}
					if (conditions2.length > 0) {
						const payload2 = WhatsAble.buildConditionPayload(conditions2);
						// Only add if there are actual valid conditions in either AND or OR arrays
						if (payload2[0].length > 0 || payload2[1].length > 0) {
							searchPayload.search1 = payload2; // Integration-based (conditions2) -> search1
						}
					}
				}

				let response;
				if (operation === 'sendWhatsAppMessage') {
					// Get the product operation to determine which specific operation to perform
					const productOperation = this.getNodeParameter('productOperation', i) as string;

					if (productOperation === 'sendMessage') {
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
							returnFullResponse: true, // This ensures we get the full response including status codes
						};

						try {
							response = await this.helpers.httpRequestWithAuthentication.call(
								this,
								'whatsAbleApi',
								options,
							);
						} catch (error) {
							// Check if this is already a NodeApiError with custom description
							if (error instanceof NodeApiError && error.description) {
								// Create a new NodeApiError with the custom message from the API
								// and add helpful link to Notifier service
								const cleanMessage = `${error.description}`;
								throw new NodeApiError(this.getNode(), { 
									message: cleanMessage 
								});
							}
							
							// Check if the error response contains specific error information
							if (error.response && error.response.body) {
								const errorBody = error.response.body;
								
								// Handle different possible error response structures
								if (errorBody.code === 'ERROR_CODE_ACCESS_DENIED' && errorBody.message) {
									// Extract the error message from the API response
									const errorMessage = `${errorBody.message}`;
									// Throw a NodeApiError with the custom message from the API
									throw new NodeApiError(this.getNode(), { message: errorMessage });
								}
								
								// Handle other structured error responses
								if (errorBody.message && typeof errorBody.message === 'string') {
									const errorMessage = `${errorBody.message}`;
									throw new NodeApiError(this.getNode(), { message: errorMessage });
								}
								
								// Handle JSON string error responses
								if (typeof errorBody === 'string') {
									try {
										const parsedError = JSON.parse(errorBody);
										if (parsedError.code === 'ERROR_CODE_ACCESS_DENIED' && parsedError.message) {
											const errorMessage = `${parsedError.message}`;
											throw new NodeApiError(this.getNode(), { message: errorMessage });
										}
										if (parsedError.message) {
											const errorMessage = `${parsedError.message}`;
											throw new NodeApiError(this.getNode(), { message: errorMessage });
										}
									} catch (parseError) {
										// If parsing fails, continue with original error handling
									}
								}
							}
							
							// For other errors, re-throw the original error
							throw error;
						}
					} else if (productOperation === 'sendNotifyerTemplate') {
						// For notifyer product - template sending
						const recipient = this.getNodeParameter('notifyerRecipient', i) as string;
						const templateId = this.getNodeParameter('notifyerTemplate', i) as string;
						const variablesObj = this.getNodeParameter('notifyerVariables', i) as { value: Record<string, string> };
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

						// Send template message immediately
						const requestBody = {
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
					} else if (productOperation === 'sendNonTemplateMessage') {
						// For notifyer product - non-template message sending
						const recipient = this.getNodeParameter('nonTemplateRecipient', i) as string;
						const messageType = this.getNodeParameter('messageType', i) as string;
						const labels = this.getNodeParameter('nonTemplateLabels', i, []) as string[];
						
						// Handle different message types
						if (messageType === 'text') {
							const messageContent = this.getNodeParameter('messageContent', i) as string;
							const enableLinkPreview = this.getNodeParameter('enableLinkPreview', i, false) as boolean;
							
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
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
						} else if (messageType === 'document') {
							const documentUrl = this.getNodeParameter('documentUrl', i) as string;
							const documentCaption = this.getNodeParameter('documentCaption', i, '') as string;
							const documentFilename = this.getNodeParameter('documentFilename', i) as string;
							
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
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
							
						} else if (messageType === 'image') {
							const imageUrl = this.getNodeParameter('imageUrl', i) as string;
							const imageCaption = this.getNodeParameter('imageCaption', i, '') as string;
							
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
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
							
						} else if (messageType === 'video') {
							const videoUrl = this.getNodeParameter('videoUrl', i) as string;
							const videoCaption = this.getNodeParameter('videoCaption', i, '') as string;
							
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
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
							
						} else if (messageType === 'audio') {
							const audioUrl = this.getNodeParameter('audioUrl', i) as string;
							
							const requestBody: Record<string, any> = {
								to: recipient,
								type: "audio",
								audio: {
									link: audioUrl
								},
								recipient_type: "individual",
								messaging_product: "whatsapp",
								labels: labels,
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
					} else if (productOperation === 'updateContact') {
						// For notifyer product - Update Contact
						const phoneNumber = this.getNodeParameter('updateContactPhoneNumber', i) as string;
						const note = this.getNodeParameter('updateContactNote', i, '') as string;
						const labels = this.getNodeParameter('updateContactLabels', i, []) as string[];
						const selectedRemoveLabels = this.getNodeParameter('selectRemoveLabels', i, []) as string[];

						const requestBody: Record<string, any> = {
							phone_number: phoneNumber,
						};

						// Add note if provided
						if (note) {
							requestBody.note = note;
						}

						if (!labels || labels.length === 0) {
							requestBody.labels = [];
						} else if (labels.includes('__REMOVE_ALL__')) {
							requestBody.labels = ['__REMOVE_ALL__'];
						} else {
							requestBody.labels = labels.filter((label: string) => label !== '__REMOVE_ALL__');
						}

						requestBody.selected_labels = selectedRemoveLabels && selectedRemoveLabels.length > 0 
							? selectedRemoveLabels 
							: [];

						const options: IHttpRequestOptions = {
							method: 'PUT',
							baseURL: BASE_URLS.NOTIFYER,
							url: '/n8n/recipient/details/update',
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
					} else if (productOperation === 'sendWhatsableMessage') {
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
						throw new NodeOperationError(this.getNode(), `Product operation ${productOperation} is not supported`);
					}
				} else if (operation === 'scheduleWhatsAppMessage') {
					// Handle scheduled WhatsApp message operation
					// Get the product operation to determine which specific operation to perform
					const productOperation = this.getNodeParameter('productOperation', i) as string;

					if (productOperation === 'sendNotifyerTemplate') {
						// For notifyer product - scheduled template sending
						const recipient = this.getNodeParameter('notifyerRecipient', i) as string;
						const templateId = this.getNodeParameter('notifyerTemplate', i) as string;
						const variablesObj = this.getNodeParameter('notifyerVariables', i) as { value: Record<string, string> };
						const note = this.getNodeParameter('templateNote', i, '') as string;
						const labels = this.getNodeParameter('templateLabels', i, []) as string[];
						const scheduledDateTime = this.getNodeParameter('templateScheduledDateTime', i) as string;
						const timezone = this.getNodeParameter('templateTimezone', i) as string;

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

						// Format the date with milliseconds and Z suffix
						const formattedDate = new Date(scheduledDateTime).toISOString();
						
						// Prepare request body for scheduled message
						const scheduleRequestBody = {
							template: templateData.template_id,
							time_zone: timezone,
							variables: variables,
							is_schedule: true,
							phone_number: recipient,
							schedule_datetime_date: formattedDate,
							note: note,
							labels: labels,
							...searchPayload, // Add search1 and search2 if conditions are enabled
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
					} else if (productOperation === 'sendNonTemplateMessage') {
						// For notifyer product - scheduled non-template message sending
						const recipient = this.getNodeParameter('nonTemplateRecipient', i) as string;
						const messageType = this.getNodeParameter('messageType', i) as string;
						const labels = this.getNodeParameter('nonTemplateLabels', i, []) as string[];
						const scheduledTime = this.getNodeParameter('nonTemplateScheduledDateTime', i) as string;
						const timezone = this.getNodeParameter('nonTemplateTimezone', i) as string;
						
						// Format the date with milliseconds and Z suffix
						const formattedScheduledTime = new Date(scheduledTime).toISOString();
						
						// Handle different message types
						if (messageType === 'text') {
							const messageContent = this.getNodeParameter('messageContent', i) as string;
							const enableLinkPreview = this.getNodeParameter('enableLinkPreview', i, false) as boolean;
							
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
								schedule_datetime_date: formattedScheduledTime,
								labels: labels,
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
						} else if (messageType === 'document') {
							const documentUrl = this.getNodeParameter('documentUrl', i) as string;
							const documentCaption = this.getNodeParameter('documentCaption', i, '') as string;
							const documentFilename = this.getNodeParameter('documentFilename', i) as string;
							
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
								schedule_datetime_date: formattedScheduledTime,
								labels: labels,
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
						} else if (messageType === 'image') {
							const imageUrl = this.getNodeParameter('imageUrl', i) as string;
							const imageCaption = this.getNodeParameter('imageCaption', i, '') as string;
							
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
								schedule_datetime_date: formattedScheduledTime,
								labels: labels,
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
						} else if (messageType === 'video') {
							const videoUrl = this.getNodeParameter('videoUrl', i) as string;
							const videoCaption = this.getNodeParameter('videoCaption', i, '') as string;
							
							const scheduleRequestBody = {
								to: recipient,
								type: "video",
								video: {
									link: videoUrl,
									caption: videoCaption
								},
								time_zone: timezone,
								is_schedule: true,
								recipient_type: "individual",
								messaging_product: "whatsapp",
								schedule_datetime_date: formattedScheduledTime,
								labels: labels,
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
						} else if (messageType === 'audio') {
							const audioUrl = this.getNodeParameter('audioUrl', i) as string;
							
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
								schedule_datetime_date: formattedScheduledTime,
								labels: labels,
								...searchPayload, // Add search1 and search2 if conditions are enabled
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
						}
					} else {
						throw new NodeOperationError(this.getNode(), `Product operation ${productOperation} is not supported for scheduling`);
					}
				} else if (operation === 'sendWhatsAppMessageToGroup') {
					// Handle send WhatsApp message to group operation
					const productOperation = this.getNodeParameter('productOperation', i) as string;

					if (productOperation === 'sendWhatsableGroupMessage') {
						// For whatsable product - send message to group
						const groupData = this.getNodeParameter('whatsableGroup', i) as string;
						const message = this.getNodeParameter('whatsableGroupMessage', i) as string;

						// Parse group data
						const groupInfo = JSON.parse(groupData);
						const groupId = groupInfo.group_id;
						const sessionId = groupInfo.session_id;

						const options: IHttpRequestOptions = {
							method: 'POST',
							baseURL: WHATSABLE_DASHBOARD_BASE_DOMAIN,
							url: '/api/whatsapp/messages/v2.0.0/group-send',
							headers: {
								'Content-Type': 'application/json',
								'Accept': 'application/json',
							},
							body: {
								groupId: groupId,
								message: message,
								session: sessionId,
							},
						};

						response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'whatsAbleApi',
							options,
						);
					} else {
						throw new NodeOperationError(this.getNode(), `Product operation ${productOperation} is not supported for group messages`);
					}
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
				// If it's already a NodeApiError, check if we need to update the message
				// Check both instanceof and constructor name for robustness
				if (error instanceof NodeApiError || error.constructor.name === 'NodeApiError') {
					// Check if this is a generic "Forbidden" error that needs custom message
						if (error.message.includes('Forbidden - perhaps check your credentials?') && error.description) {
							const cleanMessage = `${error.description}`;
						throw new NodeApiError(this.getNode(), { message: cleanMessage });
					}
					throw error;
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