import { IExecuteFunctions, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { WhatsAble } from '../../../nodes/WhatsAble/WhatsAble.node';
import * as utils from './utils';

describe('WhatsAble Node', () => {
	let whatsAbleNode: WhatsAble;
	const apiKey = 'test-api-key';
	
	beforeAll(() => {
		whatsAbleNode = new WhatsAble();
	});

	describe('node description', () => {
		test('should have the correct properties', () => {
			expect(whatsAbleNode.description).toBeDefined();
			expect(whatsAbleNode.description.displayName).toBe('WhatsAble');
			expect(whatsAbleNode.description.name).toBe('whatsAble');
			expect(whatsAbleNode.description.group).toContain('transform');
			expect(whatsAbleNode.description.version).toBe(1);
			
			// Non-null assertion since we already checked that description is defined
			const credentials = whatsAbleNode.description.credentials;
			expect(credentials).toBeDefined();
			expect(credentials).toHaveLength(1);
			expect(credentials?.[0].name).toBe('whatsAbleApi');
			expect(credentials?.[0].required).toBe(true);
		});
	});

	describe('methods', () => {
		test('getOperations method should return operations list', async () => {
			const loadOptionsFunctions = {
				getCredentials: async () => ({ apiKey }),
				getNode: () => ({ name: 'test-node' }),
				helpers: {
					httpRequest: jest.fn().mockResolvedValue({
						success: true,
						product: 'notifier',
					}),
				},
			} as unknown as ILoadOptionsFunctions;

			// Access the getOperations method through the methods.loadOptions object
			const operations = await whatsAbleNode.methods.loadOptions.getOperations.call(loadOptionsFunctions);
			expect(operations).toBeDefined();
			expect(Array.isArray(operations)).toBe(true);
			expect(operations.length).toBeGreaterThan(0);
			
			// Check for expected operations
			const operationNames = operations.map((op: INodePropertyOptions) => op.name);
			expect(operationNames).toContain('Send Message (Notifier)');
		});
	});

	describe('execute', () => {
		test('should correctly send a message with sendMessage operation', async () => {
			// Mock API responses
			const apiValidationResponse = {
				success: true,
				message: 'API key is valid',
				product: 'notifier',
			};
			
			const sendMessageResponse = {
				success: true,
				message: 'Message sent successfully',
				messageId: 'msg123456',
			};
			
			// Setup execution data with mocked HTTP responses
			const executeFunctions = utils.createExecuteFunctionsMock({
				nodeType: whatsAbleNode,
				getCredentials: {
					whatsAbleApi: {
						apiKey,
					},
				},
				getNodeParameter: {
					operation: 'sendMessage',
					recipient: '+1234567890',
					message: 'Test message',
					attachment: '',
					filename: '',
				},
				mockHttpResponse: sendMessageResponse,
			}) as unknown as IExecuteFunctions;

			// Mock the validation response for the first call
			(executeFunctions.helpers.httpRequest as jest.Mock).mockResolvedValueOnce(apiValidationResponse);

			// Execute the node
			const result = await whatsAbleNode.execute.call(executeFunctions);

			// Verify results
			expect(result).toBeDefined();
			expect(result[0]).toBeDefined();
			expect(result[0][0].json).toEqual(sendMessageResponse);
		});

		test('should correctly send a template with sendNotifyerTemplate operation', async () => {
			// Mock API responses
			const apiValidationResponse = {
				success: true,
				message: 'API key is valid',
				product: 'notifyer',
				apiData: {
					user_id: 'test-user-123',
				},
			};
			
			const sendTemplateResponse = {
				success: true,
				message: 'Template message sent successfully',
				messageId: 'tmpl123456',
			};
			
			// Setup execution data with mocked HTTP responses
			const executeFunctions = utils.createExecuteFunctionsMock({
				nodeType: whatsAbleNode,
				getCredentials: {
					whatsAbleApi: {
						apiKey,
					},
				},
				getNodeParameter: {
					operation: 'sendNotifyerTemplate',
					notifyerRecipient: '+1234567890',
					notifyerTemplate: JSON.stringify({ template_id: 'template123' }),
					notifyerVariables: {
						value: {
							'variable1': 'Value 1',
							'variable2': 'Value 2',
						}
					},
				},
				mockHttpResponse: sendTemplateResponse,
			}) as unknown as IExecuteFunctions;

			// Mock the validation response for the first call
			(executeFunctions.helpers.httpRequest as jest.Mock).mockResolvedValueOnce(apiValidationResponse);

			// Execute the node
			const result = await whatsAbleNode.execute.call(executeFunctions);

			// Verify results
			expect(result).toBeDefined();
			expect(result[0]).toBeDefined();
			expect(result[0][0].json).toEqual(sendTemplateResponse);
		});

		test('should correctly send a message with sendWhatsableMessage operation', async () => {
			// Mock API responses
			const apiValidationResponse = {
				success: true,
				message: 'API key is valid',
				product: 'whatsable',
			};
			
			const sendMessageResponse = {
				success: true,
				message: 'Message sent successfully',
				messageId: 'wamsg123456',
			};
			
			// Setup execution data with mocked HTTP responses
			const executeFunctions = utils.createExecuteFunctionsMock({
				nodeType: whatsAbleNode,
				getCredentials: {
					whatsAbleApi: {
						apiKey,
					},
				},
				getNodeParameter: {
					operation: 'sendWhatsableMessage',
					whatsableTo: '12345',
					whatsableText: 'Test WhatsApp message',
					whatsableAttachment: '',
					whatsableFilename: '',
				},
				mockHttpResponse: sendMessageResponse,
			}) as unknown as IExecuteFunctions;

			// Mock the validation response for the first call
			(executeFunctions.helpers.httpRequest as jest.Mock).mockResolvedValueOnce(apiValidationResponse);

			// Execute the node
			const result = await whatsAbleNode.execute.call(executeFunctions);

			// Verify results
			expect(result).toBeDefined();
			expect(result[0]).toBeDefined();
			expect(result[0][0].json).toEqual(sendMessageResponse);
		});

		test('should handle API validation failure', async () => {
			// Mock API responses
			const apiValidationResponse = {
				success: false,
				message: 'Invalid API key',
			};
			
			// Setup execution data
			const executeFunctions = utils.createExecuteFunctionsMock({
				nodeType: whatsAbleNode,
				getCredentials: {
					whatsAbleApi: {
						apiKey,
					},
				},
				getNodeParameter: {
					operation: 'sendMessage',
					recipient: '+1234567890',
					message: 'Test message',
					attachment: '',
					filename: '',
				},
				mockHttpResponse: apiValidationResponse,
			}) as unknown as IExecuteFunctions;

			// Execute the node and expect it to throw
			await expect(whatsAbleNode.execute.call(executeFunctions)).rejects.toThrow();
		});
	});
}); 