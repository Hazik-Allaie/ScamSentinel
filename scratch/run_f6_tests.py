import requests
import json

BASE_URL = "http://localhost:8080"

def run_feed_test():
    print("--- Running Test 6A - REST feed endpoint ---")
    url = f"{BASE_URL}/api/v1/feed"
    try:
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        feed = response.json()
        print(f"Feed length: {len(feed)}")
        if feed:
            print(f"First entry: {json.dumps(feed[0], indent=2)}")
        return feed
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    run_feed_test()
