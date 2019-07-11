import { container, ScopeTypes, Scope } from '../Container'
import { useMemo } from 'react'
import { Service } from '../service'
import { ConstructorOf } from '../types'
import { UseServiceInstanceResult, useServiceInstance } from './useServiceInstance'

interface UseServiceOptions {
  scope?: Scope
}

export function useService<M extends Service<any>>(
  serviceConstructor: ConstructorOf<M>,
  options?: UseServiceOptions,
): M extends Service<infer SS> ? UseServiceInstanceResult<M, SS> : never

export function useService<M extends Service<any>, F>(
  serviceConstructor: ConstructorOf<M>,
  selector: (state: M extends Service<infer SS> ? Readonly<SS> : never) => F,
  options?: UseServiceOptions,
): M extends Service<infer SS> ? UseServiceInstanceResult<M, SS, typeof selector> : never

export function useService<M extends Service<any>>(
  serviceIdentifier: ConstructorOf<M>,
  ...args: any
) {
  const [selector, options] = useMemo(() => {
    let options = {
      scope: ScopeTypes.Singleton,
    }
    let selector: any
    if (args.length === 1) {
      if (typeof args[0] === 'function') {
        selector = args[0]
      } else {
        options = { ...options, ...args[0] }
      }
    } else if (args.length === 2) {
      selector = args[0]
      options = { ...options, ...args[1] }
    }
    return [selector, options]
  }, [args])

  const service = useMemo(() => {
    return container.resolve<M>(serviceIdentifier, options.scope!)
  }, [options.scope, serviceIdentifier])

  const serviceInstanceOptions = useMemo(
    () => ({
      destroyOnUnmount:
        options.scope === ScopeTypes.Transient || options.scope === ScopeTypes.Request,
    }),
    [options.scope],
  )

  return useServiceInstance(service, selector, serviceInstanceOptions)
}
