# chainr-axios

Combination of [axios](https://github.com/axios/axios) and [chainr](https://github.com/hjkcai/chainr)
to make http requests.

```javascript
import { createAxios } from 'chainr-proxy-axios'

const instance = createAxios({
  baseURL: 'http://example.com/api',
  rules: [
    { match: /^(insert|update)/, method: 'post' }
  ]
})

// GET http://example.com/api/getUsers
instance.getUsers()

// POST http://example.com/api/updateUser
// with data { id: 0, name: 'hjkcai' }
instance.updateUser({ id: 0, name: 'hjkcai' })

// POST http://example.com/api/insertUser
// Authorization: xxx
instance.insertUser({ name: 'shirley' }, {
  headers: { Authorization: 'xxx' }
})
```

## API

coming soon...
