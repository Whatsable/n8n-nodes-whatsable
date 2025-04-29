# n8n-nodes-whatsable

![WhatsAble Logo](nodes/WhatsAble/whatsAble.svg)

This n8n node allows you to integrate WhatsApp messaging capabilities into your n8n workflows using the WhatsAble API.

## Features

- Send text messages to WhatsApp numbers
- Send messages with attachments
- Send template messages
- Get message status and delivery reports
- Manage WhatsApp numbers and templates

## Prerequisites

- An n8n instance (version 1.0.0 or higher)
- A WhatsAble API account and API key
- Node.js version 18.10 or higher
- pnpm package manager

## Installation

1. Install the node in your n8n instance:
   ```bash
   pnpm add n8n-nodes-whatsable
   ```
2. Restart your n8n instance

## Authentication

To use this node, you need to configure the WhatsAble API credentials:

1. In your n8n workflow, add a WhatsAble node
2. Click on the "Create New" button in the Credentials section
3. Enter your WhatsAble API key
4. Click "Save"

## Operations

### Send Message
Send a text message to a WhatsApp number.

**Parameters:**
- Recipient: Phone number in international format (e.g., +1234567890)
- Message: Text content to send
- Attachment URL (optional): URL of an attachment to include
- Filename (optional): Name for the attachment

### Send Template Message
Send a pre-approved template message.

**Parameters:**
- Template: Select from your approved templates
- Recipient: Phone number in international format
- Variables: Template variables to fill in

### Get Message Status
Check the status of a sent message.

**Parameters:**
- Message ID: ID of the message to check

### Get WhatsApp Numbers
Retrieve a list of your connected WhatsApp numbers.

### Get Templates
Retrieve a list of your approved message templates.

## Usage Examples

### Basic Message Sending
```json
{
  "operation": "sendMessage",
  "recipient": "+1234567890",
  "message": "Hello from n8n!",
  "attachment": "https://example.com/image.jpg",
  "filename": "image.jpg"
}
```

### Template Message
```json
{
  "operation": "sendTemplateMessage",
  "template": "welcome_message",
  "recipient": "+1234567890",
  "variables": {
    "name": "John",
    "company": "Example Corp"
  }
}
```

## Troubleshooting

### Common Issues

1. **Node not appearing in n8n**
   - Ensure the package is properly installed
   - Check n8n version compatibility
   - Restart n8n instance

2. **Authentication errors**
   - Verify API key is correct
   - Check WhatsAble account status
   - Ensure proper formatting of credentials

3. **Message sending failures**
   - Verify recipient number format
   - Check message content restrictions
   - Validate attachment URLs

### Error Messages

- **Invalid API Key**: Check your WhatsAble API credentials
- **Invalid Phone Number**: Ensure proper international format
- **Template Not Found**: Verify template name and approval status

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the package:
   ```bash
   pnpm build
   ```
4. Run tests:
   ```bash
   pnpm test
   ```

## Support

For support, please contact:
- Email: support@whatsable.app
- Website: https://www.whatsable.app/
- GitHub Issues: https://github.com/Whatsable/n8n-nodes-whatsable/issues

## License

[MIT](LICENSE.md)
