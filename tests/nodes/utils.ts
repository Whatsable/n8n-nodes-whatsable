import { INodeType } from 'n8n-workflow';

/**
 * Creates a mock for IExecuteFunctions
 */
export function createExecuteFunctionsMock({
	nodeType,
	getCredentials = {},
	getNodeParameter = {},
	getInputData = [],
	mockHttpResponse = {},
}: {
	nodeType: INodeType;
	getCredentials?: Record<string, unknown>;
	getNodeParameter?: Record<string, unknown>;
	getInputData?: Array<{ json: Record<string, unknown> }>;
	mockHttpResponse?: Record<string, unknown>;
}) {
	const nodeParameters = new Map<string, unknown>();
	const nodeCredentials = new Map<string, unknown>();

	// Initialize parameter and credential maps
	Object.entries(getNodeParameter).forEach(([key, value]) => {
		nodeParameters.set(key, value);
	});

	Object.entries(getCredentials).forEach(([key, value]) => {
		nodeCredentials.set(key, value);
	});

	// Default input data
	const inputData = getInputData.length
		? getInputData
		: [{ json: {} }];

	// Create mock
	const executeFunctionsMock = {
		getCredentials: async (type: string) => {
			const credentials = nodeCredentials.get(type);
			if (!credentials) {
				throw new Error(`No credentials found for type: ${type}`);
			}
			return credentials;
		},
		getInputData: () => inputData,
		getNodeParameter: (
			parameterName: string,
			itemIndex: number,
			fallbackValue?: unknown,
			options?: Record<string, unknown>,
		) => {
			// Handle options.extractValue property if present
			if (options?.extractValue && typeof nodeParameters.get(parameterName) === 'object') {
				const extractFrom = nodeParameters.get(parameterName) as Record<string, unknown>;
				if ('value' in extractFrom) {
					return extractFrom.value;
				}
			}

			const value = nodeParameters.get(parameterName);
			return value !== undefined ? value : fallbackValue;
		},
		getNode: () => {
			return {
				name: 'test-node',
				type: nodeType.description.name,
				typeVersion: nodeType.description.version,
				position: [0, 0],
				parameters: {},
			};
		},
		helpers: {
			httpRequest: jest.fn().mockImplementation(async () => {
				// Return the mocked response directly
				return mockHttpResponse || {};
			}),
			returnJsonArray: (items: unknown[]) => items,
		},
	};

	return executeFunctionsMock;
} 