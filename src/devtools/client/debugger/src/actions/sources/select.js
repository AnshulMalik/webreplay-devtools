/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// @flow

/**
 * Redux actions for the sources state
 * @module actions/sources
 */

import { getSourceFromId, getSourceWithContent } from "../../reducers/sources";
import { tabExists } from "../../reducers/tabs";
import { setSymbols } from "./symbols";
import { setInScopeLines } from "../ast";
import { closeActiveSearch, updateActiveFileSearch } from "../ui";
import { togglePrettyPrint } from "./prettyPrint";
import { addTab, closeTab } from "../tabs";
import { loadSourceText } from "./loadSourceText";
import { setBreakableLines } from ".";

import { prefs } from "../../utils/prefs";
import { isMinified } from "../../utils/source";
import { createLocation } from "../../utils/location";

import {
  getSource,
  getSourceByURL,
  getPrettySource,
  getActiveSearch,
  getSelectedLocation,
  getSelectedSource,
  canPrettyPrintSource,
} from "../../selectors";

import type {
  SourceLocation,
  PartialPosition,
  Source,
  Context,
} from "../../types";
import type { ThunkArgs } from "../types";

export const setSelectedLocation = (
  cx: Context,
  source: Source,
  location: SourceLocation
) => ({
  type: "SET_SELECTED_LOCATION",
  cx,
  source,
  location,
});

export const setPendingSelectedLocation = (
  cx: Context,
  url: string,
  options?: PartialPosition
) => ({
  type: "SET_PENDING_SELECTED_LOCATION",
  cx,
  url,
  line: options ? options.line : null,
  column: options ? options.column : null,
});

export const clearSelectedLocation = (cx: Context) => ({
  type: "CLEAR_SELECTED_LOCATION",
  cx,
});

/**
 * Deterministically select a source that has a given URL. This will
 * work regardless of the connection status or if the source exists
 * yet.
 *
 * This exists mostly for external things to interact with the
 * debugger.
 *
 * @memberof actions/sources
 * @static
 */
export function selectSourceURL(
  cx: Context,
  url: string,
  options?: PartialPosition
) {
  return async ({ dispatch, getState }: ThunkArgs) => {
    const source = getSourceByURL(getState(), url);
    if (!source) {
      return dispatch(setPendingSelectedLocation(cx, url, options));
    }

    const sourceId = source.id;
    const location = createLocation({ ...options, sourceId });
    return dispatch(selectLocation(cx, location));
  };
}

/**
 * @memberof actions/sources
 * @static
 */
export function selectSource(
  cx: Context,
  sourceId: string,
  options: PartialPosition = {}
) {
  return async ({ dispatch }: ThunkArgs) => {
    const location = createLocation({ ...options, sourceId });
    return dispatch(selectSpecificLocation(cx, location));
  };
}

/**
 * @memberof actions/sources
 * @static
 */
export function selectLocation(
  cx: Context,
  location: SourceLocation,
  { keepContext = true }: Object = {}
) {
  return async ({ dispatch, getState, client }: ThunkArgs) => {
    const currentSource = getSelectedSource(getState());

    if (!client) {
      // No connection, do nothing. This happens when the debugger is
      // shut down too fast and it tries to display a default source.
      return;
    }

    let source = getSource(getState(), location.sourceId);
    if (!source) {
      // If there is no source we deselect the current selected source
      return dispatch(clearSelectedLocation(cx));
    }

    const activeSearch = getActiveSearch(getState());
    if (activeSearch && activeSearch !== "file") {
      dispatch(closeActiveSearch());
    }

    if (tabExists(getState(), source.id)) {
      dispatch(addTab(source));
    }

    dispatch(setSelectedLocation(cx, source, location));

    await dispatch(loadSourceText({ source }));
    await dispatch(setBreakableLines(cx, source.id));

    const loadedSource = getSource(getState(), source.id);

    if (!loadedSource) {
      // If there was a navigation while we were loading the loadedSource
      return;
    }

    const sourceWithContent = getSourceWithContent(getState(), source.id);

    if (
      prefs.autoPrettyPrint &&
      !getPrettySource(getState(), loadedSource.id) &&
      canPrettyPrintSource(getState(), loadedSource.id) &&
      isMinified(sourceWithContent)
    ) {
      await dispatch(togglePrettyPrint(cx, loadedSource.id));
      dispatch(closeTab(cx, loadedSource));
    }

    dispatch(setSymbols({ cx, source: loadedSource }));
    dispatch(setInScopeLines(cx));

    // If a new source is selected update the file search results
    const newSource = getSelectedSource(getState());
    if (currentSource && currentSource !== newSource) {
      dispatch(updateActiveFileSearch(cx));
    }
  };
}

/**
 * @memberof actions/sources
 * @static
 */
export function selectSpecificLocation(cx: Context, location: SourceLocation) {
  return selectLocation(cx, location, { keepContext: false });
}
