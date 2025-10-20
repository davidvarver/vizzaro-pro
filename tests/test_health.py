import requests, os

def test_healthcheck():
    url = os.getenv("APP_BASE_URL", "http://localhost:3000/health")
    r = requests.get(url, timeout=5)
    assert r.status_code == 200
