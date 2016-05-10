import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import createLogger from 'redux-logger';
import * as reducers from './reducers';

export const configureStore = (initialState) => {
  const middleware = [];
  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    middleware.push(createLogger({
      logger: console
    }));
  }

  let hasDevToolsExtension = typeof window !== "undefined" && !!window.devToolsExtension;

  let store = createStore(
    combineReducers(reducers),
    initialState,
    compose(
      applyMiddleware.apply(null, middleware),
      hasDevToolsExtension ? window.DevtoolsExtension() : f => f
    )
  );
  return store;
};
    
