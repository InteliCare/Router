# Router
Azure function router

Use with azure node based functions to keep similar functionality together in a single function

eg:
```
import Router from "@intelicare/router"

const router = new Router()

export default async function run(context: Context) {
  return await router.route(context);
}

router.add<{ userId: string }, UserDetails>("GET", '/user/(userId)/details', async (context, params) => {
  const userDetails = getUserDetails(params.userId);
  return {
    status: 200,
    body: userDetails
  }
})

router.add<,undefined>("GET", '/ping', async (context) => {})
```

and add the route param to your function.json:
```
{
  ...,
  bindings: [
    {
      "type": "httpTrigger",
      "direction": "in",
      "methods": ["GET","POST","DELETE"]
      "route": "base/{*path}",
    }
  ]
  ...
}
```

For this example, your urls will start with base:
``` 
https://myserver.onmicrosoft.com/api/base/user/someuserid/details 
```
