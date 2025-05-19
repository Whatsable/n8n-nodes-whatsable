const { WhatsAble } = require('./dist/nodes/WhatsAble/WhatsAble.node');
const { WhatsAbleTrigger } = require('./dist/nodes/WhatsAble/WhatsAbleTrigger.node');
const { WhatsAbleNotifierTrigger } = require('./dist/nodes/WhatsAble/WhatsAbleNotifierTrigger.node');

module.exports = {
  nodes: [
    WhatsAble,
    WhatsAbleTrigger,
    WhatsAbleNotifierTrigger,
  ],
};
