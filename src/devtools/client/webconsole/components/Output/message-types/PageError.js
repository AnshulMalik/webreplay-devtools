/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// React & Redux
const { createFactory } = require("react");
const PropTypes = require("prop-types");
const Message = createFactory(
  require("devtools/client/webconsole/components/Output/Message")
);

const { createPrimitiveValueFront } = require("protocol/thread");

const { REPS, MODE } = require("devtools/client/debugger/packages/devtools-reps/src");

PageError.displayName = "PageError";

PageError.propTypes = {
  message: PropTypes.object.isRequired,
  open: PropTypes.bool,
  timestampsVisible: PropTypes.bool.isRequired,
  serviceContainer: PropTypes.object,
  maybeScrollToBottom: PropTypes.func,
  inWarningGroup: PropTypes.bool.isRequired,
};

PageError.defaultProps = {
  open: false,
};

function PageError(props) {
  const {
    dispatch,
    message,
    open,
    repeat,
    serviceContainer,
    timestampsVisible,
    isPaused,
    maybeScrollToBottom,
    inWarningGroup,
    pausedExecutionPoint,
  } = props;
  const {
    id: messageId,
    executionPoint,
    executionPointTime,
    executionPointHasFrames,
    source,
    type,
    level,
    messageText,
    stacktrace,
    frame,
    exceptionDocURL,
    timeStamp,
    notes,
  } = message;

  const messageBody = REPS.StringRep.rep({
    object: createPrimitiveValueFront(messageText),
    mode: MODE.LONG,
    useQuotes: false,
    escapeWhitespace: false,
    urlCropLimit: 120,
    openLink: serviceContainer.openLink,
  });

  return Message({
    dispatch,
    messageId,
    executionPoint,
    executionPointTime,
    executionPointHasFrames,
    isPaused,
    open,
    collapsible: Array.isArray(stacktrace),
    source,
    type,
    level,
    topLevelClasses: [],
    indent: message.indent,
    inWarningGroup,
    messageBody,
    repeat,
    frame,
    stacktrace,
    serviceContainer,
    exceptionDocURL,
    timeStamp,
    notes,
    timestampsVisible,
    maybeScrollToBottom,
    message,
    pausedExecutionPoint,
  });
}

module.exports = PageError;
