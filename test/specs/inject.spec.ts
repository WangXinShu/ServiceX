import {
  Service,
  Transient,
  Injectable,
  Reducer,
  container,
  ActionMethodOfService,
  Effect,
  EffectAction,
  Inject,
  Scope,
} from '../../src'
import { Observable } from 'rxjs'
import { map, skip, take } from 'rxjs/operators'
import { LazyServiceIdentifer } from 'inversify'

interface State {
  count: number
}

@Injectable()
class OtherModel extends Service<State> {
  defaultState = {
    count: -1,
  }
  @Reducer()
  subtract(state: State, n: number): State {
    return { ...state, count: state.count - n }
  }
}

@Injectable()
class CountModel extends Service<State> {
  defaultState = { count: 0 }

  // type 1
  @Inject(OtherModel) @Scope(Transient) other!: OtherModel

  // type 2
  constructor(
    public other1: OtherModel,

    @Scope(Transient) public other2: OtherModel,

    @Inject(OtherModel) @Scope(Transient) public other3: OtherModel,

    @Inject(new LazyServiceIdentifer(() => OtherModel))
    @Scope(Transient)
    public other4: OtherModel,
  ) {
    super()
  }

  @Reducer()
  setCount(state: State, count: number): State {
    return { ...state, count }
  }

  @Reducer()
  syncCount(state: State): State {
    return { ...state, count: this.other.getState().count }
  }

  @Effect()
  proxySubtract(payload$: Observable<number>): Observable<EffectAction> {
    return payload$.pipe(map((n) => this.other2.actions().subtract(n)))
  }
}

describe('Inject specs:', () => {
  let countModel: CountModel
  let actions: ActionMethodOfService<CountModel, State>

  beforeEach(() => {
    countModel = container.resolveInScope(CountModel, Transient)
    actions = countModel.getActions()
  })

  it('getState', () => {
    expect(countModel.getState()).toEqual({ count: 0 })
    actions.setCount(10)
    expect(countModel.getState()).toEqual({ count: 10 })
  })

  it('should property inject work', () => {
    expect(countModel.other.getState()).toEqual({ count: -1 })
  })

  it('should constructor inject work', () => {
    ;['other1', 'other2', 'other3', 'other4'].forEach((key: any) => {
      expect((countModel as any)[key].getState()).toEqual({ count: -1 })
    })
  })

  it('should scope decorator default to Singleton', () => {
    countModel.other1.getActions().subtract(1)
    container.unbind(CountModel)
    countModel = container.resolveInScope(CountModel, Transient)
    expect(countModel.other1.getState()).toEqual({ count: -2 })
  })

  it('should effect take effect asyncly', () => {
    countModel.other2
      .getState$()
      .pipe(
        skip(1),
        take(1),
      )
      .subscribe((state) => expect(state).toEqual({ count: -2 }))
    actions.proxySubtract(1)
    expect(countModel.other2.getState()).toEqual({ count: -1 })
  })
})
