import requests
import json

BASE_URL = "http://localhost:8080"

def run_test(name, endpoint, payload):
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

# Test 1A
test_1a_payload = {
    "input_type": "sms_text",
    "raw_content": "URGENT: Your Maybank account has been suspended. Click http://maybank-secure-login.xyz/verify to reactivate within 24 hours or lose access permanently.",
    "extracted_entities": {
      "phone_numbers": [],
      "urls": ["http://maybank-secure-login.xyz/verify"],
      "account_numbers": [],
      "keywords": ["suspended", "urgent", "verify"]
    },
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
}
run_test("Test 1A - HIGH risk SMS scam", "/api/v1/scan", test_1a_payload)

# Test 1B
test_1b_payload = {
    "input_type": "sms_text",
    "raw_content": "Hi, your Grab food order #12345 has been picked up and is on the way. Estimated delivery: 20 minutes.",
    "extracted_entities": {
      "phone_numbers": [],
      "urls": [],
      "account_numbers": [],
      "keywords": []
    },
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
}
run_test("Test 1B - LOW risk legitimate message", "/api/v1/scan", test_1b_payload)

# Test 1C
test_1c_payload = {
    "input_type": "sms_text",
    "raw_content": "Guaranteed 40% monthly return. Join our exclusive investment group. WhatsApp +60123456789 now. Limited slots!",
    "extracted_entities": {
      "phone_numbers": ["+60123456789"],
      "urls": [],
      "account_numbers": [],
      "keywords": ["guaranteed", "return", "investment", "exclusive"]
    },
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
}
run_test("Test 1C - Investment scam SMS", "/api/v1/scan", test_1c_payload)

# Test 1D
test_1d_payload = {
    "input_type": "url",
    "raw_content": "http://maybank-customer-support-malaysia.blogspot.com/login",
    "extracted_entities": {
      "phone_numbers": [],
      "urls": ["http://maybank-customer-support-malaysia.blogspot.com/login"],
      "account_numbers": [],
      "keywords": []
    },
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
}
run_test("Test 1D - Impersonation scam URL", "/api/v1/scan", test_1d_payload)
