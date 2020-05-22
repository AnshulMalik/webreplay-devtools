/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Dependencies
const { span } = require("devtools/client/shared/vendor/react-dom-factories");

const { getGripType, wrapRender } = require("./rep-utils");

/**
 * Renders a NaN object
 */
function NaNRep(props) {
  return span({ className: "objectBox objectBox-nan" }, "NaN");
}

function supportsObject(object, noGrip = false) {
  return object.isPrimitive() && object.primitive() === NaN;
}

// Exports from this module
module.exports = {
  rep: wrapRender(NaNRep),
  supportsObject,
};
