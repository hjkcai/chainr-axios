/* eslint-disable no-unused-expressions */
'use strict'

const chai = require('chai')
const axios = require('axios')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const { createAxios } = require('./chainr-axios')

chai.use(sinonChai)
const { expect } = chai

function prepare (config = {}) {
  return function beforeEach () {
    this.instance = sinon.spy()
    this.req = createAxios({ instance: this.instance, ...config })
  }
}

describe('chainr-axios', () => {
  describe('url', () => {
    beforeEach(prepare())

    describe('should be concatenated keys', () => {
      it('string', function () {
        this.req.get.something['important']()
        expect(this.instance).to.be.calledWith({ url: 'get/something/important' })
      })

      it('number', function () {
        this.req.user[0].book[1]()
        expect(this.instance).to.be.calledWith({ url: 'user/0/book/1' })
      })
    })
  })

  describe('rules', () => {
    describe('config', () => {
      beforeEach(prepare({
        method: 'get',
        headers: {
          'X-Custom': 'a'
        },
        rules: [
          {
            match: /^get/,
            headers: {
              'X-Custom': 'b'
            }
          },
          {
            match: /^update/,
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              'X-Custom': 'c'
            }
          },
          {
            match: /books$/i,
            headers: {
              'Accept': '*/*',
              'X-Custom': 'd'
            }
          }
        ]
      }))

      it('should merge global config', function () {
        this.req.updateUsers()
        expect(this.instance).to.be.calledWith({
          url: 'updateUsers',
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': 'c'
          }
        })
      })

      it('latter config should override former config', function () {
        this.req.getBooks()
        expect(this.instance).to.be.calledWith({
          url: 'getBooks',
          method: 'get',
          headers: {
            'Accept': '*/*',
            'X-Custom': 'd'
          }
        })
      })
    })

    describe('alterConfig', () => {
      it('should be called after merging its own config', () => {
        const spy = sinon.spy()
        const req = createAxios({
          instance: () => {},
          rules: [{ match: /^get/, method: 'get', alterConfig: spy }]
        })

        req.getUsers()
        expect(spy).to.be.calledWith({
          url: 'getUsers',
          method: 'get'
        })
      })

      it('should have config in its former rules', () => {
        const spy = sinon.spy()
        const req = createAxios({
          instance: () => {},
          rules: [
            { match: /^get/, method: 'get' },
            { match: /^get/, alterConfig: spy },
            { match: /^get/, method: 'post' }
          ]
        })

        req.getUsers()
        expect(spy).to.be.calledWith({
          url: 'getUsers',
          method: 'get'
        })
      })

      it('should be able to alter the config', () => {
        const spy = sinon.spy()
        const req = createAxios({
          instance: spy,
          rules: [{
            match: /^get/,
            alterConfig (config) {
              config.method = 'get'
            }
          }]
        })

        req.getUsers()
        expect(spy).to.be.calledWith({
          url: 'getUsers',
          method: 'get'
        })
      })

      it('should match different rules if url is changed', () => {
        const spy = sinon.spy()
        const req = createAxios({
          instance: spy,
          rules: [
            {
              match: /^get/,
              alterConfig (config) {
                config.url = 'updateUsers'
              }
            },
            { match: /^get/, method: 'get' },
            { match: /^update/, method: 'post' }
          ]
        })

        req.getUsers()
        expect(spy).to.be.calledWith({
          url: 'updateUsers',
          method: 'post'
        })
      })

      it('should replace the config by its return value (if has)', () => {
        const spy = sinon.spy()
        const req = createAxios({
          instance: spy,
          rules: [{ match: /^get/, alterConfig: () => ({ custom: true }) }]
        })

        req.getUsers()
        expect(spy).to.be.calledWith({
          custom: true
        })
      })

      it('should not contain the instance config in the parameter', async () => {
        const instance = axios.create({
          baseURL: 'http://httpbin.org'
        })

        const req = createAxios({
          instance,
          rules: [{
            match: /anything/,
            alterConfig (config) {
              expect(config.baseURL).to.be.undefined
            }
          }]
        })

        return req.anything()
      })
    })
  })

  describe('instance', () => {
    it('should work if no instance is passed', async () => {
      const req = createAxios({
        baseURL: 'http://httpbin.org'
      })

      const { data } = await req.anything({ test: '123' })
      expect(data.args.test).to.be.equal('123')
    })

    it('should merge request config with the instance config', async () => {
      const instance = axios.create({
        headers: { 'User-Agent': 'chainr-axios' }
      })

      const req = createAxios({
        instance,
        method: 'post',
        baseURL: 'http://httpbin.org',
        headers: {
          'X-Custom': 'a'
        }
      })

      const { data } = await req.anything({ test: true })
      expect(data.method).to.be.equal('POST')
      expect(data.headers['X-Custom']).to.be.equal('a')
      expect(data.headers['User-Agent']).to.be.equal('chainr-axios')
    })
  })

  describe('data', () => {
    beforeEach(prepare({
      rules: [
        {
          match: /./,
          alterConfig (config) {
            config.method = config.url
          }
        },
        {
          match: /^data$/,
          method: 'post',
          data: { test: { test: false } }
        },
        {
          match: /^params$/,
          method: 'get',
          params: { test: { test: false } }
        }
      ]
    }))

    it('should be sent via params if method is not POST,PUT,PATCH', function () {
      this.req.get({ test: true })
      expect(this.instance).to.be.calledWith({
        url: 'get',
        method: 'get',
        params: { test: true }
      })
    })

    describe('should be sent via body if method is', () => {
      it('POST', function () {
        this.req.post({ test: true })
        expect(this.instance).to.be.calledWith({
          url: 'post',
          method: 'post',
          data: { test: true }
        })
      })

      it('PUT', function () {
        this.req.put({ test: true })
        expect(this.instance).to.be.calledWith({
          url: 'put',
          method: 'put',
          data: { test: true }
        })
      })

      it('PATCH', function () {
        this.req.patch({ test: true })
        expect(this.instance).to.be.calledWith({
          url: 'patch',
          method: 'patch',
          data: { test: true }
        })
      })
    })

    describe('should merge with the existing data if data is an plain object', () => {
      it('data', function () {
        this.req.data({ test: { test: true, a: 1 } })
        expect(this.instance).to.be.calledWith({
          url: 'data',
          method: 'post',
          data: { test: { test: true, a: 1 } }
        })
      })

      it('params', function () {
        this.req.params({ test: { test: true, a: 1 } })
        expect(this.instance).to.be.calledWith({
          url: 'params',
          method: 'get',
          params: { test: { test: true, a: 1 } }
        })
      })
    })

    describe('should replace the existing data is data is not undefined and not mergable', () => {
      it('null', function () {
        this.req.data(null)
        expect(this.instance).to.be.calledWith({
          url: 'data',
          method: 'post',
          data: null
        })
      })

      it('Date', function () {
        const date = new Date()
        this.req.data(date)
        expect(this.instance).to.be.calledWith({
          url: 'data',
          method: 'post',
          data: date
        })
      })

      it('RegExp', function () {
        const regexp = /./ig
        this.req.data(regexp)
        expect(this.instance).to.be.calledWith({
          url: 'data',
          method: 'post',
          data: regexp
        })
      })
    })
  })

  describe('extraConfig', () => {
    it('should override the base config and all rules', () => {
      const spy = sinon.spy()
      const req = createAxios({
        instance: spy,
        headers: {
          'User-Agent': 'axios'
        },
        rules: [{
          match: /^get/,
          headers: {
            'Content-Type': 'application/xml'
          }
        }]
      })

      req.getUsers({ test: true }, {
        method: 'post',
        headers: {
          'User-Agent': 'chainr-axios',
          'Content-Type': 'application/json'
        }
      })

      expect(spy).to.be.calledWith({
        url: 'getUsers',
        method: 'post',
        data: { test: true },
        headers: {
          'User-Agent': 'chainr-axios',
          'Content-Type': 'application/json'
        }
      })
    })
  })
})
