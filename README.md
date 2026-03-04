<div align="center">
<img height="180" alt="Poku's Logo" src="https://raw.githubusercontent.com/wellwelwel/poku/main/.github/assets/readme/poku.svg">

# @pokujs/shared-resources

Enjoying **Poku**? [Give him a star to show your support](https://github.com/wellwelwel/poku) 🌟

---

📘 [**Documentation**](https://poku.io/docs/documentation/helpers/shared-resources)

</div>

---

🪢 [**@pokujs/shared-resources**](https://github.com/pokujs/shared-resources) is a **Poku** plugin for shared resources across isolated tests.

> [!TIP]
>
> Share state, servers, database connections, and more between parallel test files — no duplicated setup, no conflicts.

---

## Quickstart

### Install

<table>
<tr>
<td width="225">

```bash
# Node.js
npm i -D @pokujs/shared-resources
```

</td>
<td width="225">

```bash
# Bun
bun add -d @pokujs/shared-resources
```

</td>
<td width="225">

```bash
# Deno (optional)
deno add npm:@pokujs/shared-resources
```

</td>
</tr>
</table>

### Enable the Plugin

```js
// poku.config.js
import { sharedResources } from '@pokujs/shared-resources';
import { defineConfig } from 'poku';

export default defineConfig({
  plugins: [sharedResources()],
});
```

### Define a Shared Resource

```js
// resources/counter.js
import { resource } from '@pokujs/shared-resources';

export const Counter = resource.create(() => ({
  count: 0,
  increment() {
    this.count++;
    return this.count;
  },
  getCount() {
    return this.count;
  },
}));
```

### Use in Your Tests

```js
// tests/my-test.test.js
import { resource } from '@pokujs/shared-resources';
import { assert, test } from 'poku';
import { Counter } from '../resources/counter.js';

test('Shared Counter', async () => {
  const counter = await resource.use(Counter);

  await counter.increment();
  assert.strictEqual(await counter.getCount(), 1);
});
```
