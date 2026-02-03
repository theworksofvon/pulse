.PHONY: sdk-test sdk-test-unit sdk-test-e2e sdk-create-api-key

sdk-create-api-key:
	$(MAKE) -C sdk create-api-key
