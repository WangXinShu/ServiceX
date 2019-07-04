```ts
import React from 'react'
import ReactDOM from 'react-dom'
import './index.less'
import {
  useService,
  Injectable,
  Service,
  Reducer,
  ImmerReducer,
  Effect,
  EffectAction,
  DefineAction,
} from '../src'
import { Observable, of } from 'rxjs'
import { withLatestFrom, map, catchError, repeatWhen } from 'rxjs/operators'

interface State {
  count: number
}

// service.ts
@Injectable()
class CountService extends Service<State> {
  defaultState = {
    count: 0,
  }

  @DefineAction()
  retry$!: Observable<void>

  @Reducer()
  setCount(state: State, count: number) {
    return { ...state, count: count }
  }

  @ImmerReducer()
  add(state: State, count: number): void {
    state.count += count
  }

  @Reducer()
  reset(): State {
    return this.defaultState
  }
  @Effect()
  subtract(count$: Observable<number>, state$: Observable<State>): Observable<EffectAction> {
    return count$.pipe(
      withLatestFrom(state$),
      map(([count, state]) => {
        return this.getActions().setCount(state.count - count)
      }),
      catchError((err) => {
        console.error(err)
        return of(this.getActions().reset())
      }),
      repeatWhen(() => this.retry$),
    )
  }
}

const Count: React.FC<{}> = () => {
  const [state, actions] = useService(CountService)
  return (
    <div className="container">
      <span className="count">{state.count}</span>
      <button onClick={() => actions.add(1)}>Add one</button>
      <button onClick={() => actions.subtract(1)}>Subtract one</button>
      <button onClick={() => actions.reset()}>Reset</button>
    </div>
  )
}

ReactDOM.render(<Count />, document.getElementById('app'))
```