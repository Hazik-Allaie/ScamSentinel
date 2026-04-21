import requests
import json

BASE_URL = "http://localhost:8080"

def run_post_test(name, endpoint, payload):
    print(f"--- Running {name} ---")
    url = f"{BASE_URL}{endpoint}"
    try:
        response = requests.post(url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

# Test 5A - Known mule
test_5a_mule = {
    "identifier": "1234567890",
    "identifier_type": "bank_account"
}
run_post_test("Test 5A - Known mule account", "/api/v1/intercept", test_5a_mule)

# Test 5A - Clean account
test_5a_clean = {
    "identifier": "9876543210",
    "identifier_type": "bank_account"
}
run_post_test("Test 5A - Clean account", "/api/v1/intercept", test_5a_clean)
