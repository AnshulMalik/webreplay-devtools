/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// @flow

import type { SourceLocation, Position, PartialPosition } from "../types";
import type { Symbols } from "../reducers/ast";

import type {
  AstLocation,
  FunctionDeclaration,
  ClassDeclaration,
} from "../workers/parser";

export function findBestMatchExpression(symbols: Symbols, tokenPos: Position) {
  if (symbols.loading) {
    return null;
  }

  const { line, column } = tokenPos;
  const { memberExpressions, identifiers, literals } = symbols;
  const members = memberExpressions.filter(({ computed }) => !computed);

  return []
    .concat(identifiers, members, literals)
    .reduce((found, expression) => {
      const overlaps =
        expression.location.start.line == line &&
        expression.location.start.column <= column &&
        expression.location.end.column >= column;

      if (overlaps) {
        return expression;
      }

      return found;
    }, null);
}

// Check whether location A starts after location B
export function positionAfter(a: AstLocation, b: AstLocation) {
  return (
    a.start.line > b.start.line ||
    (a.start.line === b.start.line && a.start.column > b.start.column)
  );
}

export function containsPosition(a: AstLocation, b: PartialPosition) {
  const bColumn = b.column || 0;
  const startsBefore =
    a.start.line < b.line ||
    (a.start.line === b.line && a.start.column <= bColumn);
  const endsAfter =
    a.end.line > b.line || (a.end.line === b.line && a.end.column >= bColumn);

  return startsBefore && endsAfter;
}

function findClosestofSymbol(declarations: any[], location: SourceLocation) {
  if (!declarations) {
    return null;
  }

  return declarations.reduce((found, currNode) => {
    if (
      currNode.name === "anonymous" ||
      !containsPosition(currNode.location, {
        line: location.line,
        column: location.column || 0,
      })
    ) {
      return found;
    }

    if (!found) {
      return currNode;
    }

    if (found.location.start.line > currNode.location.start.line) {
      return found;
    }
    if (
      found.location.start.line === currNode.location.start.line &&
      found.location.start.column > currNode.location.start.column
    ) {
      return found;
    }

    return currNode;
  }, null);
}

export function findClosestFunction(
  symbols: ?Symbols,
  location: SourceLocation
): FunctionDeclaration | null {
  if (!symbols || symbols.loading) {
    return null;
  }

  return findClosestofSymbol(symbols.functions, location);
}

export function findClosestClass(
  symbols: Symbols,
  location: SourceLocation
): ClassDeclaration | null {
  if (!symbols || symbols.loading) {
    return null;
  }

  return findClosestofSymbol(symbols.classes, location);
}
