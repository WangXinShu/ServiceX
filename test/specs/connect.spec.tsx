import * as React from 'react'
import { act, create, ReactTestRenderer } from 'react-test-renderer'
import { Observable } from 'rxjs'
import { map, withLatestFrom } from 'rxjs/operators'

import {
  Effect,
  EffectAction,
  Reducer,
  Injectable,
  Service,
  ActionMethodOfService,
  createConnect,
  Transient,
} from '../../src'

interface State {
  count: number
  extra: number
}

enum CountAction {
  ADD = 'add',
  MINUS = 'minus',
}

const wait = (fn: (...args: any[]) => any) => Promise.resolve().then(() => fn())

@Injectable()
class Count extends Service<State> {
  defaultState = {
    count: 0,
    extra: 1,
  }

  @Reducer()
  add(state: State, count: number): State {
    return { ...state, count: state.count + count }
  }

  @Reducer()
  setCount(state: State, count: number): State {
    return { ...state, count }
  }

  @Effect()
  minus(count$: Observable<number>, state$: Observable<State>): Observable<EffectAction> {
    return count$.pipe(
      withLatestFrom(state$),
      map(([subCount, state]) => this.actions().setCount(state.count - subCount)),
    )
  }
}

type CountComponentProps = State & ActionMethodOfService<Count, State>

class CountComponent extends React.Component<CountComponentProps> {
  render() {
    return (
      <div>
        <p>
          current count is <span>{this.props.count}</span>
        </p>
        <button id={CountAction.ADD} onClick={this.add(1)}>
          add one
        </button>
        <button id={CountAction.MINUS} onClick={this.minus(1)}>
          minus one
        </button>
      </div>
    )
  }

  private add = (count: number) => () => this.props.add(count)

  private minus = (count: number) => () => this.props.minus(count)
}

const ConnectedCountComponent = createConnect(Count, { scope: Transient })(
  CountComponent,
  (state) => ({
    count: state.count,
    extra: state.extra,
  }),
)

describe('Connect spec:', () => {
  let testRenderer!: ReactTestRenderer
  const count = () => testRenderer.root.findByType('span').children[0]
  const click = async (action: CountAction) => {
    await act(async () => testRenderer.root.findByProps({ id: action }).props.onClick())
  }

  beforeEach(async () => {
    await act(async () => {
      testRenderer = create(<ConnectedCountComponent />)
    })
    // https://github.com/facebook/react/issues/14050 to trigger useEffect manually
    await act(async () => {
      testRenderer.update(<ConnectedCountComponent />)
    })
  })

  it('default state work properly', () => {
    expect(count()).toBe('0')
  })

  it('Reducer action work properly', () => {
    click(CountAction.ADD)
    expect(count()).toBe('1')
  })

  it('Effect action work properly', async () => {
    click(CountAction.MINUS)
    await wait(() => expect(count()).toBe('-1'))
  })
})
