const { WhatsAble } = require('./dist/nodes/WhatsAble/WhatsAble.node');
const { WhatsAbleNotifyerSystem } = require('./dist/nodes/WhatsAble/WhatsAbleNotifyerSystem.node');

module.exports = {
  nodes: [
    WhatsAble,
    WhatsAbleNotifyerSystem,
  ],
};
