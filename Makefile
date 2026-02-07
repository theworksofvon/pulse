.PHONY: sdk-test sdk-test-unit sdk-test-e2e sdk-create-api-key

sdk-create-api-key:
	cd sdk && bun run create-api-key
