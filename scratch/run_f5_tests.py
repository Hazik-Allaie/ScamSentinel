import requests
import json

BASE_URL = "http://localhost:8080"

def run_get_test(name, endpoint, params):
    print(f"--- Running {name} ---")
    url = f"{BASE_URL}{endpoint}"
    try:
        response = requests.get(url, params=params)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

# Test 5A - Known mule
run_get_test("Test 5A - Known mule account", "/api/v1/check-account", {"account_number": "1234567890", "bank": "test_bank"})

# Test 5A - Clean account
run_get_test("Test 5A - Clean account", "/api/v1/check-account", {"account_number": "9876543210", "bank": "test_bank"})
