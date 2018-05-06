import * as join from 'url-join'
import * as deepmerge from 'deepmerge'
import { Chainr, createInstance } from 'chainr-proxy'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

export interface ChainrAxios extends Chainr {
  [key: string]: ChainrAxios
  <T>(data?: any, config?: AxiosRequestConfig): Promise<T>
}

export interface ChainrAxiosRule extends AxiosRequestConfig {
  match: RegExp,
  alterConfig? (config: AxiosRequestConfig): AxiosRequestConfig | void
}

export interface ChainrAxiosRequestConfig extends AxiosRequestConfig {
  rules?: ChainrAxiosRule[],
  instance?: AxiosInstance
}

function nonNullable (obj: any): any {
  if (obj == null) return {}
  return obj
}

export function createAxios (config: ChainrAxiosRequestConfig = {}): ChainrAxios {
  const { rules = [], instance = axios, ...baseConfig } = config
  const collectedRules = rules.map(rule => {
    const { match, alterConfig, ...config } = rule
    return { match, alterConfig, config }
  })

  return createInstance(function dispatch (keys, [data, extraConfig]) {
    let config: AxiosRequestConfig = deepmerge(baseConfig,{
      url: join(...keys.map(key => key.toString()))
    })

    for (const rule of collectedRules) {
      if (rule.match.test(config.url!)) {
        config = deepmerge(config, rule.config)
        if (rule.alterConfig) {
          config = rule.alterConfig(config) || config
        }
      }
    }

    config = deepmerge(config, nonNullable(extraConfig))

    const method = (config.method || '').trim().toLowerCase()
    if (method === 'post' || method === 'put' || method === 'patch') {
      if (data != null) config.data = deepmerge(nonNullable(config.data), data)
      else config.data = null
    } else {
      if (data != null) config.params = deepmerge(nonNullable(config.params), data)
      else config.params = null
    }

    return instance(config)
  })
}
