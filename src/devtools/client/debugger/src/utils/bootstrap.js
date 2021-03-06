/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// @flow

import React from "react";
import { bindActionCreators, combineReducers } from "redux";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";

import ToolboxProvider from "devtools/client/framework/store-provider";
import { isDevelopment } from "devtools-environment";
import { AppConstants } from "devtools-modules";

import * as search from "../workers/search";
import * as prettyPrint from "../workers/pretty-print";
import { ParserDispatcher } from "../workers/parser";

import configureStore from "../actions/utils/create-store";
import reducers from "../reducers";
import * as selectors from "../selectors";
import App from "../components/App";
import { asyncStore, prefs } from "./prefs";
import { persistTabs } from "../utils/tabs";

import type { Panel } from "../client/firefox/types";

let parser;

function renderPanel(component, store, panel: Panel) {
  const root = document.createElement("div");
  root.className = "launchpad-root theme-body";
  root.style.setProperty("flex", "1");
  const mount = document.querySelector("#mount");
  if (!mount) {
    return;
  }
  mount.appendChild(root);

  ReactDOM.render(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        ToolboxProvider,
        { store: panel.getToolboxStore() },
        React.createElement(component)
      )
    ),
    root
  );
}

type Workers = {
  evaluationsParser: typeof ParserDispatcher,
};

export function bootstrapStore(
  client: any,
  workers: Workers,
  panel: Panel,
  initialState: Object
) {
  const createStore = configureStore({
    log: prefs.logging,
    timing: prefs.timing,
    makeThunkArgs: (args, state) => {
      return { ...args, client, ...workers, panel };
    },
  });

  const store = createStore(combineReducers(reducers), initialState);
  store.subscribe(() => updatePrefs(store.getState()));

  const actions = bindActionCreators(
    require("../actions").default,
    store.dispatch
  );

  return { store, actions, selectors };
}

export function bootstrapWorkers(panelWorkers: Workers) {
  const workerPath = "src/devtools/client/debugger/dist";

  prettyPrint.start(`${workerPath}/pretty-print-worker.js`);
  parser = new ParserDispatcher();

  parser.start(`${workerPath}/parser-worker.js`);
  search.start(`${workerPath}/search-worker.js`);
  return { ...panelWorkers, prettyPrint, parser, search };
}

export function teardownWorkers() {
  prettyPrint.stop();
  parser.stop();
  search.stop();
}

export function bootstrapApp(store: any) {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}

let currentPendingBreakpoints;
let currentXHRBreakpoints;
let currentEventBreakpoints;
let currentTabs;

function updatePrefs(state: any) {
  const previousPendingBreakpoints = currentPendingBreakpoints;
  const previousXHRBreakpoints = currentXHRBreakpoints;
  const previousEventBreakpoints = currentEventBreakpoints;
  const previousTabs = currentTabs;
  currentPendingBreakpoints = selectors.getPendingBreakpoints(state);
  currentXHRBreakpoints = selectors.getXHRBreakpoints(state);
  currentEventBreakpoints = state.eventListenerBreakpoints;
  currentTabs = selectors.getTabs(state);

  if (
    previousPendingBreakpoints &&
    currentPendingBreakpoints !== previousPendingBreakpoints
  ) {
    asyncStore.pendingBreakpoints = currentPendingBreakpoints;
  }

  if (
    previousEventBreakpoints &&
    previousEventBreakpoints !== currentEventBreakpoints
  ) {
    asyncStore.eventListenerBreakpoints = currentEventBreakpoints;
  }

  if (previousTabs && previousTabs !== currentTabs) {
    asyncStore.tabs = persistTabs(currentTabs);
  }

  if (currentXHRBreakpoints !== previousXHRBreakpoints) {
    asyncStore.xhrBreakpoints = currentXHRBreakpoints;
  }
}
