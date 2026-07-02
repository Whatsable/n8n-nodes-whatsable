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

/**
 * Notifyer scheduled API expects `schedule_datetime_date` as UTC ISO without milliseconds.
 * Sends the picker datetime as-is (wall clock) with a Z suffix; backend converts using `time_zone`.
 */
function formatScheduleDatetimeUtcIso(isoLike: string): string {
	const normalized = isoLike.trim().replace(' ', 'T');
	const match = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
	if (match) {
		return `${match[1]}Z`;
	}
	return new Date(isoLike).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildUpdateContactLabelsPayload(
	labels: string[],
	selectedRemoveLabels: string[],
): { labels: string[]; selected_labels: string[] } {
	if (selectedRemoveLabels.includes('__REMOVE_ALL__')) {
		return { labels: [], selected_labels: ['__REMOVE_ALL__'] };
	}

	return {
		labels: labels.length > 0 ? labels : [],
		selected_labels: selectedRemoveLabels.length > 0 ? selectedRemoveLabels : [],
	};
}

export class WhatsAble implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsAble for WhatsApp',
		name: 'whatsAble',
		icon: 'file:whatsable.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] || "Configure WhatsApp messaging"}}',
		description: 'Send & Schedule WhatsApp messages using the official WhatsApp API and have human/AI collaboration',
		usableAsTool: true,
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
					{
						name: 'Manage Contact',
						value: 'manageContact',
						description: 'Update contact details such as notes and labels',
						action: 'Manage contact',
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
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage', 'sendWhatsAppMessageToGroup', 'manageContact'],
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
				displayName: 'Phone Number',
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
				displayName: 'Phone Number',
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
				displayName: 'The first time you select a template, n8n may switch this field to Expression mode. If that happens, click Fixed to return to the dropdown and choose your template.',
				name: 'notifyerTemplateModeNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate'],
					},
				},
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
				displayName: 'Note',
				name: 'nonTemplateNote',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage', 'scheduleWhatsAppMessage'],
						productOperation: ['sendNonTemplateMessage'],
					},
				},
				description: 'Optional note to add to the message',
				typeOptions: {
					rows: 2,
				},
			},

			{
				displayName: 'Schedule Type : Relative or Specific',
				name: 'notifyerScheduleTypeSpecific',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate', 'sendNonTemplateMessage'],
					},
				},
				description: 'Whether to schedule at a specific date and time (on) or after a relative delay from now (off)',
			},
			{
				displayName: 'Unit of Time',
				name: 'notifyerUnitOfTime',
				type: 'options',
				required: true,
				options: [
					{ name: '', value: '' },
					{ name: 'Days', value: 'days' },
					{ name: 'Hours', value: 'hours' },
					{ name: 'Minutes', value: 'min' },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate', 'sendNonTemplateMessage'],
						notifyerScheduleTypeSpecific: [false],
					},
				},
			},
			{
				displayName: 'Number',
				name: 'notifyerUnitOfTimeValue',
				type: 'options',
				required: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items -- numeric ascending order for UX
				options: [
					{ name: '', value: '' },
					{ name: '1', value: 1 },
					{ name: '2', value: 2 },
					{ name: '3', value: 3 },
					{ name: '4', value: 4 },
					{ name: '5', value: 5 },
					{ name: '10', value: 10 },
					{ name: '15', value: 15 },
					{ name: '20', value: 20 },
					{ name: '30', value: 30 },
					{ name: '60', value: 60 },
					{ name: '90', value: 90 },
					{ name: '120', value: 120 },
				],
				default: '',
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate', 'sendNonTemplateMessage'],
						notifyerScheduleTypeSpecific: [false],
					},
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
						productOperation: ['sendNotifyerTemplate', 'sendNonTemplateMessage'],
						notifyerScheduleTypeSpecific: [true],
					},
				},
				default: '',
			},
			{
				displayName: 'Timezone',
				name: 'templateTimezone',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate', 'sendNonTemplateMessage'],
						notifyerScheduleTypeSpecific: [true],
					},
				},
				options: WHATSAPP_TIMEZONES,
				default: '',
			},
			{
				displayName: 'Recipient Reply Status : Send Only If',
				name: 'notifyerRecipientReplyCondition',
				type: 'options',
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{ name: '', value: '' },
					{
						name: 'Recipient Did Not Reply After My Last Message',
						value: 'never',
						description: 'Send the scheduled message at the schedule time only if the recipient has not replied since my most recent message',
					},
					{
						name: 'Recipient Did Not Reply Within 20 Minutes After My Last Message',
						value: '20m',
						description: 'Send the scheduled message at the schedule time only if the recipient did not reply within 20 minutes after my last message',
					},
					{
						name: 'Recipient Did Not Reply Within 45 Minutes After My Last Message',
						value: '45m',
						description: 'Send the scheduled message at the schedule time only if the recipient did not reply within 45 minutes after my last message',
					},
					{
						name: 'Recipient Did Not Reply Within 3 Hours After My Last Message',
						value: '3h',
						description: 'Send the scheduled message at the schedule time only if the recipient did not reply within 3 hours after my last message',
					},
					{
						name: 'Recipient Did Not Reply Within 6 Hours After My Last Message',
						value: '6h',
						description: 'Send the scheduled message at the schedule time only if the recipient did not reply within 6 hours after my last message',
					},
					{
						name: 'Recipient Did Not Reply Within 12 Hours After My Last Message',
						value: '12h',
						description: 'Send the scheduled message at the schedule time only if the recipient did not reply within 12 hours after my last message',
					},
					{
						name: 'Recipient Did Not Reply Within 24 Hours After My Last Message',
						value: '24h',
						description: 'Send the scheduled message at the schedule time only if the recipient did not reply within 24 hours after my last message',
					},
					{
						name: 'Recipient Did Not Reply Within 48 Hours After My Last Message',
						value: '48h',
						description: 'Send the scheduled message at the schedule time only if the recipient did not reply within 48 hours after my last message',
					},
					{
						name: 'Recipient Did Not Reply Within 72 Hours After My Last Message',
						value: '72h',
						description: 'Send the scheduled message at the schedule time only if the recipient did not reply within 72 hours after my last message',
					},
					{
						name: 'Recipient Never Replied to Any of My Messages',
						value: 'never-replied',
						description: 'Send the scheduled message at the schedule time only if the recipient has never replied to any of my messages',
					},
				],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate', 'sendNonTemplateMessage'],
					},
				},
				description: 'Optional: add to the request only when a value is selected',
			},
			{
				displayName: 'Label Status : Include or Exclude',
				name: 'notifyerLabelConditionStatus',
				type: 'options',
				default: '',
				options: [
					{ name: '', value: '' },
					{ name: 'Include', value: 'include' },
					{ name: 'Does Not Include', value: 'not' },
				],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate', 'sendNonTemplateMessage'],
					},
				},
				description: 'How selected labels apply to the condition (used with Labels below)',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'notifyerConditionTwoLabels',
				type: 'multiOptions',
				default: [],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['scheduleWhatsAppMessage'],
						productOperation: ['sendNotifyerTemplate', 'sendNonTemplateMessage'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
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
						operation: ['sendWhatsAppMessage', 'manageContact'],
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
						operation: ['sendWhatsAppMessage', 'manageContact'],
						productOperation: ['updateContact'],
					},
				},
				description: 'Optional note to add to the contact',
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName: 'Add Label Names or IDs',
				name: 'updateContactLabels',
				type: 'multiOptions',
				default: [],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage', 'manageContact'],
						productOperation: ['updateContact'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
			},
			{
				displayName: 'Remove Label Names or IDs',
				name: 'selectRemoveLabels',
				type: 'multiOptions',
				default: [],
				displayOptions: {
					show: {
						resource: ['sendMessage'],
						operation: ['sendWhatsAppMessage', 'manageContact'],
						productOperation: ['updateContact'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLabelsForRemoveContact',
				},
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
	} as INodeTypeDescription;

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
										name: 'Send Message Template',
										value: 'sendNotifyerTemplate',
										description: 'Send template-based WhatsApp messages',
										action: 'Send template via notifyer',
									});
									returnData.push({
										name: 'Send Non Template Message',
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
										name: 'Send Message Template',
										value: 'sendNotifyerTemplate',
										description: 'Schedule template-based WhatsApp messages',
										action: 'Schedule template via notifyer',
									});
									returnData.push({
										name: 'Send Non Template Message',
										value: 'sendNonTemplateMessage',
										description: 'Schedule non-template WhatsApp messages',
										action: 'Schedule non template via notifyer',
									});
								} else if (currentOperation === 'manageContact') {
									returnData.push({
										name: 'Update Contact',
										value: 'updateContact',
										description: 'Update contact details',
										action: 'Update contact',
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

			async getLabelsForRemoveContact(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				returnData.push({
					name: 'Remove All',
					value: '__REMOVE_ALL__',
					description: 'Remove all labels from the contact',
				});

				try {
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
	private static buildNonTemplateMessagePayload(
		ctx: IExecuteFunctions,
		itemIndex: number,
		recipient: string,
		messageType: string,
	): Record<string, unknown> {
		const base: Record<string, unknown> = {
			to: recipient,
			type: messageType,
			recipient_type: 'individual',
			messaging_product: 'whatsapp',
		};

		if (messageType === 'text') {
			const messageContent = ctx.getNodeParameter('messageContent', itemIndex) as string;
			const enableLinkPreview = ctx.getNodeParameter('enableLinkPreview', itemIndex, false) as boolean;
			return {
				...base,
				text: {
					body: messageContent,
					preview_url: enableLinkPreview,
				},
			};
		}

		if (messageType === 'document') {
			const documentUrl = ctx.getNodeParameter('documentUrl', itemIndex) as string;
			const documentCaption = ctx.getNodeParameter('documentCaption', itemIndex, '') as string;
			const documentFilename = ctx.getNodeParameter('documentFilename', itemIndex) as string;
			return {
				...base,
				document: {
					link: documentUrl,
					caption: documentCaption,
					filename: documentFilename,
				},
			};
		}

		if (messageType === 'image') {
			const imageUrl = ctx.getNodeParameter('imageUrl', itemIndex) as string;
			const imageCaption = ctx.getNodeParameter('imageCaption', itemIndex, '') as string;
			return {
				...base,
				image: {
					link: imageUrl,
					caption: imageCaption,
				},
			};
		}

		if (messageType === 'video') {
			const videoUrl = ctx.getNodeParameter('videoUrl', itemIndex) as string;
			const videoCaption = ctx.getNodeParameter('videoCaption', itemIndex, '') as string;
			return {
				...base,
				video: {
					link: videoUrl,
					caption: videoCaption,
				},
			};
		}

		if (messageType === 'audio') {
			const audioUrl = ctx.getNodeParameter('audioUrl', itemIndex) as string;
			return {
				...base,
				audio: {
					link: audioUrl,
				},
			};
		}

		throw new NodeOperationError(ctx.getNode(), `Unsupported message type: ${messageType}`);
	}

	private static buildNonTemplateScheduleFields(
		ctx: IExecuteFunctions,
		itemIndex: number,
	): Record<string, unknown> {
		const scheduleTypeSpecific = ctx.getNodeParameter('notifyerScheduleTypeSpecific', itemIndex, false) as boolean;
		const scheduleFields: Record<string, unknown> = {
			schedule_type: scheduleTypeSpecific ? 'specific' : 'relative',
		};

		if (scheduleTypeSpecific) {
			const scheduledDateTime = ctx.getNodeParameter('templateScheduledDateTime', itemIndex) as string;
			const timezone = ctx.getNodeParameter('templateTimezone', itemIndex) as string;
			scheduleFields.time_zone = timezone;
			scheduleFields.schedule_datetime_date = formatScheduleDatetimeUtcIso(scheduledDateTime);
		} else {
			const unitOfTimeName = ctx.getNodeParameter('notifyerUnitOfTime', itemIndex) as string;
			const unitOfTimeRaw = ctx.getNodeParameter('notifyerUnitOfTimeValue', itemIndex) as number | string;
			scheduleFields.unit_of_time_name = unitOfTimeName;
			scheduleFields.unit_of_time_value =
				typeof unitOfTimeRaw === 'number' ? unitOfTimeRaw : Number(unitOfTimeRaw);
		}

		const replyCondition = ctx.getNodeParameter('notifyerRecipientReplyCondition', itemIndex, '') as string;
		if (replyCondition && String(replyCondition).trim() !== '') {
			scheduleFields.condition_one = replyCondition;
		}

		const labelConditionStatus = ctx.getNodeParameter('notifyerLabelConditionStatus', itemIndex, '') as string;
		const conditionTwoLabels = ctx.getNodeParameter('notifyerConditionTwoLabels', itemIndex, []) as string[];
		if (
			labelConditionStatus &&
			String(labelConditionStatus).trim() !== '' &&
			Array.isArray(conditionTwoLabels) &&
			conditionTwoLabels.length > 0
		) {
			scheduleFields.condition_two = {
				c: labelConditionStatus,
				v: conditionTwoLabels,
			};
		}

		return scheduleFields;
	}

	private static async sendNonTemplateMessage(
		ctx: IExecuteFunctions,
		itemIndex: number,
		operation: string,
	): Promise<unknown> {
		const recipient = ctx.getNodeParameter('nonTemplateRecipient', itemIndex) as string;
		const messageType = ctx.getNodeParameter('messageType', itemIndex) as string;
		const note = ctx.getNodeParameter('nonTemplateNote', itemIndex, '') as string;
		const labels = ctx.getNodeParameter('nonTemplateLabels', itemIndex, []) as string[];
		const isSchedule = operation === 'scheduleWhatsAppMessage';

		const requestBody: Record<string, unknown> = {
			...WhatsAble.buildNonTemplateMessagePayload(ctx, itemIndex, recipient, messageType),
			labels,
		};

		if (note) {
			requestBody.note = note;
		}

		if (isSchedule) {
			requestBody.is_schedule = true;
			Object.assign(requestBody, WhatsAble.buildNonTemplateScheduleFields(ctx, itemIndex));
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			baseURL: BASE_URLS.NOTIFYER,
			url: '/n8n/messages/general/send',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: requestBody,
		};

		return ctx.helpers.httpRequestWithAuthentication.call(ctx, 'whatsAbleApi', options);
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
							templateId: templateData.template_id,
							variables: variables,
							phone_number: recipient,
							note: note,
							labels: labels,
						};

						const options: IHttpRequestOptions = {
							method: 'POST',
							baseURL: BASE_URLS.NOTIFYER,
							url: '/n8n/messages/send',
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
						response = await WhatsAble.sendNonTemplateMessage(this, i, operation);
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

						Object.assign(
							requestBody,
							buildUpdateContactLabelsPayload(labels, selectedRemoveLabels),
						);

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
				} else if (operation === 'manageContact') {
					const productOperation = this.getNodeParameter('productOperation', i) as string;

					if (productOperation === 'updateContact') {
						const phoneNumber = this.getNodeParameter('updateContactPhoneNumber', i) as string;
						const note = this.getNodeParameter('updateContactNote', i, '') as string;
						const labels = this.getNodeParameter('updateContactLabels', i, []) as string[];
						const selectedRemoveLabels = this.getNodeParameter('selectRemoveLabels', i, []) as string[];

						const requestBody: Record<string, any> = {
							phone_number: phoneNumber,
						};

						if (note) {
							requestBody.note = note;
						}

						Object.assign(
							requestBody,
							buildUpdateContactLabelsPayload(labels, selectedRemoveLabels),
						);

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
					} else {
						throw new NodeOperationError(this.getNode(), `Product operation ${productOperation} is not supported for Manage Contact`);
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
						const scheduleTypeSpecific = this.getNodeParameter('notifyerScheduleTypeSpecific', i, false) as boolean;

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

						// Scheduled notifyer template: core fields + either fixed datetime or relative delay.
						const scheduleRequestBody: Record<string, unknown> = {
							templateId: templateData.template_id,
							variables: variables,
							is_schedule: true,
							phone_number: recipient,
							note: note,
							labels: labels,
							schedule_type: scheduleTypeSpecific ? 'specific' : 'relative',
						};

						// specific: `schedule_datetime_date` + `time_zone`; relative: `unit_of_time_*` only.
						if (scheduleTypeSpecific) {
							const scheduledDateTime = this.getNodeParameter('templateScheduledDateTime', i) as string;
							const timezone = this.getNodeParameter('templateTimezone', i) as string;
							scheduleRequestBody.time_zone = timezone;
							scheduleRequestBody.schedule_datetime_date = formatScheduleDatetimeUtcIso(scheduledDateTime);
						} else {
							const unitOfTimeName = this.getNodeParameter('notifyerUnitOfTime', i) as string;
							const unitOfTimeRaw = this.getNodeParameter('notifyerUnitOfTimeValue', i) as number | string;
							const unitOfTimeValue =
								typeof unitOfTimeRaw === 'number' ? unitOfTimeRaw : Number(unitOfTimeRaw);
							scheduleRequestBody.unit_of_time_name = unitOfTimeName;
							scheduleRequestBody.unit_of_time_value = unitOfTimeValue;
						}

						// Optional: send only if recipient reply matches (API `condition_one`).
						const replyCondition = this.getNodeParameter('notifyerRecipientReplyCondition', i, '') as string;
						if (replyCondition && String(replyCondition).trim() !== '') {
							scheduleRequestBody.condition_one = replyCondition;
						}

						// Optional: label include/exclude — `c` = status, `v` = label ids (`condition_two`).
						const labelConditionStatus = this.getNodeParameter('notifyerLabelConditionStatus', i, '') as string;
						const conditionTwoLabels = this.getNodeParameter('notifyerConditionTwoLabels', i, []) as string[];
						if (
							labelConditionStatus &&
							String(labelConditionStatus).trim() !== '' &&
							Array.isArray(conditionTwoLabels) &&
							conditionTwoLabels.length > 0
						) {
							scheduleRequestBody.condition_two = {
								c: labelConditionStatus,
								v: conditionTwoLabels,
							};
						}

						const options: IHttpRequestOptions = {
							method: 'POST',
							baseURL: BASE_URLS.NOTIFYER,
							url: '/n8n/messages/send',
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
						response = await WhatsAble.sendNonTemplateMessage(this, i, operation);
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
