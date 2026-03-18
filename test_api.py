import json
import urllib.request
import urllib.error

url = 'http://127.0.0.1:8000/api/v1/auth/register'
data = {
    "ho_ten": "Test User",
    "email": "test@example.com",
    "mat_khau": "SecurePassword123"
}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'))
req.add_header('Content-Type', 'application/json')

try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    err_body = e.read().decode('utf-8')
    try:
        detail = json.loads(err_body).get("detail")
        with open("err.txt", "w", encoding="utf-8") as f:
            f.write(detail)
        print("Wrote detail to err.txt")
    except:
        with open("err.txt", "w", encoding="utf-8") as f:
            f.write(err_body)
        print("Wrote raw body to err.txt")
except Exception as e:
    print("Error:", e)
