/*
 * Copyright 2017 Google Inc.
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import * as Actions from './action-types';
import * as ActionCreators from './action-creators';

/**
 * createGameReducer
 *
 * Creates the main game state reducer.
 * @param {...object} game - Return value of Game().
 * @param {...object} numPlayers - The number of players.
 */
export function createGameReducer({game, numPlayers}) {
  if (!game) {
    game = {
      setup: () => ({}),
      names: [],
      reducer: G => G,
      victory: () => null
    };
  }

  if (!numPlayers) {
    numPlayers = 2;
  }

  const initial = {
    // User managed state.
    G: game.setup(numPlayers),

    // Framework managed state.
    ctx: {
      turn: 0,
      currentPlayer: '0',
      numPlayers: numPlayers,
      winner: null,
    },

    // A list of actions performed so far. Used by the
    // GameLog to display a journal of moves.
    log: [],

    // A monotonically non-decreasing ID to ensure that
    // state updates are only allowed from clients that
    // are at the same version that the server.
    _id: 0,

    // A snapshot of this object so that actions can be
    // replayed over it to view old snapshots.
    _initial: {}
  };

  const deepCopy = obj => JSON.parse(JSON.stringify(obj));
  initial._initial = deepCopy(initial);

  /**
   * GameFlow
   *
   * Redux reducer that maintains ctx.
   * The default responds to a single action END_TURN
   * that increments the currentPlayer and checks if
   * there is a winner.
   * @param {object} ctx - ctx before this action.
   * @param {object} action - A Redux action.
   * @param {object} G - G before this action.
   */
  const GameFlow = (ctx = {}, action, G) => {
    switch (action.type) {
      case Actions.END_TURN: {
        // Update winner.
        const winner = game.victory(G, ctx);
        // Update current player.
        const currentPlayer =
            (+ctx.currentPlayer + 1) % ctx.numPlayers + "";
        // Update turn.
        const turn = ctx.turn + 1;
        // Return new ctx.
        return {...ctx, currentPlayer, turn, winner};
      }

      default:
        return ctx;
    }
  };

  if (!game.flow) {
    game.flow = GameFlow;
  }

  /**
   * GameReducer
   *
   * Redux reducer that maintains the overall game state.
   * @param {object} state - The state before the action.
   * @param {object} action - A Redux action.
   */
  return (state = initial, action) => {
    switch (action.type) {
      case Actions.MAKE_MOVE: {
        const G = game.reducer(state.G, action.move, state.ctx);
        const log = [...state.log, action];
        return {...state, G, _id: state._id + 1, log};
      }

      case Actions.END_TURN: {
        const ctx = game.flow(state.ctx, action, state.G);
        const log = [...state.log, action];
        return {...state, ctx, _id: state._id + 1, log};
      }

      case Actions.RESTORE: {
        return action.state;
      }

      default:
        return state;
    }
  };
}

/**
 * createDispatchers
 *
 * Creates a set of dispatchers to make moves.
 * @param {Array} moveNames - A list of move names.
 * @param {object} store - The Redux store to create dispatchers for.
 */
export function createDispatchers(moveNames, store) {
  let dispatchers = {};
  for (const name of moveNames) {
    dispatchers[name] = function(...args) {
      store.dispatch(ActionCreators.makeMove({
        type: name,
        args: args
      }));
    };
  }
  return dispatchers;
}
