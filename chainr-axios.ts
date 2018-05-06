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

export function createAxios ({ rules = [], instance = axios, ...baseConfig }: ChainrAxiosRequestConfig = {}): ChainrAxios {
  const collectedRules = rules.map(rule => {
    const { match, alterConfig, ...config } = rule
    return { match, alterConfig, config }
  })

  return createInstance(function dispatch (keys, [data, extraConfig]) {
    let config: AxiosRequestConfig = deepmerge(
      baseConfig,
      { url: keys.join('/') },
      extraConfig
    )

    for (const rule of collectedRules) {
      if (rule.match.test(config.url!)) {
        config = deepmerge(config, rule.config)
        if (rule.alterConfig) {
          config = rule.alterConfig(config) || config
        }
      }
    }

    const method = (config.method || '').toLowerCase()
    if (method === 'post' || method === 'put' || method === 'patch') {
      if (config.data === undefined) {
        config.data = data
      }
    } else if (config.params === undefined) {
      config.params = data
    }

    return instance(config)
  })
}
