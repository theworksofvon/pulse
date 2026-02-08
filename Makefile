.PHONY: sdk-test sdk-test-unit sdk-test-e2e sdk-create-api-key

sdk-create-api-key:
	cd sdk && ADMIN_KEY=dev-admin-key bun run create-api-key
