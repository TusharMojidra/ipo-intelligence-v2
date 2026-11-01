import os
import sys
import socket
import webbrowser
import time
import threading
import uvicorn

def get_local_ip():
    """Retrieve local machine's IPv4 address on the Wi-Fi/LAN."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # Does not actually connect, just routes to determine local interface IP
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def main():
    local_ip = get_local_ip()
    port = 8000

    print("=" * 70)
    print("IPO INTELLIGENCE TERMINAL (V2.0) — NETWORK & MOBILE ACCESS ENABLED")
    print("=" * 70)
    print(f"  • Local PC:   http://localhost:{port}")
    print(f"  • Mobile/LAN: http://{local_ip}:{port}")
    print("=" * 70)
    print("Make sure your mobile phone is connected to the SAME Wi-Fi network!")
    print("=" * 70)

    def open_browser():
        time.sleep(2.0)
        url = f"http://localhost:{port}"
        print(f"\nOpening browser at {url} ...")
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"Could not open browser automatically: {e}")

    threading.Thread(target=open_browser, daemon=True).start()

    # Bind to 0.0.0.0 to enable mobile access across local network
    uvicorn.run("api:app", host="0.0.0.0", port=port, log_level="info")

if __name__ == '__main__':
    main()
