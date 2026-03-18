import { assert, describe, it, poku } from "poku";
import { inspectPoku } from "poku/plugins";
import { sharedResources } from "../../src/index.js";

describe("Shared Resources", async () => {
	await it("Parallel tests", async () => {
		const code = await poku("test/__fixtures__/parallel", {
			noExit: true,
			plugins: [sharedResources()],
			concurrency: 0,
		});

		assert.strictEqual(code, 0, "Exit Code needs to be 0");
	});

	await it("Error tests", async () => {
		const { exitCode } = await inspectPoku({
			command:
				'--config="test/__fixtures__/error/poku.config.ts" test/__fixtures__/error',
		});

		assert.strictEqual(exitCode, 1, "Exit Code needs to be 1");
	});

	await it("Reference tests", async () => {
		const code = await poku("test/__fixtures__/references", {
			noExit: true,
			plugins: [sharedResources()],
			concurrency: 0,
		});

		assert.strictEqual(code, 0, "Exit Code needs to be 0");
	});
});
