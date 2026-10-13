#!/bin/bash

# Get the list of IPs from Windows ipconfig.exe
ALL_IPS=$(/mnt/c/Windows/System32/ipconfig.exe 2>/dev/null | grep "IPv4 Address" | awk -F': ' '{print $2}' | tr -d '\r')

# 1. Look for 192.168 IPs but EXCLUDE those ending in .1 (usually virtual adapters or hotspots)
WIN_IP=$(echo "$ALL_IPS" | grep '^192\.168\.' | grep -v '\.1$' | head -n 1)

# 2. If no match found above, pick any 192.168 IP
if [ -z "$WIN_IP" ]; then
    WIN_IP=$(echo "$ALL_IPS" | grep '^192\.168\.' | head -n 1)
fi

# 3. Fallback: Any IP that is not 169.254 and does not end in .1
if [ -z "$WIN_IP" ]; then
    WIN_IP=$(echo "$ALL_IPS" | grep -v '^169\.254\.' | grep -v '\.1$' | head -n 1)
fi

# 4. Final Fallback: WSL Gateway IP
if [ -z "$WIN_IP" ]; then
    WIN_IP=$(ip route | grep default | awk '{print $3}')
fi

if [ -z "$WIN_IP" ]; then
    echo "❌ Could not find a suitable Windows IP."
    exit 1
fi

echo "🚀 Forcing Expo to use Windows IP: $WIN_IP"
echo "🔗 Ensure you have executed netsh portproxy on Windows for port 8055."

export REACT_NATIVE_PACKAGER_HOSTNAME=$WIN_IP
pnpm dev --port 8055 "$@"
