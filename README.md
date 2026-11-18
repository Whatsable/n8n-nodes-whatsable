<p align="center">
  <img src="https://d1pnnwteuly8z3.cloudfront.net/images/acc1c175-2e05-4bab-805e-64536550fa04/393f0ca5-e904-41f3-8eee-b2dab6bd4e0d.png" alt="WhatsAble Logo" width="160"/>
</p>

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE.md)

# n8n-nodes-whatsable

This is an [n8n](https://n8n.io/) community node. It lets you use WhatsAble in your n8n workflows: start a workflow from a WhatsApp message, send template and non-template messages, schedule a message for later, and update a contact.

WhatsAble is a WhatsApp Business platform with a shared inbox, AI chatbots, and automations. [n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Usage](#usage)  
[Compatibility](#compatibility)  
[Common use cases](#common-use-cases)  
[Support](#support)  
[Resources](#resources)  
[Running locally](#running-locally)  
[Contributing](#contributing)

---

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. On a self-hosted n8n you can also install the package from npm:

```bash
npm install n8n-nodes-whatsable
```

---

## Operations

The package has two nodes: **WhatsAble for WhatsApp** (actions) and a **WhatsAble Trigger**.

### Trigger

| Node | What it does |
| --- | --- |
| **On new Incoming message event** (node name: Incoming/outgoing WhatsApp message Trigger) | Starts a workflow when a contact writes to your WhatsApp number. Incoming audio messages are transcribed to text and included in the payload. |

### Actions

Set **Resource** to **Send Message**, then choose an **Operation**.

| Operation | What it does |
| --- | --- |
| **Send WhatsApp Message** | Sends a message right away. **Product Operation**: **Send Message Template** (an approved template with variables) or **Send Non Template Message** (text, image, video, document, or audio, inside the 24-hour customer service window). |
| **Schedule WhatsApp Message** | Sends a template or non-template message later, after a delay (minutes, hours, days) or at a specific date and time in a timezone you choose. Optional conditions: send only if the contact did not reply, or only if the contact has (or does not have) a label. |
| **Manage Contact** | **Update Contact**: add a note and add or remove labels on a contact. Nothing is sent to the contact. |
| **Send WhatsApp Message to a Group** | Sends a message to a WhatsApp group. Available for WhatsAble Bot keys. It does not use the official WhatsApp API and is a separate offering (beta). |

---

## Credentials

You need a WhatsAble API key.

1. Sign in to your WhatsAble account and open **API keys**.
2. Create a key. Choose the WhatsApp number that the key sends from.
3. In n8n, add the **WhatsAble API** credential to the node and paste the key.

An API key belongs to one WhatsApp number. Messages sent with the key go out from that number, and a trigger registered with the key receives that number's messages. To work with two numbers, create one key and one credential for each.

For the trigger, copy the **Production URL** from the trigger node and paste it, with your API key, into the trigger credential. Saving the credential checks the key and registers the URL.

> **Note:** Keep your API key secret. Never share it publicly or commit it to version control.

The package also contains credential types for the older WhatsAble Bot and Notifier products. New setups use the steps above.

---

## Usage

Step-by-step guides, with screenshots and example workflows:

- [n8n overview](https://docs.whatsable.app/integration/n8n)
- [Start a workflow from a WhatsApp message](https://docs.whatsable.app/integration/n8n/trigger)
- [Send a WhatsApp message](https://docs.whatsable.app/integration/n8n/send-message)
- [Schedule a WhatsApp message](https://docs.whatsable.app/integration/n8n/schedule-message)
- [Update a contact](https://docs.whatsable.app/integration/n8n/update-contact)
- [Every field of the node](https://docs.whatsable.app/integration/n8n/fields)

> **Note:** Running a test step on a send or schedule operation sends a real WhatsApp message. Test with your own phone number first.

---

## Compatibility

The package targets n8n Nodes API version 1 and Node.js 18.10 or later.

---

## Common use cases

- Lead qualification: follow up with leads, and skip the follow-up when they already replied.
- Order notifications: confirmations, shipping updates, and delivery messages.
- Appointment reminders: schedule a reminder before each appointment.
- Customer support: route a new message to the right person.
- Payment reminders: invoice and subscription reminders.

---

## Support

For technical support and assistance, contact team@whatsable.app.

---

## License

[MIT](LICENSE.md)

---

## Resources

- [WhatsAble website](https://whatsable.app)
- [WhatsAble documentation](https://docs.whatsable.app)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

---

## Running Locally

To run and test this node on your local machine:

1. **Clone the repository**
   ```bash
   git clone https://github.com/Whatsable/n8n-nodes-whatsable.git
   cd n8n-nodes-whatsable
   ```
2. **Install dependencies**
   ```bash
   pnpm install
   ```
3. **Build the project**
   ```bash
   pnpm build
   ```
4. **Run tests**
   ```bash
   pnpm test
   ```
   > **Note:** Unit tests are included to ensure code quality. Please run tests before submitting a pull request.
5. **Link the node to your local n8n instance**
   - If you are developing a custom node, you can use [n8n's community node development guide](https://docs.n8n.io/integrations/community-nodes/create/) to link your node for local testing.
   - Typically, you can run:
     ```bash
     pnpm link --global
     cd ~/.n8n/custom
     pnpm link --global n8n-nodes-whatsable
     ```
   - Restart your n8n instance to load the custom node.
6. **Test your node**
   - Open n8n in your browser (usually at `http://localhost:5678`)
   - Create a workflow and add your custom node to test its functionality

> **Note:** Make sure you have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed on your machine.

---

## Contributing

We welcome contributions from the community! To contribute:

1. **Fork the repository**: [https://github.com/Whatsable/n8n-nodes-whatsable](https://github.com/Whatsable/n8n-nodes-whatsable)
2. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and ensure code quality:
   - Follow the existing code style
   - Add or update documentation as needed
   - Run linter and tests before submitting
4. **Commit your changes**
   ```bash
   git commit -m "Add your message here"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**
   - Go to the GitHub page for your fork
   - Click "Compare & pull request"
   - Describe your changes and submit the PR

### Reporting Issues
- If you find a bug or have a feature request, please [open an issue](https://github.com/Whatsable/n8n-nodes-whatsable/issues) with details and steps to reproduce.

### Code of Conduct
- Please be respectful and follow our [Code of Conduct](CODE_OF_CONDUCT.md) when participating in this project.
